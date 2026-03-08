import io
import json
import os
import uuid
import requests as req_lib
from collections import defaultdict
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, and_
from werkzeug.utils import secure_filename

from database import db
from models import Meal, MealAttendance, Review, LatePlate, User
from helpers import jwt_required, admin_required, allowed_file, upload_file_to_s3, apply_preset_to_meal, _enrich_meals, _s3, AWS_BUCKET_NAME, S3_BASE_URL
from analytics import welford_from_list, apply_zscores

meals_bp = Blueprint('meals', __name__)

_CONTENT_TYPE_TO_EXT = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif'}

def _download_and_upload_web_image(url):
    """Download an image from a URL and upload it to S3. Returns the S3 URL or None."""
    try:
        r = req_lib.get(url, timeout=10)
        if not r.ok:
            return None
        content_type = r.headers.get('Content-Type', 'image/jpeg').split(';')[0].strip()
        ext = _CONTENT_TYPE_TO_EXT.get(content_type, 'jpg')
        s3_key = f"uploads/{uuid.uuid4()}.{ext}"
        _s3.upload_fileobj(io.BytesIO(r.content), AWS_BUCKET_NAME, s3_key, ExtraArgs={"ContentType": content_type})
        return f"{S3_BASE_URL}{s3_key}"
    except Exception as e:
        print(f"Web image download/upload error: {e}")
        return None


@meals_bp.route('/api/meals/image-search', methods=['GET'])
@admin_required
def search_meal_images():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'photos': []}), 200
    pexels_key = os.getenv('PEXELS_API_KEY')
    if not pexels_key:
        return jsonify({'error': 'Image search not configured. Add PEXELS_API_KEY to .env on the server.'}), 503
    try:
        resp = req_lib.get(
            'https://api.pexels.com/v1/search',
            headers={'Authorization': pexels_key},
            params={'query': query, 'per_page': 12, 'orientation': 'landscape'},
            timeout=5,
        )
        data = resp.json()
        photos = [{
            'id': p['id'],
            'thumb': p['src']['medium'],
            'full': p['src']['large'],
            'photographer': p['photographer'],
        } for p in data.get('photos', [])]
        return jsonify({'photos': photos}), 200
    except Exception as e:
        print(f"Pexels search error: {e}")
        return jsonify({'error': 'Image search failed.'}), 500


@meals_bp.route('/api/today-meals', methods=['GET'])
@jwt_required
def get_today_meals():
    try:
        user_id = g.current_user.id
        attendance_sq = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('attendance_count'),
        ).group_by(MealAttendance.meal_id).subquery()

        date_str = request.args.get('date')
        try:
            from datetime import date as date_type
            today = date_type.fromisoformat(date_str) if date_str else datetime.now().date()
        except Exception:
            today = datetime.now().date()

        meals = db.session.query(Meal, attendance_sq.c.attendance_count).outerjoin(
            attendance_sq, Meal.id == attendance_sq.c.meal_id
        ).filter(
            db.func.date(Meal.meal_date) == today,
            Meal.chapter_id == g.current_user.chapter_id,
        ).order_by(Meal.meal_date).all()

        return jsonify({'meals': _enrich_meals(meals, user_id)}), 200
    except Exception as e:
        print(f"Error fetching today's meals: {e}")
        return jsonify({'error': "Failed to fetch today's meals."}), 500


@meals_bp.route('/api/menu', methods=['GET'])
@jwt_required
def get_weekly_menu():
    try:
        user_id = g.current_user.id
        attendance_sq = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('attendance_count'),
        ).group_by(MealAttendance.meal_id).subquery()

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = today - timedelta(days=today.weekday() + 1)
        if today.weekday() == 6:
            start_of_week = today
        end_of_week = (start_of_week + timedelta(days=6)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )

        meals = db.session.query(Meal, attendance_sq.c.attendance_count).outerjoin(
            attendance_sq, Meal.id == attendance_sq.c.meal_id
        ).filter(
            Meal.meal_date >= start_of_week,
            Meal.meal_date <= end_of_week,
            Meal.chapter_id == g.current_user.chapter_id,
        ).order_by(Meal.meal_date).all()

        return jsonify({'meals': _enrich_meals(meals, user_id)}), 200
    except Exception as e:
        print(f"Error fetching weekly menu: {e}")
        return jsonify({'error': 'Failed to fetch meals.'}), 500


