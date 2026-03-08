from flask import Blueprint, request, jsonify, g
from sqlalchemy.orm import joinedload

from database import db
from models import Meal, Review, MealAttendance
from helpers import jwt_required, admin_required, owner_required

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/api/meals/<int:meal_id>/reviews', methods=['POST'])
@jwt_required
def submit_review(meal_id):
    data = request.get_json(silent=True)
    user_id = g.current_user.id
    try:
        rating = float(data.get('rating'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Rating is required.'}), 400

    if not (1.0 <= rating <= 5.0 and (rating * 2) % 1 == 0):
        return jsonify({'error': 'Rating must be between 1.0 and 5.0 in half star increments.'}), 400

    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        if Review.query.filter_by(user_id=user_id, meal_id=meal_id).first():
            return jsonify({'error': 'You have already reviewed this meal.'}), 400

        new_review = Review(meal_id=meal_id, user_id=user_id, rating=rating, comment=data.get('comment'))
        db.session.add(new_review)

        if not MealAttendance.query.filter_by(user_id=user_id, meal_id=meal_id).first():
            db.session.add(MealAttendance(meal_id=meal_id, user_id=user_id))

        db.session.commit()
        return jsonify({'message': 'Meal review created successfully', 'review_id': new_review.id}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting review: {e}")
        return jsonify({'error': 'Failed to submit review.'}), 500


@reviews_bp.route('/api/meals/<int:meal_id>/reviews/<int:review_id>', methods=['PUT'])
@jwt_required
def edit_review(meal_id, review_id):
    try:
        data = request.get_json(silent=True)
        user_id = g.current_user.id

        review = Review.query.filter_by(id=review_id, meal_id=meal_id).first()
        if not review:
            return jsonify({'error': 'Review not found.'}), 404
        if review.user_id != user_id:
            return jsonify({'error': 'You can only edit your own reviews.'}), 403

        if 'rating' in data and data['rating'] is not None:
            rating = float(data['rating'])
            if not (1.0 <= rating <= 5.0 and (rating * 2) % 1 == 0):
                return jsonify({'error': 'Rating must be between 1.0 and 5.0 in half star increments.'}), 400
            review.rating = rating
        if 'comment' in data:
            review.comment = data['comment']

        db.session.commit()
        return jsonify({'message': 'Review updated successfully.',
                        'review': {'id': review.id, 'rating': review.rating, 'comment': review.comment}}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error editing review {review_id}: {e}")
        return jsonify({'error': 'Failed to update review.'}), 500


@reviews_bp.route('/api/meals/<int:meal_id>/reviews/<int:review_id>', methods=['DELETE'])
@jwt_required
def delete_review(meal_id, review_id):
    try:
        user_id = g.current_user.id
        review = Review.query.filter_by(id=review_id, meal_id=meal_id).first()
        if not review:
            return jsonify({'error': 'Review not found.'}), 404
        if review.user_id != user_id and not (g.current_user.is_admin or g.current_user.is_owner):
            return jsonify({'error': 'You can only delete your own reviews.'}), 403
        db.session.delete(review)
        db.session.commit()
        return jsonify({'message': 'Review deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting review {review_id}: {e}")
        return jsonify({'error': 'Failed to delete review.'}), 500


@reviews_bp.route('/api/meals/<int:meal_id>/reviews', methods=['GET'])
@jwt_required
def get_meal_reviews(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        reviews = Review.query.filter_by(meal_id=meal_id).order_by(Review.created_at.desc()).all()
        return jsonify({'reviews': [{
            'id': r.id, 'rating': r.rating, 'comment': r.comment,
            'created_at': r.created_at.isoformat(),
        } for r in reviews]}), 200
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return jsonify({'error': 'Failed to fetch reviews.'}), 500


@reviews_bp.route('/api/admin/reviews', methods=['GET'])
@owner_required
def get_all_reviews():
    try:
        reviews = db.session.query(Review).options(
            joinedload(Review.meal), joinedload(Review.user)
        ).join(Meal, Review.meal_id == Meal.id).filter(
            Meal.chapter_id == g.current_user.chapter_id
        ).order_by(Review.created_at.desc()).all()

        return jsonify({'reviews': [{
            'id': r.id, 'rating': r.rating, 'comment': r.comment, 'hidden': r.hidden,
            'created_at': r.created_at.isoformat(),
            'meal': {'id': r.meal.id, 'dish_name': r.meal.dish_name, 'meal_date': r.meal.meal_date.isoformat()},
            'user': {'id': r.user.id, 'name': r.user.name},
        } for r in reviews]}), 200
    except Exception as e:
        print(f"Error fetching all reviews: {e}")
        return jsonify({'error': 'Failed to fetch reviews.'}), 500


@reviews_bp.route('/api/admin/reviews/<int:review_id>/hide', methods=['PUT'])
@admin_required
def toggle_hide_review(review_id):
    try:
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found.'}), 404
        review.hidden = not review.hidden
        db.session.commit()
        return jsonify({'message': 'Review visibility updated.', 'hidden': review.hidden}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error toggling review hide {review_id}: {e}")
        return jsonify({'error': 'Failed to update review.'}), 500


@reviews_bp.route('/api/admin/reviews/<int:review_id>', methods=['DELETE'])
@owner_required
def admin_delete_review(review_id):
    try:
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found.'}), 404
        db.session.delete(review)
        db.session.commit()
        return jsonify({'message': 'Review deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting review {review_id}: {e}")
        return jsonify({'error': 'Failed to delete review.'}), 500
