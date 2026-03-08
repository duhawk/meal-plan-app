from datetime import datetime
from flask import Blueprint, request, jsonify, g
from sqlalchemy.orm import joinedload

from database import db
from models import Meal, MealAttendance, User
from helpers import jwt_required, admin_required

attendance_bp = Blueprint('attendance', __name__)


@attendance_bp.route('/api/meals/<int:meal_id>/attendance', methods=['POST'])
@jwt_required
def mark_attendance(meal_id):
    user_id = g.current_user.id
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        existing = MealAttendance.query.filter_by(user_id=user_id, meal_id=meal_id).first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            return jsonify({'message': 'Attendance removed.', 'is_attending': False}), 200
        else:
            db.session.add(MealAttendance(meal_id=meal_id, user_id=user_id))
            db.session.commit()
            return jsonify({'message': 'Attendance marked successfully.', 'is_attending': True}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error marking attendance: {e}")
        return jsonify({'error': 'Failed to mark attendance.'}), 500


@attendance_bp.route('/api/meals/<int:meal_id>/attendance/confirm', methods=['POST'])
@jwt_required
def confirm_attendance(meal_id):
    user_id = g.current_user.id
    data = request.get_json(silent=True)
    confirmed_status = data.get('confirmed')

    if confirmed_status is None or not isinstance(confirmed_status, bool):
        return jsonify({'error': 'A boolean "confirmed" status is required.'}), 400

    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        if meal.meal_date > datetime.now():
            return jsonify({'error': 'Cannot confirm attendance for a future or ongoing meal.'}), 400

        record = MealAttendance.query.filter_by(user_id=user_id, meal_id=meal_id).first()
        if not record:
            return jsonify({'error': 'You were not marked as attending this meal.'}), 400

        record.confirmed = confirmed_status
        db.session.commit()
        return jsonify({'message': 'Attendance confirmation updated successfully.',
                        'meal_id': meal_id, 'confirmed': confirmed_status}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error confirming attendance for meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to update attendance confirmation.'}), 500


@attendance_bp.route('/api/meals/<int:meal_id>/attendance', methods=['GET'])
@jwt_required
def get_meal_attendance(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        records = db.session.query(MealAttendance).options(
            joinedload(MealAttendance.user)
        ).filter_by(meal_id=meal_id).all()

        return jsonify({
            'meal_id': meal_id,
            'attendance_count': len(records),
            'attendance': [{
                'user_id': r.user_id,
                'user_name': r.user.name,
                'user_email': r.user.email,
                'attended_at': r.attendance_time.isoformat(),
            } for r in records],
        }), 200
    except Exception as e:
        print(f"Error fetching meal attendance: {e}")
        return jsonify({'error': 'Failed to fetch meal attendance.'}), 500


@attendance_bp.route('/api/admin/attendance', methods=['GET'])
@admin_required
def get_all_attendance():
    try:
        records = db.session.query(MealAttendance).options(
            joinedload(MealAttendance.meal), joinedload(MealAttendance.user)
        ).join(Meal, MealAttendance.meal_id == Meal.id).filter(
            Meal.chapter_id == g.current_user.chapter_id
        ).order_by(MealAttendance.attendance_time.desc()).all()

        return jsonify({'attendance': [{
            'id': r.id,
            'attended_at': r.attendance_time.isoformat(),
            'meal': {'id': r.meal.id, 'dish_name': r.meal.dish_name, 'meal_date': r.meal.meal_date.isoformat()},
            'user': {'id': r.user.id, 'name': r.user.name},
        } for r in records]}), 200
    except Exception as e:
        print(f"Error fetching all attendance: {e}")
        return jsonify({'error': 'Failed to fetch attendance.'}), 500


@attendance_bp.route('/api/admin/meals/<int:meal_id>/attendance-details', methods=['GET'])
@admin_required
def get_meal_attendance_details(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        records = db.session.query(MealAttendance).options(
            joinedload(MealAttendance.user)
        ).filter_by(meal_id=meal_id).all()

        confirmed, no_shows, unconfirmed = [], [], []
        seen = set()
        for r in records:
            ud = {'id': r.user.id, 'name': r.user.name, 'email': r.user.email}
            seen.add(r.user.id)
            if r.confirmed is True:    confirmed.append(ud)
            elif r.confirmed is False: no_shows.append(ud)
            else:                      unconfirmed.append(ud)

        all_users = User.query.filter_by(chapter_id=meal.chapter_id).all()
        non_attendees = [{'id': u.id, 'name': u.name, 'email': u.email}
                         for u in all_users if u.id not in seen]

        return jsonify({
            'meal': {
                'id': meal.id, 'dish_name': meal.dish_name,
                'meal_date': meal.meal_date.isoformat(), 'meal_type': meal.meal_type,
                'image_url': meal.image_url,
            },
            'confirmed_attendees': confirmed,
            'no_shows': no_shows,
            'unconfirmed_attendees': unconfirmed,
            'non_attendees': non_attendees,
            'confirmed_count': len(confirmed),
            'no_show_count': len(no_shows),
            'unconfirmed_count': len(unconfirmed),
            'non_attendee_count': len(non_attendees),
            'total_users': len(all_users),
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching attendance details for meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to fetch attendance details.'}), 500