@meals_bp.route('/api/past-meals', methods=['GET'])
@jwt_required
def get_past_meals():
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = today - timedelta(days=today.weekday() + 1)
        if today.weekday() == 6:
            start_of_week = today

        att_sq = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('instance_attendance_count'),
        ).group_by(MealAttendance.meal_id).subquery()

        instances_sq = db.session.query(
            Meal.id,
            Meal.dish_name,
            Meal.meal_date,
            Meal.meal_type,
            Meal.description,
            Meal.image_url,
            func.coalesce(att_sq.c.instance_attendance_count, 0).label('attendance_for_date'),
        ).outerjoin(att_sq, Meal.id == att_sq.c.meal_id).filter(
            Meal.meal_date < start_of_week,
            Meal.chapter_id == g.current_user.chapter_id,
        ).subquery()

        grouped = db.session.query(
            instances_sq.c.dish_name,
            func.max(instances_sq.c.description).label('description'),
            func.max(instances_sq.c.image_url).label('image_url'),
            func.avg(instances_sq.c.attendance_for_date).label('average_attendance'),
            func.array_agg(
                func.jsonb_build_object(
                    'id', instances_sq.c.id,
                    'date', instances_sq.c.meal_date,
                    'meal_type', instances_sq.c.meal_type,
                    'attendance', instances_sq.c.attendance_for_date,
                )
            ).label('all_occurrences'),
        ).group_by(instances_sq.c.dish_name).order_by(instances_sq.c.dish_name).all()

        # Build meal_id → dish_name map and collect all meal IDs
        meal_id_to_dish = {}
        meals_data = []
        for dish_name, description, image_url, average_attendance, all_occurrences in grouped:
            occurrences = sorted([
                {'id': occ['id'], 'date': datetime.fromisoformat(occ['date']), 'meal_type': occ['meal_type'], 'attendance': occ['attendance']}
                for occ in all_occurrences
            ], key=lambda x: x['date'], reverse=True)
            for occ in occurrences:
                meal_id_to_dish[occ['id']] = dish_name
            meals_data.append({
                'dish_name': dish_name,
                'description': description,
                'image_url': image_url,
                'average_attendance': round(average_attendance, 2) if average_attendance else 0,
                'past_occurrences': occurrences,
            })

        # Fetch all reviews for past meal instances and group by dish_name
        all_meal_ids = list(meal_id_to_dish.keys())
        ratings_by_dish = defaultdict(list)
        if all_meal_ids:
            for meal_id, rating in db.session.query(Review.meal_id, Review.rating).filter(
                Review.meal_id.in_(all_meal_ids)
            ).all():
                dish = meal_id_to_dish.get(meal_id)
                if dish:
                    ratings_by_dish[dish].append(rating)

        # Apply Welford's algorithm per dish
        for dish in meals_data:
            stats = welford_from_list(ratings_by_dish.get(dish['dish_name'], []))
            dish['avg_rating'] = stats['mean']
            dish['review_count'] = stats['n']
            dish['rating_std'] = stats['std']
            dish['sharpe_analog'] = stats['sharpe_analog']

        # Apply cross-sectional z-scores across all dishes
        apply_zscores(meals_data, key='avg_rating')

        return jsonify({'meals': meals_data}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching past meals: {e}")
        return jsonify({'error': 'Failed to fetch past meals.'}), 500


@meals_bp.route('/api/pending-reviews', methods=['GET'])
@jwt_required
def get_pending_reviews():
    """Meals from the last 7 days the user attended or got a late plate for but hasn't reviewed."""
    try:
        user_id = g.current_user.id
        now = datetime.now()
        seven_days_ago = now - timedelta(days=7)

        attended_ids = {
            a.meal_id for a in MealAttendance.query.filter_by(user_id=user_id).all()
        }
        late_plate_ids = {
            lp.meal_id for lp in LatePlate.query.filter_by(user_id=user_id).all()
        }
        eligible_ids = attended_ids | late_plate_ids
        if not eligible_ids:
            return jsonify({'meals': []}), 200

        past_meals = Meal.query.filter(
            Meal.id.in_(eligible_ids),
            Meal.meal_date < now,
            Meal.meal_date >= seven_days_ago,
            Meal.chapter_id == g.current_user.chapter_id,
        ).order_by(Meal.meal_date.desc()).all()

        reviewed_ids = {
            r.meal_id for r in Review.query.filter(
                Review.user_id == user_id,
                Review.meal_id.in_([m.id for m in past_meals]),
            ).all()
        }

        return jsonify({'meals': [
            {
                'id': m.id,
                'dish_name': m.dish_name,
                'meal_type': m.meal_type,
                'meal_date': m.meal_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            }
            for m in past_meals if m.id not in reviewed_ids
        ]}), 200
    except Exception as e:
        print(f"Error fetching pending reviews: {e}")
        return jsonify({'error': 'Failed to fetch pending reviews.'}), 500


@meals_bp.route('/api/meals/<int:meal_id>', methods=['GET'])
@jwt_required
def get_meal(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        return jsonify({
            'id': meal.id,
            'meal_date': meal.meal_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'meal_type': meal.meal_type,
            'dish_name': meal.dish_name,
            'description': meal.description,
            'image_url': meal.image_url,
        }), 200
    except Exception as e:
        print(f"Error fetching meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to fetch meal.'}), 500


@meals_bp.route('/api/meals', methods=['POST'])
@admin_required
def add_meal():
    try:
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename):
                unique_filename = f"uploads/{uuid.uuid4()}-{secure_filename(file.filename)}"
                image_url = upload_file_to_s3(file, unique_filename)
                if not image_url:
                    return jsonify({'error': 'Failed to upload image to S3.'}), 500

        meal_date = request.form.get('meal_date')
        meal_type = request.form.get('meal_type')
        dish_name = request.form.get('dish_name')
        description = request.form.get('description')

        if not meal_date or not meal_type or not dish_name:
            return jsonify({'error': 'Meal date, type, and dish name are required.'}), 400

        chapter_id = g.current_user.chapter_id
        new_meal = Meal(
            meal_date=datetime.fromisoformat(meal_date),
            meal_type=meal_type,
            dish_name=dish_name,
            description=description,
            image_url=image_url,
            chapter_id=chapter_id,
        )
        db.session.add(new_meal)
        db.session.flush()

        all_users = User.query.filter_by(chapter_id=chapter_id).all()
        for user in all_users:
            new_attendance = MealAttendance(meal_id=new_meal.id, user_id=user.id)
            db.session.add(new_attendance)
            apply_preset_to_meal(new_meal, user, new_attendance)

        db.session.commit()
        return jsonify({'message': 'Meal added successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error adding meal: {e}")
        return jsonify({'error': 'Failed to add meal.'}), 500


@meals_bp.route('/api/meals/<int:meal_id>', methods=['PUT'])
@admin_required
def update_meal(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        image_url = meal.image_url
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                unique_filename = f"uploads/{uuid.uuid4()}-{secure_filename(file.filename)}"
                image_url = upload_file_to_s3(file, unique_filename)
                if not image_url:
                    return jsonify({'error': 'Failed to upload image to S3.'}), 500

        meal.meal_date = datetime.fromisoformat(request.form.get('meal_date', meal.meal_date.isoformat()))
        meal.meal_type = request.form.get('meal_type', meal.meal_type)
        meal.dish_name = request.form.get('dish_name', meal.dish_name)
        meal.description = request.form.get('description', meal.description)
        meal.image_url = image_url

        db.session.commit()
        return jsonify({'message': 'Meal updated successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to update meal.'}), 500


@meals_bp.route('/api/meals/<int:meal_id>', methods=['DELETE'])
@admin_required
def delete_meal(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        db.session.delete(meal)
        db.session.commit()
        return jsonify({'message': 'Meal deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to delete meal.'}), 500


@meals_bp.route('/api/meals/week', methods=['DELETE'])
@admin_required
def clear_week_meals():
    data = request.get_json(silent=True) or {}
    date_str = data.get('date')
    if not date_str:
        return jsonify({'error': 'date is required (YYYY-MM-DD)'}), 400
    try:
        from datetime import date as date_type
        d = date_type.fromisoformat(date_str)
        days_since_sunday = (d.weekday() + 1) % 7
        sunday = d - timedelta(days=days_since_sunday)
        saturday = sunday + timedelta(days=6)
        chapter_id = g.current_user.chapter_id
        meals = Meal.query.filter(
            Meal.chapter_id == chapter_id,
            Meal.meal_date >= datetime.combine(sunday, datetime.min.time()),
            Meal.meal_date <= datetime.combine(saturday, datetime.max.time()),
        ).all()
        count = len(meals)
        for meal in meals:
            db.session.delete(meal)
        db.session.commit()
        return jsonify({'message': f'{count} meal(s) cleared for that week.', 'count': count})
    except Exception as e:
        db.session.rollback()
        print(f"Error clearing week meals: {e}")
        return jsonify({'error': 'Failed to clear meals.'}), 500


@meals_bp.route('/api/meals/bulk', methods=['POST'])
@admin_required
def add_bulk_meals():
    try:
        meals_json = request.form.get('meals')
        if not meals_json:
            return jsonify({'error': 'Missing meals data in form.'}), 400

        meals_data = json.loads(meals_json)
        if not isinstance(meals_data, list):
            return jsonify({'error': 'Meals data must be a list.'}), 400

        chapter_id = g.current_user.chapter_id
        new_meals = []
        for meal_data in meals_data:
            image_url = meal_data.get('image_url')
            file_key = f"image-{meal_data['id']}"
            if file_key in request.files:
                file = request.files[file_key]
                if file and file.filename != '' and allowed_file(file.filename):
                    unique_filename = f"uploads/{uuid.uuid4()}-{secure_filename(file.filename)}"
                    image_url = upload_file_to_s3(file, unique_filename)
                    if not image_url:
                        return jsonify({'error': f"Failed to upload image for meal {meal_data['id']}."}), 500
            elif meal_data.get('web_image_url') and not image_url:
                image_url = _download_and_upload_web_image(meal_data['web_image_url'])

            new_meal = Meal(
                meal_date=datetime.fromisoformat(meal_data['meal_date']),
                meal_type=meal_data['meal_type'],
                dish_name=meal_data['dish_name'],
                description=meal_data.get('description'),
                image_url=image_url,
                chapter_id=chapter_id,
            )
            db.session.add(new_meal)
            new_meals.append(new_meal)

        db.session.flush()

        all_users = User.query.filter_by(chapter_id=chapter_id).all()
        for meal in new_meals:
            for user in all_users:
                new_attendance = MealAttendance(meal_id=meal.id, user_id=user.id)
                db.session.add(new_attendance)
                apply_preset_to_meal(meal, user, new_attendance)

        db.session.commit()
        return jsonify({'message': f'{len(new_meals)} meals added successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error adding bulk meals: {e}")
        return jsonify({'error': 'Failed to add bulk meals.'}), 500


@meals_bp.route('/api/meals/search', methods=['GET'])
@admin_required
def search_meals():
    try:
        query = request.args.get('q', '')
        if not query or len(query) < 2:
            return jsonify({'meals': []}), 200

        chapter_id = g.current_user.chapter_id

        dates_sq = db.session.query(
            Meal.dish_name,
            db.func.array_agg(Meal.meal_date).label('all_dates'),
        ).filter(
            Meal.dish_name.ilike(f'%{query}%'),
            Meal.chapter_id == chapter_id,
        ).group_by(Meal.dish_name).subquery()

        sub = db.session.query(
            Meal.dish_name,
            db.func.max(Meal.meal_date).label('max_meal_date'),
        ).filter(
            Meal.dish_name.ilike(f'%{query}%'),
            Meal.chapter_id == chapter_id,
        ).group_by(Meal.dish_name).subquery()

        past_meals = db.session.query(Meal, dates_sq.c.all_dates).join(
            sub, and_(Meal.dish_name == sub.c.dish_name, Meal.meal_date == sub.c.max_meal_date)
        ).join(
            dates_sq, Meal.dish_name == dates_sq.c.dish_name
        ).order_by(Meal.dish_name).limit(10).all()

        meals_data = [{
            'dish_name': meal.dish_name,
            'description': meal.description,
            'image_url': meal.image_url,
            'past_dates': sorted([d.isoformat() for d in all_dates], reverse=True),
        } for meal, all_dates in past_meals]

        return jsonify({'meals': meals_data}), 200
    except Exception as e:
        print(f"Error searching meals: {e}")
        return jsonify({'error': 'Failed to search meals.'}), 500
