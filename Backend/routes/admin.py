import secrets
import string
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy import desc, func
from sqlalchemy.orm import joinedload

from database import db
from models import User, Meal, Review, LatePlate, MealAttendance, Recommendation, Chapter
from helpers import admin_required, owner_required, jwt_required
from analytics import apply_ewma, apply_zscores

admin_bp = Blueprint('admin', __name__)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@admin_bp.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    try:
        users = User.query.filter_by(chapter_id=g.current_user.chapter_id).order_by(User.name).all()
        return jsonify({'users': [{
            'id': u.id, 'name': u.name, 'email': u.email,
            'is_admin': u.is_admin, 'is_owner': u.is_owner,
            'created_at': u.created_at.isoformat(),
        } for u in users]}), 200
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({'error': 'Failed to fetch users.'}), 500


@admin_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@owner_required
def delete_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user or user.chapter_id != g.current_user.chapter_id:
            return jsonify({'error': 'User not found.'}), 404
        if user.is_owner:
            return jsonify({'error': 'Cannot delete an owner.'}), 403
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user {user_id}: {e}")
        return jsonify({'error': 'Failed to delete user.'}), 500


@admin_bp.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
@owner_required
def update_user_role(user_id):
    try:
        user = User.query.get(user_id)
        if not user or user.chapter_id != g.current_user.chapter_id:
            return jsonify({'error': 'User not found.'}), 404

        data = request.get_json(silent=True)
        is_admin = data.get('is_admin')
        if is_admin is None:
            return jsonify({'error': 'is_admin status is required.'}), 400
        if user.is_owner and is_admin is False:
            return jsonify({'error': 'Cannot demote an owner from admin status.'}), 403

        user.is_admin = is_admin
        db.session.commit()
        return jsonify({'message': 'User role updated successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user role for user {user_id}: {e}")
        return jsonify({'error': 'Failed to update user role.'}), 500


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

@admin_bp.route('/api/recommendations', methods=['POST'])
@jwt_required
def submit_recommendation():
    try:
        data = request.get_json(silent=True)
        meal_name = data.get('meal_name')
        if not meal_name:
            return jsonify({'error': 'Meal name is required.'}), 400

        rec = Recommendation(
            user_id=g.current_user.id,
            meal_name=meal_name,
            description=data.get('description'),
            link=data.get('link'),
        )
        db.session.add(rec)
        db.session.commit()
        return jsonify({'message': 'Recommendation submitted successfully.', 'recommendation_id': rec.id}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting recommendation: {e}")
        return jsonify({'error': 'Failed to submit recommendation.'}), 500


@admin_bp.route('/api/admin/recommendations', methods=['GET'])
@admin_required
def get_all_recommendations():
    try:
        recs = db.session.query(Recommendation).options(
            joinedload(Recommendation.user)
        ).join(User, Recommendation.user_id == User.id).filter(
            User.chapter_id == g.current_user.chapter_id
        ).order_by(Recommendation.created_at.desc()).all()

        return jsonify({'recommendations': [{
            'id': r.id, 'meal_name': r.meal_name, 'description': r.description,
            'link': r.link, 'created_at': r.created_at.isoformat(),
            'user': {'id': r.user.id, 'name': r.user.name},
        } for r in recs]}), 200
    except Exception as e:
        print(f"Error fetching recommendations: {e}")
        return jsonify({'error': 'Failed to fetch recommendations.'}), 500


@admin_bp.route('/api/admin/recommendations/<int:recommendation_id>', methods=['DELETE'])
@admin_required
def delete_recommendation(recommendation_id):
    try:
        rec = Recommendation.query.get(recommendation_id)
        if not rec:
            return jsonify({'error': 'Recommendation not found.'}), 404
        db.session.delete(rec)
        db.session.commit()
        return jsonify({'message': 'Recommendation deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting recommendation {recommendation_id}: {e}")
        return jsonify({'error': 'Failed to delete recommendation.'}), 500


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@admin_bp.route('/api/admin/analytics', methods=['GET'])
@admin_required
def get_analytics():
    try:
        chapter_id = g.current_user.chapter_id

        total_users = User.query.filter_by(chapter_id=chapter_id).count()
        total_meals = Meal.query.filter_by(chapter_id=chapter_id).count()
        total_reviews = db.session.query(func.count(Review.id)).join(
            Meal, Review.meal_id == Meal.id).filter(Meal.chapter_id == chapter_id).scalar() or 0
        total_late_plates = db.session.query(func.count(LatePlate.id)).join(
            Meal, LatePlate.meal_id == Meal.id).filter(Meal.chapter_id == chapter_id).scalar() or 0
        overall_avg_rating = db.session.query(func.avg(Review.rating)).join(
            Meal, Review.meal_id == Meal.id).filter(Meal.chapter_id == chapter_id).scalar()

        att_sq = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('att_count'),
        ).group_by(MealAttendance.meal_id).subquery()

        top_attendance = db.session.query(Meal, att_sq.c.att_count).outerjoin(
            att_sq, Meal.id == att_sq.c.meal_id
        ).filter(att_sq.c.att_count.isnot(None), Meal.chapter_id == chapter_id
                 ).order_by(desc(att_sq.c.att_count)).limit(10).all()

        popular_meals = [{
            'id': m.id, 'dish_name': m.dish_name, 'meal_type': m.meal_type,
            'meal_date': m.meal_date.isoformat(), 'attendance_count': cnt,
            'attendance_pct': round(cnt / total_users * 100, 1) if total_users > 0 else 0,
        } for m, cnt in top_attendance]

        rating_sq = db.session.query(
            Review.meal_id,
            func.avg(Review.rating).label('avg_rating'),
            func.count(Review.id).label('review_count'),
        ).group_by(Review.meal_id).subquery()

        rated_meals = db.session.query(Meal, rating_sq.c.avg_rating, rating_sq.c.review_count).join(
            rating_sq, Meal.id == rating_sq.c.meal_id
        ).filter(rating_sq.c.review_count >= 1, Meal.chapter_id == chapter_id
                 ).order_by(desc(rating_sq.c.avg_rating)).all()

        # Build the full rated list, then cross-sectionally z-score every meal's
        # avg_rating against the chapter baseline before slicing highest/lowest.
        # rated_meals is already ordered DESC by avg_rating from the SQL query.
        all_rated = [
            {'id': m.id, 'dish_name': m.dish_name, 'meal_date': m.meal_date.isoformat(),
             'avg_rating': round(float(avg), 2), 'review_count': cnt}
            for m, avg, cnt in rated_meals
        ]
        apply_zscores(all_rated)
        highest_rated = all_rated[:5]
        lowest_rated  = all_rated[-5:] if len(all_rated) >= 5 else []

        eight_weeks_ago = datetime.now() - timedelta(weeks=8)
        weekly = db.session.query(
            func.date_trunc('week', Meal.meal_date).label('week_start'),
            func.count(MealAttendance.id).label('total_att'),
            func.count(func.distinct(Meal.id)).label('meal_count'),
        ).outerjoin(MealAttendance, Meal.id == MealAttendance.meal_id).filter(
            Meal.meal_date >= eight_weeks_ago, Meal.chapter_id == chapter_id
        ).group_by(func.date_trunc('week', Meal.meal_date)
                   ).order_by(func.date_trunc('week', Meal.meal_date)).all()

        attendance_trend = [{
            'week_start': str(w)[:10] if w else None,
            'total_attendance': att,
            'meal_count': mc,
            'avg_per_meal': round(att / mc, 1) if mc > 0 else 0,
        } for w, att, mc in weekly]

        # Apply EWMA (λ=0.94, RiskMetrics standard) to smooth week-over-week
        # noise in the attendance rate. A single low week (travel, exams) won't
        # distort the trend the way it would in a simple moving average.
        ewma_vals = apply_ewma([w['avg_per_meal'] for w in attendance_trend])
        for week_data, ewma_val in zip(attendance_trend, ewma_vals):
            week_data['ewma_avg_per_meal'] = ewma_val

        return jsonify({
            'summary': {
                'total_users': total_users, 'total_meals': total_meals,
                'total_reviews': total_reviews, 'total_late_plates': total_late_plates,
                'overall_avg_rating': round(float(overall_avg_rating), 2) if overall_avg_rating else None,
            },
            'popular_meals': popular_meals,
            'highest_rated': highest_rated,
            'lowest_rated': lowest_rated,
            'attendance_trend': attendance_trend,
        }), 200
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        return jsonify({'error': 'Failed to fetch analytics.'}), 500


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@admin_bp.route('/api/admin/settings', methods=['GET'])
@owner_required
def get_settings():
    try:
        chapter = Chapter.query.get(g.current_user.chapter_id)
        if not chapter:
            return jsonify({'access_code': None, 'chapter_name': None}), 200
        return jsonify({'access_code': chapter.access_code, 'chapter_name': chapter.name}), 200
    except Exception as e:
        print(f"Error fetching settings: {e}")
        return jsonify({'error': 'Failed to fetch settings.'}), 500


@admin_bp.route('/api/admin/settings/access-code', methods=['PUT'])
@owner_required
def update_access_code():
    try:
        chapter = Chapter.query.get(g.current_user.chapter_id) if g.current_user.chapter_id else None
        if not chapter:
            chapter = Chapter.query.first()
        if not chapter:
            chapter = Chapter(name='Default')
            db.session.add(chapter)
            db.session.flush()
            g.current_user.chapter_id = chapter.id

        data = request.get_json(silent=True)
        new_code = (data.get('code', '') if data else '').strip()
        if not new_code:
            alphabet = string.ascii_uppercase + string.digits
            new_code = ''.join(secrets.choice(alphabet) for _ in range(6))

        chapter.access_code = new_code
        db.session.commit()
        return jsonify({'message': 'Access code updated.', 'access_code': new_code}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating access code: {e}")
        return jsonify({'error': 'Failed to update access code.'}), 500
