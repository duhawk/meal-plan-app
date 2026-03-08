from datetime import datetime, time as dt_time
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from database import db
from models import Meal, LatePlate
from helpers import jwt_required, admin_required

late_plates_bp = Blueprint('late_plates', __name__)


@late_plates_bp.route('/api/meals/<int:meal_id>/late-plates', methods=['POST'])
@jwt_required
def request_late_plate(meal_id):
    data = request.get_json(silent=True)
    user_id = g.current_user.id
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        if meal.meal_date.date() < datetime.now().date():
            return jsonify({'error': 'Cannot request a late plate for a past meal.'}), 400

        if meal.late_plate_hours_before is not None:
            from datetime import timedelta
            deadline = meal.meal_date - timedelta(hours=meal.late_plate_hours_before)
            if datetime.now() > deadline:
                return jsonify({'error': f'Late plate requests closed {meal.late_plate_hours_before} hour(s) before meal time.'}), 400

        pickup_time = None
        pickup_str = (data.get('pickup_time') or '').strip()
        if pickup_str:
            try:
                h, m = pickup_str.split(':')
                pickup_time = dt_time(int(h), int(m))
            except (ValueError, AttributeError):
                return jsonify({'error': 'Invalid pickup_time format. Use HH:MM.'}), 400

        today_date = datetime.now().date()
        if LatePlate.query.filter_by(user_id=user_id, meal_id=meal_id, request_date=today_date).first():
            return jsonify({'error': 'You have already requested a late plate for this meal today.'}), 400

        db.session.add(LatePlate(
            meal_id=meal_id, user_id=user_id,
            notes=data.get('notes'),
            status='pending',
            request_date=today_date,
            pickup_time=pickup_time,
        ))
        db.session.commit()
        return jsonify({'message': 'Late plate request submitted successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error requesting late plate: {e}")
        return jsonify({'error': 'Failed to request late plate.'}), 500


@late_plates_bp.route('/api/meals/<int:meal_id>/late-plates', methods=['DELETE'])
@jwt_required
def cancel_late_plate(meal_id):
    user_id = g.current_user.id
    try:
        lp = LatePlate.query.filter_by(user_id=user_id, meal_id=meal_id).first()
        if not lp:
            return jsonify({'error': 'No late plate request found.'}), 404
        db.session.delete(lp)
        db.session.commit()
        return jsonify({'message': 'Late plate request cancelled.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to cancel late plate.'}), 500


@late_plates_bp.route('/api/meals/<int:meal_id>/late-plates', methods=['GET'])
@jwt_required
def get_late_plates(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        late_plates = db.session.query(LatePlate).options(
            joinedload(LatePlate.user), joinedload(LatePlate.meal)
        ).filter_by(meal_id=meal_id).order_by(LatePlate.request_time.desc()).all()

        return jsonify({'late_plates': [{
            'id': lp.id, 'user_id': lp.user_id, 'meal_id': lp.meal_id,
            'request_time': lp.request_time.isoformat(),
            'status': lp.status, 'notes': lp.notes,
            'user_name': lp.user.name if lp.user else None,
        } for lp in late_plates]}), 200
    except Exception as e:
        print(f"Error fetching late plates: {e}")
        return jsonify({'error': 'Failed to fetch late plates.'}), 500


@late_plates_bp.route('/api/admin/late-plates/today', methods=['GET'])
@admin_required
def get_today_late_plates():
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        late_plates = db.session.query(LatePlate).options(
            joinedload(LatePlate.user), joinedload(LatePlate.meal)
        ).join(Meal, LatePlate.meal_id == Meal.id).filter(
            Meal.meal_date >= today,
            Meal.chapter_id == g.current_user.chapter_id,
        ).order_by(Meal.meal_date.asc(), LatePlate.request_time.asc()).all()

        return jsonify({'late_plates': [{
            'id': lp.id,
            'user_id': lp.user_id,
            'user_name': lp.user.name if lp.user else 'Unknown User',
            'meal_id': lp.meal_id,
            'meal_dish_name': lp.meal.dish_name if lp.meal else 'Unknown Meal',
            'meal_date': lp.meal.meal_date.isoformat() if lp.meal else None,
            'meal': {
                'meal_type': lp.meal.meal_type if lp.meal else None,
                'meal_date': lp.meal.meal_date.isoformat() if lp.meal else None,
            } if lp.meal else None,
            'request_time': lp.request_time.isoformat(),
            'status': lp.status,
            'notes': lp.notes,
            'pickup_time': lp.pickup_time.strftime('%H:%M') if lp.pickup_time else None,
        } for lp in late_plates]}), 200
    except Exception as e:
        print(f"Error fetching today's late plates: {e}")
        return jsonify({'error': "Failed to fetch today's late plates."}), 500


@late_plates_bp.route('/api/admin/late-plates/pending-count', methods=['GET'])
@admin_required
def get_pending_late_plate_count():
    try:
        now = datetime.now()
        count = db.session.query(func.count(LatePlate.id)).join(
            Meal, LatePlate.meal_id == Meal.id
        ).filter(
            LatePlate.status == 'pending',
            Meal.meal_date >= now,
            Meal.chapter_id == g.current_user.chapter_id,
        ).scalar() or 0
        return jsonify({'count': count}), 200
    except Exception as e:
        print(f"Error fetching pending late plate count: {e}")
        return jsonify({'error': 'Failed to fetch count.'}), 500


@late_plates_bp.route('/api/admin/late-plates/<int:late_plate_id>/status', methods=['PUT'])
@admin_required
def update_late_plate_status(late_plate_id):
    try:
        data = request.get_json(silent=True)
        new_status = data.get('status')
        if new_status not in ('pending', 'approved', 'denied'):
            return jsonify({'error': 'Invalid status. Must be pending, approved, or denied.'}), 400

        lp = LatePlate.query.get(late_plate_id)
        if not lp:
            return jsonify({'error': 'Late plate request not found.'}), 404

        lp.status = new_status
        db.session.commit()
        return jsonify({'message': f'Status updated to {new_status}.', 'status': new_status}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating late plate status {late_plate_id}: {e}")
        return jsonify({'error': 'Failed to update late plate status.'}), 500
