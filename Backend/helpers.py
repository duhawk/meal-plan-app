import os
import boto3
import jwt as pyjwt
from collections import defaultdict
from functools import wraps
from datetime import datetime, timezone
from flask import g, request, jsonify
from sqlalchemy import func

from database import db
from models import User, Review, MealAttendance, LatePlate, WeeklyPreset
from analytics import welford_from_list

# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------

AWS_BUCKET_NAME = os.getenv('AWS_BUCKET_NAME')
AWS_REGION = os.getenv('AWS_REGION')
S3_BASE_URL = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/"

_s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=AWS_REGION,
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def upload_file_to_s3(file, filename):
    try:
        _s3.upload_fileobj(file, AWS_BUCKET_NAME, filename,
                           ExtraArgs={"ContentType": file.content_type})
    except Exception as e:
        print("S3 upload error:", e)
        return None
    return f"{S3_BASE_URL}{filename}"


# ---------------------------------------------------------------------------
# Auth decorators
# ---------------------------------------------------------------------------

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            payload = pyjwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
            current_user = User.query.get(payload['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found!'}), 404
            g.current_user = current_user
        except pyjwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except pyjwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
        except Exception as e:
            print(f"Error decoding token: {e}")
            return jsonify({'message': 'Something went wrong!'}), 500
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    @jwt_required
    def decorated(*args, **kwargs):
        if not (g.current_user.is_admin or g.current_user.is_owner):
            return jsonify({'message': 'Admins or Owners only!'}), 403
        return f(*args, **kwargs)
    return decorated


def owner_required(f):
    @wraps(f)
    @jwt_required
    def decorated(*args, **kwargs):
        if not g.current_user.is_owner:
            return jsonify({'message': 'Owners only!'}), 403
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Meal helpers
# ---------------------------------------------------------------------------

def apply_preset_to_meal(meal, user, attendance=None):
    preset = WeeklyPreset.query.filter_by(
        user_id=user.id,
        day_of_week=meal.meal_date.weekday(),
        meal_type=meal.meal_type,
        enabled=True,
    ).first()
    if not preset:
        return
    if not preset.attending and attendance:
        db.session.delete(attendance)
    if preset.late_plate:
        existing = LatePlate.query.filter_by(user_id=user.id, meal_id=meal.id).first()
        if not existing:
            db.session.add(LatePlate(
                meal_id=meal.id,
                user_id=user.id,
                notes=preset.late_plate_notes,
                pickup_time=preset.late_plate_pickup_time,
                status='pending',
                request_date=datetime.now(timezone.utc).date(),
            ))


def _enrich_meals(meals_with_counts, user_id):
    """Attach avg_rating, review_count, user_review, attendance and late-plate status."""
    meal_ids = [m.id for m, _ in meals_with_counts]
    if not meal_ids:
        return []

    # Fetch raw ratings so Welford's can compute mean + variance in one pass.
    # SQL AVG only gives mean; Welford's also gives std and the sharpe_analog
    # (mean/std) — a quality-adjusted score that penalises divisive meals.
    _ratings_by_meal = defaultdict(list)
    for meal_id, rating in db.session.query(Review.meal_id, Review.rating).filter(
        Review.meal_id.in_(meal_ids)
    ).all():
        _ratings_by_meal[meal_id].append(rating)

    review_stats = {
        meal_id: welford_from_list(ratings)
        for meal_id, ratings in _ratings_by_meal.items()
    }

    user_reviews = {
        r.meal_id: {'id': r.id, 'rating': r.rating, 'comment': r.comment}
        for r in Review.query.filter(
            Review.meal_id.in_(meal_ids), Review.user_id == user_id
        ).all()
    }

    user_attendance = {
        att.meal_id: att.confirmed
        for att in MealAttendance.query.filter_by(user_id=user_id).all()
    }

    user_late_plates = {
        lp.meal_id: lp.id
        for lp in LatePlate.query.filter_by(user_id=user_id).all()
    }

    _empty_stats = {'mean': None, 'n': 0, 'std': None, 'sharpe_analog': None}
    result = []
    for meal, attendance_count in meals_with_counts:
        stats = review_stats.get(meal.id, _empty_stats)
        result.append({
            'id': meal.id,
            'meal_date': meal.meal_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'meal_type': meal.meal_type,
            'dish_name': meal.dish_name,
            'description': meal.description,
            'image_url': meal.image_url,
            'is_attending': meal.id in user_attendance,
            'attendance_confirmed': user_attendance.get(meal.id),
            'attendance_count': attendance_count or 0,
            'avg_rating': stats['mean'],
            'review_count': stats['n'],
            'rating_std': stats['std'],
            'sharpe_analog': stats['sharpe_analog'],
            'user_review': user_reviews.get(meal.id),
            'late_plate_hours_before': meal.late_plate_hours_before,
            'has_late_plate': meal.id in user_late_plates,
        })
    return result
