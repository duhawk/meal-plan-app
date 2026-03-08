from datetime import datetime, date, timedelta, time as time_type
from flask import Blueprint, request, jsonify, g

from database import db
from models import Meal, MealAttendance, LatePlate, WeeklyPreset
from helpers import jwt_required

weekly_presets_bp = Blueprint('weekly_presets', __name__)


@weekly_presets_bp.route('/api/weekly-presets', methods=['GET'])
@jwt_required
def get_weekly_presets():
    presets = WeeklyPreset.query.filter_by(user_id=g.current_user.id).all()
    return jsonify([{
        'id': p.id,
        'day_of_week': p.day_of_week,
        'meal_type': p.meal_type,
        'attending': p.attending,
        'late_plate': p.late_plate,
        'late_plate_notes': p.late_plate_notes,
        'late_plate_pickup_time': str(p.late_plate_pickup_time) if p.late_plate_pickup_time else None,
        'enabled': p.enabled,
    } for p in presets])


@weekly_presets_bp.route('/api/weekly-presets', methods=['POST'])
@jwt_required
def create_weekly_preset():
    data = request.get_json(silent=True) or {}
    day_of_week = data.get('day_of_week')
    meal_type = data.get('meal_type')

    if day_of_week is None or meal_type not in ('Lunch', 'Dinner'):
        return jsonify({'error': 'day_of_week and meal_type (Lunch or Dinner) are required.'}), 400
    if not (0 <= int(day_of_week) <= 6):
        return jsonify({'error': 'day_of_week must be 0-6.'}), 400

    if WeeklyPreset.query.filter_by(user_id=g.current_user.id,
                                     day_of_week=day_of_week, meal_type=meal_type).first():
        return jsonify({'error': 'Preset already exists for this day and meal type.'}), 409

    pickup_time = None
    pickup = data.get('late_plate_pickup_time')
    if pickup:
        try:
            h, m = pickup.split(':')[:2]
            pickup_time = time_type(int(h), int(m))
        except Exception:
            pass

    preset = WeeklyPreset(
        user_id=g.current_user.id,
        day_of_week=int(day_of_week),
        meal_type=meal_type,
        attending=data.get('attending', True),
        late_plate=data.get('late_plate', False),
        late_plate_notes=data.get('late_plate_notes'),
        late_plate_pickup_time=pickup_time,
        enabled=data.get('enabled', True),
    )
    db.session.add(preset)
    db.session.commit()
    return jsonify({'message': 'Preset created.', 'id': preset.id}), 201


@weekly_presets_bp.route('/api/weekly-presets/<int:preset_id>', methods=['PUT'])
@jwt_required
def update_weekly_preset(preset_id):
    preset = WeeklyPreset.query.get(preset_id)
    if not preset or preset.user_id != g.current_user.id:
        return jsonify({'error': 'Not found.'}), 404

    data = request.get_json(silent=True) or {}
    if 'attending' in data:
        preset.attending = data['attending']
    if 'late_plate' in data:
        preset.late_plate = data['late_plate']
    if 'late_plate_notes' in data:
        preset.late_plate_notes = data['late_plate_notes']
    if 'late_plate_pickup_time' in data:
        pickup = data['late_plate_pickup_time']
        if pickup:
            try:
                h, m = pickup.split(':')[:2]
                preset.late_plate_pickup_time = time_type(int(h), int(m))
            except Exception:
                preset.late_plate_pickup_time = None
        else:
            preset.late_plate_pickup_time = None
    if 'enabled' in data:
        preset.enabled = data['enabled']

    db.session.commit()
    return jsonify({'message': 'Preset updated.'})


@weekly_presets_bp.route('/api/weekly-presets/<int:preset_id>', methods=['DELETE'])
@jwt_required
def delete_weekly_preset(preset_id):
    preset = WeeklyPreset.query.get(preset_id)
    if not preset or preset.user_id != g.current_user.id:
        return jsonify({'error': 'Not found.'}), 404
    db.session.delete(preset)
    db.session.commit()
    return jsonify({'message': 'Preset deleted.'})


@weekly_presets_bp.route('/api/weekly-presets/apply', methods=['POST'])
@jwt_required
def apply_weekly_presets():
    user = g.current_user
    today = date.today()
    end_date = today + timedelta(days=7)

    week_meals = Meal.query.filter(
        Meal.chapter_id == user.chapter_id,
        Meal.meal_date >= datetime.combine(today, datetime.min.time()),
        Meal.meal_date <= datetime.combine(end_date, datetime.max.time()),
    ).all()

    count = 0
    for meal in week_meals:
        preset = WeeklyPreset.query.filter_by(
            user_id=user.id,
            day_of_week=meal.meal_date.weekday(),
            meal_type=meal.meal_type,
            enabled=True,
        ).first()
        if not preset:
            continue

        att = MealAttendance.query.filter_by(user_id=user.id, meal_id=meal.id).first()
        if preset.attending:
            if not att:
                db.session.add(MealAttendance(meal_id=meal.id, user_id=user.id))
        else:
            if att:
                db.session.delete(att)

        if preset.late_plate:
            if not LatePlate.query.filter_by(user_id=user.id, meal_id=meal.id).first():
                db.session.add(LatePlate(
                    meal_id=meal.id, user_id=user.id,
                    notes=preset.late_plate_notes,
                    pickup_time=preset.late_plate_pickup_time,
                    status='pending',
                    request_date=today,
                ))
        count += 1

    db.session.commit()
    return jsonify({'message': f'Presets applied to {count} meal(s) this week.'})
