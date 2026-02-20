import os
import secrets
from flask import Flask, request, jsonify, make_response, send_from_directory
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta, timezone
import jwt
from functools import wraps
from flask import g
from sqlalchemy import desc, func, and_
from sqlalchemy.orm import joinedload
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.utils import secure_filename
import json
import click

load_dotenv()

from email_utils import send_verification_email, send_reset_email

from apscheduler.schedulers.background import BackgroundScheduler

# AWS S3 Configuration
import boto3
AWS_BUCKET_NAME = os.getenv('AWS_BUCKET_NAME')
AWS_REGION = os.getenv('AWS_REGION')
S3_BASE_URL = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/"

s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=AWS_REGION
)

def upload_file_to_s3(file, filename, acl="public-read"):
    """
    Uploads a file to an S3 bucket
    :param file: File to upload
    :param filename: S3 object name
    :param acl: Access control list
    :return: S3 object URL or None if upload fails
    """
    try:
        s3.upload_fileobj(
            file,
            AWS_BUCKET_NAME,
            filename,
            ExtraArgs={
                "ACL": acl,
                "ContentType": file.content_type
            }
        )
    except Exception as e:
        print("S3 upload error:", e)
        return None
    return f"{S3_BASE_URL}{filename}"

app = Flask(__name__)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

database_url = os.getenv('DATABASE_URL')
if database_url is None:
    raise RuntimeError("DATABASE_URL environment variable is not set!")
app.config['SQLALCHEMY_DATABASE_URI'] = database_url

CORS(
    app,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://yourdomain.com",       # TODO: replace with real domain
        "https://www.yourdomain.com",   # TODO: replace with real domain
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True
)

from database import db
db.init_app(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)
from flask_marshmallow import Marshmallow
ma = Marshmallow(app)

from models import User, Meal, Review, LatePlate, MealAttendance, Recommendation, HouseSettings, Chapter, PendingRegistration

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True

class RecommendationSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Recommendation
        load_instance = True
        include_fk = True
    
    user = ma.Nested(lambda: UserSchema(only=("id", "name", "email")))

recommendation_schema = RecommendationSchema()
recommendations_schema = RecommendationSchema(many=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer'):
                token = auth_header.split(" ")[1]
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
            user_id = payload['user_id']
            with app.app_context():
                current_user = User.query.get(user_id)
                if not current_user:
                    return jsonify({'message': 'User not found!'}), 404
            g.current_user = current_user
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
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



@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    return send_from_directory(uploads_dir, filename)

@app.route('/api/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON.'}), 400

        email = (data.get('email') or '').strip().lower()
        password = data.get('password')
        first_name = data.get('firstName')
        last_name = data.get('lastName')

        if not email: return jsonify({'error': 'Email is required.'}), 400
        if not password: return jsonify({'error': 'Password is required.'}), 400
        if not first_name: return jsonify({'error': 'First name is required.'}), 400
        if not last_name: return jsonify({'error': 'Last name is required.'}), 400

        # Multi-chapter: resolve chapter from access code
        submitted_code = (data.get('access_code') or '').strip()
        chapter = Chapter.query.filter_by(access_code=submitted_code).first() if submitted_code else None
        if not chapter:
            if Chapter.query.count() > 0:
                return jsonify({'error': 'Invalid access code.'}), 403
            chapter_id = None
        else:
            chapter_id = chapter.id

        # Reject if a verified account already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists.'}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        token = secrets.token_urlsafe(32)

        # Upsert pending registration — replace if they're re-registering before verifying
        existing = PendingRegistration.query.filter_by(email=email).first()
        if existing:
            db.session.delete(existing)
            db.session.flush()

        pending = PendingRegistration(
            email=email,
            password_hash=hashed_password,
            first_name=first_name,
            last_name=last_name,
            chapter_id=chapter_id,
            token=token,
            token_expires=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.session.add(pending)
        db.session.commit()

        try:
            send_verification_email(email, token)
        except Exception as mail_err:
            print(f"Warning: could not send verification email: {mail_err}")

        return jsonify({'message': 'Check your email to verify your account before logging in.'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error registering user: {e}")
        return jsonify({'error': 'Failed to register user.'}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json(silent=True)
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400
    
    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    expiration_time = datetime.now() + timedelta(hours=24)
    payload = { 'user_id': user.id, 'exp': expiration_time }
    token = jwt.encode(payload, os.getenv('JWT_SECRET'), algorithm='HS256')
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': { 'id': user.id, 'email': user.email, 'name': user.name, 'is_admin': user.is_admin, 'is_owner': user.is_owner }
    }), 200

@app.route('/api/me', methods=['GET'])
@jwt_required
def get_me():
    user = g.current_user
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_admin': user.is_admin,
        'is_owner': user.is_owner
    }), 200

@app.route('/api/me', methods=['PUT'])
@jwt_required
def update_me():
    try:
        data = request.get_json(silent=True)
        user = g.current_user

        new_first_name = (data.get('first_name') or '').strip()
        new_last_name = (data.get('last_name') or '').strip()
        new_password = (data.get('password') or '').strip()
        current_password = (data.get('current_password') or '').strip()

        if new_first_name:
            user.first_name = new_first_name
            user.last_name = new_last_name if new_last_name else user.last_name
            user.name = f"{user.first_name} {user.last_name}"

        if new_password:
            if not current_password:
                return jsonify({'error': 'Current password is required to change password.'}), 400
            if not bcrypt.check_password_hash(user.password_hash, current_password):
                return jsonify({'error': 'Current password is incorrect.'}), 401
            if len(new_password) < 6:
                return jsonify({'error': 'New password must be at least 6 characters.'}), 400
            user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')

        db.session.commit()
        return jsonify({
            'message': 'Profile updated successfully.',
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_admin': user.is_admin,
                'is_owner': user.is_owner,
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user profile: {e}")
        return jsonify({'error': 'Failed to update profile.'}), 500
    
def _enrich_meals(meals_with_counts, user_id):
    """Attach avg_rating, review_count, and user_review to each meal in the list."""
    meal_ids = [m.id for m, _ in meals_with_counts]
    if not meal_ids:
        return []

    # Aggregate rating stats per meal (all reviews, including hidden — hidden still count)
    review_stats = {
        row.meal_id: {'avg_rating': round(float(row.avg_rating), 2), 'review_count': row.review_count}
        for row in db.session.query(
            Review.meal_id,
            func.avg(Review.rating).label('avg_rating'),
            func.count(Review.id).label('review_count')
        ).filter(Review.meal_id.in_(meal_ids)).group_by(Review.meal_id).all()
    }

    # Current user's own review per meal
    user_reviews = {
        r.meal_id: {'id': r.id, 'rating': r.rating, 'comment': r.comment}
        for r in Review.query.filter(
            Review.meal_id.in_(meal_ids), Review.user_id == user_id
        ).all()
    }

    user_attendance = {
        ma.meal_id: ma.confirmed
        for ma in MealAttendance.query.filter_by(user_id=user_id).all()
    }

    result = []
    for meal, attendance_count in meals_with_counts:
        stats = review_stats.get(meal.id, {'avg_rating': None, 'review_count': 0})
        result.append({
            'id': meal.id,
            'meal_date': meal.meal_date.isoformat(),
            'meal_type': meal.meal_type,
            'dish_name': meal.dish_name,
            'description': meal.description,
            'image_url': meal.image_url,
            'is_attending': meal.id in user_attendance,
            'attendance_confirmed': user_attendance.get(meal.id),  # None / True / False
            'attendance_count': attendance_count or 0,
            'avg_rating': stats['avg_rating'],
            'review_count': stats['review_count'],
            'user_review': user_reviews.get(meal.id),
            'late_plate_hours_before': meal.late_plate_hours_before,
        })
    return result

@app.route('/api/today-meals', methods=['GET'])
@jwt_required
def get_today_meals():
    try:
        user_id = g.current_user.id

        attendance_subquery = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('attendance_count')
        ).group_by(MealAttendance.meal_id).subquery()

        today = datetime.now().date()

        meals = db.session.query(
            Meal,
            attendance_subquery.c.attendance_count
        ).outerjoin(
            attendance_subquery, Meal.id == attendance_subquery.c.meal_id
        ).filter(
            db.func.date(Meal.meal_date) == today,
            Meal.chapter_id == g.current_user.chapter_id
        ).order_by(Meal.meal_date).all()

        return jsonify({'meals': _enrich_meals(meals, user_id)}), 200
    except Exception as e:
        print(f"Error fetching today's meals: {e}")
        return jsonify({'error': 'Failed to fetch today\'s meals.'}), 500

@app.route('/api/menu', methods=['GET'])
@jwt_required
def get_weekly_menu():
    try:
        print("--- Get Weekly Menu Request ---")
        user_id = g.current_user.id
        print(f"Current User ID: {user_id}")
        
        attendance_subquery = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('attendance_count')
        ).group_by(MealAttendance.meal_id).subquery()

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate the start and end of the current week (Sunday to Saturday)
        # Assuming today is a datetime object
        start_of_week = today - timedelta(days=today.weekday() + 1) # Monday is 0, Sunday is 6. So Sunday is today.weekday() + 1 days ago
        if today.weekday() == 6: # If today is Sunday
            start_of_week = today
        
        end_of_week = start_of_week + timedelta(days=6)
        end_of_week = end_of_week.replace(hour=23, minute=59, second=59, microsecond=999999)

        print(f"Current week: {start_of_week.date()} to {end_of_week.date()}")

        meals = db.session.query(
            Meal,
            attendance_subquery.c.attendance_count
        ).outerjoin(
            attendance_subquery, Meal.id == attendance_subquery.c.meal_id
        ).filter(
            Meal.meal_date >= start_of_week,
            Meal.meal_date <= end_of_week,
            Meal.chapter_id == g.current_user.chapter_id
        ).order_by(Meal.meal_date).all()

        meals_data = _enrich_meals(meals, user_id)
        print(f"Returning {len(meals_data)} upcoming meals for the current week.")
        return jsonify({'meals': meals_data}), 200
    except Exception as e:
        print(f"--- Error in get_weekly_menu ---")
        print(f"Exception type: {type(e)}")
        print(f"Exception args: {e.args}")
        print(f"Error fetching meals: {e}")
        return jsonify({'error': 'Failed to fetch meals.'}), 500

@app.route('/api/past-meals', methods=['GET'])
@jwt_required
def get_past_meals():
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate the start of the current week (Sunday)
        start_of_week = today - timedelta(days=today.weekday() + 1)
        if today.weekday() == 6: # If today is Sunday
            start_of_week = today

        # Subquery to get all attendance counts for each meal instance
        meal_instance_attendance_subquery = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('instance_attendance_count')
        ).group_by(MealAttendance.meal_id).subquery()

        # Subquery to get all meal instances with their attendance counts
        all_meal_instances_subquery = db.session.query(
            Meal.id,
            Meal.dish_name,
            Meal.meal_date,
            Meal.description,
            Meal.image_url,
            func.coalesce(meal_instance_attendance_subquery.c.instance_attendance_count, 0).label('attendance_for_date')
        ).outerjoin(
            meal_instance_attendance_subquery, Meal.id == meal_instance_attendance_subquery.c.meal_id
        ).filter(
            Meal.meal_date < start_of_week,
            Meal.chapter_id == g.current_user.chapter_id
        ).subquery()

        # Main query to group by dish_name and aggregate data
        grouped_meals_data = db.session.query(
            all_meal_instances_subquery.c.dish_name,
            func.max(all_meal_instances_subquery.c.description).label('description'),
            func.max(all_meal_instances_subquery.c.image_url).label('image_url'),
            func.avg(all_meal_instances_subquery.c.attendance_for_date).label('average_attendance'),
            func.array_agg(
                func.jsonb_build_object(
                    'id', all_meal_instances_subquery.c.id, # Include meal ID
                    'date', all_meal_instances_subquery.c.meal_date,
                    'attendance', all_meal_instances_subquery.c.attendance_for_date
                )
            ).label('all_occurrences')
        ).group_by(all_meal_instances_subquery.c.dish_name) \
        .order_by(all_meal_instances_subquery.c.dish_name) \
        .all()

        meals_data = []
        for dish_name, description, image_url, average_attendance, all_occurrences in grouped_meals_data:
            meals_data.append({
                'dish_name': dish_name,
                'description': description,
                'image_url': image_url,
                'average_attendance': round(average_attendance, 2) if average_attendance else 0,
                'past_occurrences': sorted([
                    {'id': occ['id'], 'date': datetime.fromisoformat(occ['date']), 'attendance': occ['attendance']}
                    for occ in all_occurrences
                ], key=lambda x: x['date'], reverse=True),
            })
        return jsonify({'meals': meals_data}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching past meals: {e}")
        return jsonify({'error': 'Failed to fetch past meals.'}), 500
        
@app.route('/api/meals', methods=['POST'])
@admin_required
def add_meal():
    try:
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename): # allowed_file still needed to validate extension
                filename = secure_filename(file.filename)
                # Ensure a unique filename for S3, e.g., using UUID
                import uuid
                unique_filename = f"{uuid.uuid4()}-{filename}"
                s3_image_url = upload_file_to_s3(file, unique_filename)
                if s3_image_url:
                    image_url = s3_image_url
                else:
                    return jsonify({'error': 'Failed to upload image to S3.'}), 500
        
        meal_date = request.form.get('meal_date')
        meal_type = request.form.get('meal_type')
        dish_name = request.form.get('dish_name')
        description = request.form.get('description')

        if not meal_date or not meal_type or not dish_name:
            return jsonify({'error': 'Meal date, type, and dish name are required.'}), 400
        
        meal_date_obj = datetime.fromisoformat(meal_date)
        
        chapter_id = g.current_user.chapter_id
        new_meal = Meal(
            meal_date=meal_date_obj,
            meal_type=meal_type,
            dish_name=dish_name,
            description=description,
            image_url=image_url,
            chapter_id=chapter_id
        )
        db.session.add(new_meal)
        db.session.flush()

        # Mark all chapter members as attending the new meal
        all_users = User.query.filter_by(chapter_id=chapter_id).all()
        for user in all_users:
            new_attendance = MealAttendance(meal_id=new_meal.id, user_id=user.id)
            db.session.add(new_attendance)

        db.session.commit()
        return jsonify({'message': 'Meal added successfully.'}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding meal: {e}")
        return jsonify({'error': 'Failed to add meal.'}), 500

@app.route('/api/meals/<int:meal_id>/reviews', methods=['POST'])
@jwt_required
def submit_review(meal_id):
    data = request.get_json(silent=True)
    rating = float(data.get('rating'))
    comment = data.get('comment')
    user_id = g.current_user.id

    if rating is None:
        return jsonify({'error': 'Rating is required.'}), 400
    if not (1.0 <= rating <= 5.0 and (rating * 2) % 1 == 0):
        return jsonify({'error': 'Rating must be between 1.0 and 5.0 in half star increments.'})
    
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        existing_review = Review.query.filter_by(user_id=user_id, meal_id=meal_id).first()
        if existing_review:
            return jsonify({'error': 'You have already reviewed this meal.'}), 400
        
        new_review = Review(meal_id=meal_id, user_id=user_id, rating=rating, comment=comment)
        db.session.add(new_review)
        
        existing_attendance = MealAttendance.query.filter_by(user_id=user_id, meal_id=meal_id).first()
        if not existing_attendance:
            new_attendance = MealAttendance(meal_id=meal_id, user_id=user_id)
            db.session.add(new_attendance)
        
        db.session.commit()
        return jsonify({'message': 'Meal review created successfully', 'review_id': new_review.id}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting review: {e}")
        return jsonify({'error': 'Failed to submit review.'}), 500

@app.route('/api/meals/<int:meal_id>/reviews/<int:review_id>', methods=['PUT'])
@jwt_required
def edit_review(meal_id, review_id):
    try:
        data = request.get_json(silent=True)
        rating = data.get('rating')
        comment = data.get('comment')
        user_id = g.current_user.id

        review = Review.query.filter_by(id=review_id, meal_id=meal_id).first()
        if not review:
            return jsonify({'error': 'Review not found.'}), 404
        if review.user_id != user_id:
            return jsonify({'error': 'You can only edit your own reviews.'}), 403

        if rating is not None:
            rating = float(rating)
            if not (1.0 <= rating <= 5.0 and (rating * 2) % 1 == 0):
                return jsonify({'error': 'Rating must be between 1.0 and 5.0 in half star increments.'}), 400
            review.rating = rating
        if 'comment' in data:
            review.comment = comment

        db.session.commit()
        return jsonify({'message': 'Review updated successfully.', 'review': {'id': review.id, 'rating': review.rating, 'comment': review.comment}}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error editing review {review_id}: {e}")
        return jsonify({'error': 'Failed to update review.'}), 500

@app.route('/api/meals/<int:meal_id>/reviews/<int:review_id>', methods=['DELETE'])
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

@app.route('/api/meals/<int:meal_id>/late-plates', methods=['POST'])
@jwt_required
def request_late_plate(meal_id):
    data = request.get_json(silent=True)
    notes = data.get('notes')
    user_id = g.current_user.id
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        # Check if the meal date has already passed
        if meal.meal_date.date() < datetime.now().date():
            return jsonify({'error': 'Cannot request a late plate for a past meal.'}), 400

        # Per-meal deadline check
        if meal.late_plate_hours_before is not None:
            from datetime import timedelta as td
            deadline = meal.meal_date - td(hours=meal.late_plate_hours_before)
            if datetime.now() > deadline:
                return jsonify({'error': f'Late plate requests closed {meal.late_plate_hours_before} hour(s) before meal time.'}), 400

        # Parse optional pickup_time ("HH:MM")
        pickup_time = None
        pickup_time_str = (data.get('pickup_time') or '').strip()
        if pickup_time_str:
            try:
                from datetime import time as dt_time
                h, m = pickup_time_str.split(':')
                pickup_time = dt_time(int(h), int(m))
            except (ValueError, AttributeError):
                return jsonify({'error': 'Invalid pickup_time format. Use HH:MM (24-hour).'}), 400

        today_date = datetime.now().date()
        existing_late_plate = LatePlate.query.filter_by(
            user_id=user_id,
            meal_id=meal_id,
            request_date=today_date
        ).first()

        if existing_late_plate:
            return jsonify({'error': 'You have already requested a late plate for this meal today.'}), 400

        new_late_plate = LatePlate(
            meal_id=meal_id,
            user_id=user_id,
            notes=notes,
            status='pending',
            request_date=today_date,
            pickup_time=pickup_time
        )
        db.session.add(new_late_plate)
        db.session.commit()
        return jsonify({'message': 'Late plate request submitted successfully.', 'late_plate_id': new_late_plate.id}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error requesting late plate: {e}")
        return jsonify({'error': 'Failed to request late plate.'}), 500
    
@app.route('/api/meals/<int:meal_id>/attendance', methods=['POST'])
@jwt_required
def mark_attendance(meal_id):
    user_id = g.current_user.id
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        existing_attendance = MealAttendance.query.filter_by(user_id=user_id, meal_id=meal_id).first()
        
        if existing_attendance:
            db.session.delete(existing_attendance)
            db.session.commit()
            return jsonify({'message': 'Attendance removed.', 'is_attending': False}), 200
        else:
            new_attendance = MealAttendance(meal_id=meal_id, user_id=user_id)
            db.session.add(new_attendance)
            db.session.commit()
            return jsonify({'message': 'Attendance marked successfully.', 'is_attending': True}), 201
            
    except Exception as e:
        db.session.rollback()
        print(f"Error marking attendance: {e}")
        return jsonify({'error': 'Failed to mark attendance.'}), 500
    
@app.route('/api/meals/<int:meal_id>/attendance/confirm', methods=['POST'])
@jwt_required
def confirm_attendance(meal_id):
    user_id = g.current_user.id
    data = request.get_json(silent=True)
    confirmed_status = data.get('confirmed') # Expecting True or False

    if confirmed_status is None or not isinstance(confirmed_status, bool):
        return jsonify({'error': 'A boolean "confirmed" status is required.'}), 400

    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        # Ensure meal time has passed
        if meal.meal_date > datetime.now():
            return jsonify({'error': 'Cannot confirm attendance for a future or ongoing meal.'}), 400

        attendance_record = MealAttendance.query.filter_by(
            user_id=user_id,
            meal_id=meal_id
        ).first()

        if not attendance_record:
            return jsonify({'error': 'You were not marked as attending this meal.'}), 400

        attendance_record.confirmed = confirmed_status
        db.session.commit()
        return jsonify({
            'message': 'Attendance confirmation updated successfully.',
            'meal_id': meal_id,
            'confirmed': confirmed_status
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error confirming attendance for meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to update attendance confirmation.'}), 500

@app.route('/api/meals/<int:meal_id>/reviews', methods=['GET'])
@jwt_required
def get_meal_reviews(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        reviews = Review.query.filter_by(meal_id=meal_id).order_by(Review.created_at.desc()).all()
        reviews_data = [{
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at.isoformat()
        } for review in reviews]
        return jsonify({'reviews': reviews_data}), 200
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return jsonify({'error': 'Failed to fetch reviews.'}), 500

@app.route('/api/meals/<int:meal_id>/late-plates', methods=['GET'])
@jwt_required
def get_late_plates(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        late_plates = db.session.query(LatePlate).options(
            joinedload(LatePlate.user), 
            joinedload(LatePlate.meal)
        ).order_by(LatePlate.request_time.desc()).all()
        
        late_plates_data = [{
            'id': lp.id,
            'user_id': lp.user_id,
            'meal_id': lp.meal_id,
            'request_time': lp.request_time.isoformat(),
            'status': lp.status,
            'notes': lp.notes,
            'user_name': lp.user.name if lp.user else None,
        } for lp in late_plates]
        return jsonify({'late_plates': late_plates_data}), 200
    except Exception as e:
        print(f"Error fetching late plates: {e}")
        return jsonify({'error': 'Failed to fetch late plates.'}), 500
    
@app.route('/api/meals/<int:meal_id>/attendance', methods=['GET'])
@jwt_required
def get_meal_attendance(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        attendance_records = db.session.query(MealAttendance).options(
            joinedload(MealAttendance.user)
        ).filter_by(meal_id=meal_id).all()

        attendance_list = [{
            'user_id': record.user_id,
            'user_name': record.user.name,
            'user_email': record.user.email,
            'attended_at': record.attendance_time.isoformat()
        } for record in attendance_records]

        return jsonify({
            'meal_id': meal_id,
            'attendance_count': len(attendance_records),
            'attendance': attendance_list
        }), 200
    except Exception as e:
        print(f"Error fetching meal attendance: {e}")
        return jsonify({'error': 'Failed to fetch meal attendance.'}), 500
    
@app.route('/api/meals/<int:meal_id>', methods=['GET'])
@jwt_required
def get_meal(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        return jsonify({
            'id': meal.id,
            'meal_date': meal.meal_date.isoformat(),
            'meal_type': meal.meal_type,
            'dish_name': meal.dish_name,
            'description': meal.description,
            'image_url': meal.image_url,
        }), 200
    except Exception as e:
        print(f"Error fetching meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to fetch meal.'}), 500

@app.route('/api/admin/meals/<int:meal_id>/attendance-details', methods=['GET'])
@admin_required
def get_meal_attendance_details(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404

        # Get all users who have an attendance record for this meal
        attendance_records = db.session.query(MealAttendance).options(
            joinedload(MealAttendance.user)
        ).filter_by(meal_id=meal_id).all()

        confirmed_attendees = []
        no_shows = []
        unconfirmed_attendees = []
        
        # Keep track of users with an attendance record
        users_with_attendance_record = set()

        for record in attendance_records:
            user_data = {
                'id': record.user.id,
                'name': record.user.name,
                'email': record.user.email,
            }
            users_with_attendance_record.add(record.user.id)

            if record.confirmed is True:
                confirmed_attendees.append(user_data)
            elif record.confirmed is False:
                no_shows.append(user_data)
            else: # record.confirmed is None
                unconfirmed_attendees.append(user_data)

        # Find users in this chapter who never marked themselves attending
        all_users = User.query.filter_by(chapter_id=meal.chapter_id).all()
        non_attendees = []
        for user in all_users:
            if user.id not in users_with_attendance_record:
                non_attendees.append({
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                })
        
        return jsonify({
            'meal': {
                'id': meal.id,
                'dish_name': meal.dish_name,
                'meal_date': meal.meal_date.isoformat(),
                'meal_type': meal.meal_type,
                'image_url': meal.image_url,
            },
            'confirmed_attendees': confirmed_attendees,
            'no_shows': no_shows,
            'unconfirmed_attendees': unconfirmed_attendees,
            'non_attendees': non_attendees,
            'confirmed_count': len(confirmed_attendees),
            'no_show_count': len(no_shows),
            'unconfirmed_count': len(unconfirmed_attendees),
            'non_attendee_count': len(non_attendees),
            'total_users': len(all_users),
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching meal attendance details for meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to fetch attendance details.'}), 500

@app.route('/api/meals/<int:meal_id>', methods=['PUT'])
@admin_required
def update_meal(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        image_url = meal.image_url  # preserve existing unless replaced
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                import uuid
                unique_filename = f"{uuid.uuid4()}-{secure_filename(file.filename)}"
                s3_image_url = upload_file_to_s3(file, unique_filename)
                if s3_image_url:
                    image_url = s3_image_url
                else:
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
    
@app.route('/api/meals/<int:meal_id>', methods=['DELETE'])
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
    
@app.route('/api/admin/attendance', methods=['GET'])
@admin_required
def get_all_attendance():
    try:
        attendance_records = db.session.query(MealAttendance).options(
            joinedload(MealAttendance.meal),
            joinedload(MealAttendance.user)
        ).join(Meal, MealAttendance.meal_id == Meal.id).filter(
            Meal.chapter_id == g.current_user.chapter_id
        ).order_by(MealAttendance.attendance_time.desc()).all()
        
        attendance_data = [{
            'id': record.id,
            'attended_at': record.attendance_time.isoformat(),
            'meal': { 'id': record.meal.id, 'dish_name': record.meal.dish_name, 'meal_date': record.meal.meal_date.isoformat() },
            'user': { 'id': record.user.id, 'name': record.user.name }
        } for record in attendance_records]
        return jsonify({'attendance': attendance_data}), 200
    except Exception as e:
        print(f"Error fetching all attendance: {e}")
        return jsonify({'error': 'Failed to fetch attendance.'}), 500

@app.route('/api/admin/reviews', methods=['GET'])
@owner_required
def get_all_reviews():
    try:
        reviews = db.session.query(Review).options(
            joinedload(Review.meal),
            joinedload(Review.user)
        ).join(Meal, Review.meal_id == Meal.id).filter(
            Meal.chapter_id == g.current_user.chapter_id
        ).order_by(Review.created_at.desc()).all()

        reviews_data = [{
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'hidden': review.hidden,
            'created_at': review.created_at.isoformat(),
            'meal': { 'id': review.meal.id, 'dish_name': review.meal.dish_name, 'meal_date': review.meal.meal_date.isoformat() },
            'user': { 'id': review.user.id, 'name': review.user.name }
        } for review in reviews]
        return jsonify({'reviews': reviews_data}), 200
    except Exception as e:
        print(f"Error fetching all reviews: {e}")
        return jsonify({'error': 'Failed to fetch reviews.'}), 500

@app.route('/api/admin/reviews/<int:review_id>/hide', methods=['PUT'])
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

@app.route('/api/admin/reviews/<int:review_id>', methods=['DELETE'])
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

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    try:
        users = User.query.filter_by(chapter_id=g.current_user.chapter_id).order_by(User.name).all()
        users_data = [{
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_admin': user.is_admin,
            'is_owner': user.is_owner,
            'created_at': user.created_at.isoformat(),
        } for user in users]
        return jsonify({'users': users_data}), 200
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({'error': 'Failed to fetch users.'}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@owner_required
def delete_user(user_id):
    try:
        user_to_delete = User.query.get(user_id)
        if not user_to_delete or user_to_delete.chapter_id != g.current_user.chapter_id:
            return jsonify({'error': 'User not found.'}), 404

        if user_to_delete.is_owner:
            return jsonify({'error': 'Cannot delete an owner.'}), 403

        db.session.delete(user_to_delete)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user {user_id}: {e}")
        return jsonify({'error': 'Failed to delete user.'}), 500

@app.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
@owner_required
def update_user_role(user_id):
    try:
        user_to_update = User.query.get(user_id)
        if not user_to_update or user_to_update.chapter_id != g.current_user.chapter_id:
            return jsonify({'error': 'User not found.'}), 404

        data = request.get_json(silent=True)
        is_admin = data.get('is_admin')

        if is_admin is None:
            return jsonify({'error': 'is_admin status is required.'}), 400
        
        if user_to_update.is_owner and is_admin is False:
            return jsonify({'error': 'Cannot demote an owner from admin status.'}), 403

        user_to_update.is_admin = is_admin
        db.session.commit()
        return jsonify({'message': 'User role updated successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user role for user {user_id}: {e}")
        return jsonify({'error': 'Failed to update user role.'}), 500

@app.route('/api/admin/late-plates/today', methods=['GET'])
@admin_required
def get_today_late_plates():
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        late_plates = db.session.query(LatePlate).options(
            joinedload(LatePlate.user),
            joinedload(LatePlate.meal)
        ).join(Meal, LatePlate.meal_id == Meal.id).filter(
            db.func.date(LatePlate.request_date) == today.date(),
            db.func.date(Meal.meal_date) >= today.date(),
            Meal.chapter_id == g.current_user.chapter_id
        ).order_by(LatePlate.request_time.desc()).all()

        late_plates_data = [{
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
        } for lp in late_plates]

        return jsonify({'late_plates': late_plates_data}), 200
    except Exception as e:
        print(f"Error fetching today's late plates: {e}")
        return jsonify({'error': 'Failed to fetch today\'s late plates.'}), 500

@app.route('/api/admin/late-plates/pending-count', methods=['GET'])
@admin_required
def get_pending_late_plate_count():
    try:
        today = datetime.now().date()
        count = db.session.query(func.count(LatePlate.id)).join(
            Meal, LatePlate.meal_id == Meal.id
        ).filter(
            LatePlate.status == 'pending',
            db.cast(LatePlate.request_date, db.Date) == today,
            Meal.chapter_id == g.current_user.chapter_id
        ).scalar() or 0
        return jsonify({'count': count}), 200
    except Exception as e:
        print(f"Error fetching pending late plate count: {e}")
        return jsonify({'error': 'Failed to fetch count.'}), 500

@app.route('/api/admin/late-plates/<int:late_plate_id>/status', methods=['PUT'])
@admin_required
def update_late_plate_status(late_plate_id):
    try:
        data = request.get_json(silent=True)
        new_status = data.get('status')
        if new_status not in ('pending', 'approved', 'denied'):
            return jsonify({'error': 'Invalid status. Must be pending, approved, or denied.'}), 400

        late_plate = LatePlate.query.get(late_plate_id)
        if not late_plate:
            return jsonify({'error': 'Late plate request not found.'}), 404

        late_plate.status = new_status
        db.session.commit()
        return jsonify({'message': f'Status updated to {new_status}.', 'status': new_status}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating late plate status {late_plate_id}: {e}")
        return jsonify({'error': 'Failed to update late plate status.'}), 500

@app.route('/api/recommendations', methods=['POST'])
@jwt_required
def submit_recommendation():
    try:
        data = request.get_json(silent=True)
        meal_name = data.get('meal_name')
        description = data.get('description')
        link = data.get('link')
        user_id = g.current_user.id

        if not meal_name:
            return jsonify({'error': 'Meal name is required.'}), 400
        
        new_recommendation = Recommendation(
            user_id=user_id,
            meal_name=meal_name,
            description=description,
            link=link
        )
        db.session.add(new_recommendation)
        db.session.commit()
        return jsonify({'message': 'Recommendation submitted successfully.', 'recommendation_id': new_recommendation.id}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting recommendation: {e}")
        return jsonify({'error': 'Failed to submit recommendation.'}), 500

@app.route('/api/admin/recommendations', methods=['GET'])
@admin_required
def get_all_recommendations():
    try:
        recommendations = db.session.query(Recommendation).options(
            joinedload(Recommendation.user)
        ).join(User, Recommendation.user_id == User.id).filter(
            User.chapter_id == g.current_user.chapter_id
        ).order_by(Recommendation.created_at.desc()).all()
        
        return recommendations_schema.jsonify(recommendations), 200
    except Exception as e:
        print(f"Error fetching recommendations: {e}")
        return jsonify({'error': 'Failed to fetch recommendations.'}), 500

@app.route('/api/admin/recommendations/<int:recommendation_id>', methods=['DELETE'])
@admin_required
def delete_recommendation(recommendation_id):
    try:
        recommendation = Recommendation.query.get(recommendation_id)
        if not recommendation:
            return jsonify({'error': 'Recommendation not found.'}), 404
        
        db.session.delete(recommendation)
        db.session.commit()
        return jsonify({'message': 'Recommendation deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting recommendation {recommendation_id}: {e}")
        return jsonify({'error': 'Failed to delete recommendation.'}), 500

@app.route('/api/admin/analytics', methods=['GET'])
@admin_required
def get_analytics():
    try:
        chapter_id = g.current_user.chapter_id

        total_users = User.query.filter_by(chapter_id=chapter_id).count()
        total_meals = Meal.query.filter_by(chapter_id=chapter_id).count()
        total_reviews = db.session.query(func.count(Review.id)).join(
            Meal, Review.meal_id == Meal.id
        ).filter(Meal.chapter_id == chapter_id).scalar() or 0
        total_late_plates = db.session.query(func.count(LatePlate.id)).join(
            Meal, LatePlate.meal_id == Meal.id
        ).filter(Meal.chapter_id == chapter_id).scalar() or 0
        overall_avg_rating = db.session.query(func.avg(Review.rating)).join(
            Meal, Review.meal_id == Meal.id
        ).filter(Meal.chapter_id == chapter_id).scalar()

        # Top 10 meals by attendance count
        att_sq = db.session.query(
            MealAttendance.meal_id,
            func.count(MealAttendance.id).label('att_count')
        ).group_by(MealAttendance.meal_id).subquery()

        top_attendance = db.session.query(Meal, att_sq.c.att_count).outerjoin(
            att_sq, Meal.id == att_sq.c.meal_id
        ).filter(
            att_sq.c.att_count.isnot(None),
            Meal.chapter_id == chapter_id
        ).order_by(desc(att_sq.c.att_count)).limit(10).all()

        popular_meals = [{
            'id': m.id, 'dish_name': m.dish_name, 'meal_type': m.meal_type,
            'meal_date': m.meal_date.isoformat(), 'attendance_count': cnt,
            'attendance_pct': round(cnt / total_users * 100, 1) if total_users > 0 else 0
        } for m, cnt in top_attendance]

        # Highest / lowest rated meals (min 1 review)
        rating_sq = db.session.query(
            Review.meal_id,
            func.avg(Review.rating).label('avg_rating'),
            func.count(Review.id).label('review_count')
        ).group_by(Review.meal_id).subquery()

        rated_meals = db.session.query(Meal, rating_sq.c.avg_rating, rating_sq.c.review_count).join(
            rating_sq, Meal.id == rating_sq.c.meal_id
        ).filter(
            rating_sq.c.review_count >= 1,
            Meal.chapter_id == chapter_id
        ).order_by(desc(rating_sq.c.avg_rating)).all()

        highest_rated = [{'id': m.id, 'dish_name': m.dish_name, 'meal_date': m.meal_date.isoformat(),
                          'avg_rating': round(float(avg), 2), 'review_count': cnt}
                         for m, avg, cnt in rated_meals[:5]]
        lowest_rated = [{'id': m.id, 'dish_name': m.dish_name, 'meal_date': m.meal_date.isoformat(),
                         'avg_rating': round(float(avg), 2), 'review_count': cnt}
                        for m, avg, cnt in rated_meals[-5:] if len(rated_meals) >= 5]

        # Weekly attendance trend (last 8 weeks)
        eight_weeks_ago = datetime.now() - timedelta(weeks=8)
        weekly = db.session.query(
            func.date_trunc('week', Meal.meal_date).label('week_start'),
            func.count(MealAttendance.id).label('total_att'),
            func.count(func.distinct(Meal.id)).label('meal_count')
        ).outerjoin(MealAttendance, Meal.id == MealAttendance.meal_id).filter(
            Meal.meal_date >= eight_weeks_ago,
            Meal.chapter_id == chapter_id
        ).group_by(func.date_trunc('week', Meal.meal_date)).order_by(
            func.date_trunc('week', Meal.meal_date)
        ).all()

        attendance_trend = [{
            'week_start': str(w)[:10] if w else None,
            'total_attendance': att,
            'meal_count': mc,
            'avg_per_meal': round(att / mc, 1) if mc > 0 else 0
        } for w, att, mc in weekly]

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

@app.route('/api/admin/settings', methods=['GET'])
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

@app.route('/api/admin/settings/access-code', methods=['PUT'])
@owner_required
def update_access_code():
    try:
        import secrets
        import string
        chapter = Chapter.query.get(g.current_user.chapter_id)
        if not chapter:
            return jsonify({'error': 'Chapter not found.'}), 404

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

@app.route('/api/verify-email', methods=['GET'])
def verify_email():
    token = request.args.get('token', '').strip()
    if not token:
        return jsonify({'error': 'Token is required.'}), 400

    pending = PendingRegistration.query.filter_by(token=token).first()
    if not pending:
        return jsonify({'error': 'Invalid or expired link.'}), 400

    if datetime.now(timezone.utc) > pending.token_expires:
        return jsonify({'error': 'Invalid or expired link.'}), 400

    try:
        new_user = User(
            email=pending.email,
            password_hash=pending.password_hash,
            name=f"{pending.first_name} {pending.last_name}",
            first_name=pending.first_name,
            last_name=pending.last_name,
            chapter_id=pending.chapter_id,
        )
        db.session.add(new_user)
        db.session.delete(pending)
        db.session.commit()
        return jsonify({'message': 'Email verified. You can now log in.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error creating user from pending registration: {e}")
        return jsonify({'error': 'Failed to create account.'}), 500


@app.route('/api/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required.'}), 400

    pending = PendingRegistration.query.filter_by(email=email).first()
    if not pending:
        return jsonify({'message': 'Verification email sent if that address is registered.'}), 200

    try:
        token = secrets.token_urlsafe(32)
        pending.token = token
        pending.token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        db.session.commit()
        send_verification_email(email, token)
    except Exception as e:
        db.session.rollback()
        print(f"Error resending verification: {e}")
        return jsonify({'error': 'Failed to resend verification email.'}), 500

    return jsonify({'message': 'Verification email sent.'}), 200


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()

    user = User.query.filter_by(email=email).first()
    if user:
        try:
            token = secrets.token_urlsafe(32)
            user.reset_token = token
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
            db.session.commit()
            send_reset_email(email, token)
        except Exception as e:
            db.session.rollback()
            print(f"Error sending reset email: {e}")

    return jsonify({'message': 'If that email exists, a reset link has been sent.'}), 200


@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = (data.get('token') or '').strip()
    password = (data.get('password') or '').strip()

    if not token or not password:
        return jsonify({'error': 'Token and password are required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired link.'}), 400
    if user.reset_token_expires and datetime.now(timezone.utc) > user.reset_token_expires:
        return jsonify({'error': 'Invalid or expired link.'}), 400

    user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()
    return jsonify({'message': 'Password reset successfully.'}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

@app.route('/api/meals/bulk', methods=['POST'])
@admin_required
def add_bulk_meals():
    try:
        print("--- Bulk Meal Request Received ---")
        print("Request form data:", request.form)
        
        meals_json = request.form.get('meals')
        if not meals_json:
            print("Error: 'meals' data not in form.")
            return jsonify({'error': 'Missing meals data in form.'}), 400
        
        print("Meals JSON string:", meals_json)
        meals_data = json.loads(meals_json)
        
        if not isinstance(meals_data, list):
            print("Error: Parsed meals data is not a list.")
            return jsonify({'error': 'Meals data must be a list.'}), 400

        chapter_id = g.current_user.chapter_id
        print(f"Processing {len(meals_data)} meals.")
        new_meals = []
        for i, meal_data in enumerate(meals_data):
            print(f"Processing meal {i+1}: {meal_data}")

            image_url = meal_data.get('image_url')
            file_key = f"image-{meal_data['id']}"

            if file_key in request.files:
                file = request.files[file_key]
                print(f"Found file for {file_key}: {file.filename}")
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    import uuid
                    unique_filename = f"{uuid.uuid4()}-{filename}"
                    s3_image_url = upload_file_to_s3(file, unique_filename)
                    if s3_image_url:
                        image_url = s3_image_url
                    else:
                        print(f"Error: Failed to upload image {filename} to S3 for meal {meal_data['id']}.")
                        return jsonify({'error': f'Failed to upload image {filename} to S3.'}), 500

            meal_date_obj = datetime.fromisoformat(meal_data['meal_date'])

            new_meal = Meal(
                meal_date=meal_date_obj,
                meal_type=meal_data['meal_type'],
                dish_name=meal_data['dish_name'],
                description=meal_data.get('description'),
                image_url=image_url,
                chapter_id=chapter_id
            )
            db.session.add(new_meal)
            new_meals.append(new_meal)

        print("Flushing to get meal IDs...")
        db.session.flush()

        print("Adding attendance records for chapter members...")
        all_users = User.query.filter_by(chapter_id=chapter_id).all()
        for meal in new_meals:
            for user in all_users:
                new_attendance = MealAttendance(meal_id=meal.id, user_id=user.id)
                db.session.add(new_attendance)

        print("Committing transaction...")
        db.session.commit()
        print("--- Bulk Meal Request Successful ---")
        return jsonify({'message': f'{len(new_meals)} meals added successfully.'}), 201

    except Exception as e:
        db.session.rollback()
        print(f"--- Error in add_bulk_meals ---")
        print(f"Exception type: {type(e)}")
        print(f"Exception args: {e.args}")
        print(f"Error adding bulk meals: {e}")
        return jsonify({'error': 'Failed to add bulk meals.'}), 500

@app.route('/api/meals/search', methods=['GET'])
@admin_required
def search_meals():
    try:
        query = request.args.get('q', '')
        if not query or len(query) < 2:
            return jsonify({'meals': []}), 200

        chapter_id = g.current_user.chapter_id

        # Subquery to get all dates for each dish_name
        dates_subquery = db.session.query(
            Meal.dish_name,
            db.func.array_agg(Meal.meal_date).label('all_dates')
        ).filter(
            Meal.dish_name.ilike(f'%{query}%'),
            Meal.chapter_id == chapter_id
        ).group_by(Meal.dish_name).subquery()

        # Main query to get the most recent meal for each dish_name
        sub = db.session.query(
            Meal.dish_name,
            db.func.max(Meal.meal_date).label('max_meal_date')
        ).filter(
            Meal.dish_name.ilike(f'%{query}%'),
            Meal.chapter_id == chapter_id
        ).group_by(Meal.dish_name).subquery()

        past_meals = db.session.query(Meal, dates_subquery.c.all_dates).join(
            sub,
            and_(Meal.dish_name == sub.c.dish_name, Meal.meal_date == sub.c.max_meal_date)
        ).join(
            dates_subquery, Meal.dish_name == dates_subquery.c.dish_name
        ).order_by(Meal.dish_name).limit(10).all()

        meals_data = []
        for meal, all_dates in past_meals:
            meals_data.append({
                'dish_name': meal.dish_name,
                'description': meal.description,
                'image_url': meal.image_url,
                'past_dates': sorted([d.isoformat() for d in all_dates], reverse=True)
            })
        
        return jsonify({'meals': meals_data}), 200

    except Exception as e:
        print(f"Error searching meals: {e}")
        return jsonify({'error': 'Failed to search meals.'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

def cleanup_old_late_plates():
    """Delete all late plate requests from before today."""
    with app.app_context():
        today = datetime.now().date()
        deleted = LatePlate.query.filter(LatePlate.request_date < today).delete()
        db.session.commit()
        print(f"[Cleanup] Deleted {deleted} late plate request(s) older than today.")

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_late_plates, 'cron', hour=0, minute=0)
scheduler.start()

@app.cli.command("make-admin")
@click.argument("email")
def make_admin(email):
    """Sets a user as an administrator."""
    user = User.query.filter_by(email=email).first()
    if user:
        user.is_admin = True
        db.session.commit()
        print(f"User {email} has been set as an admin.")
    else:
        print(f"User {email} not found.")

@app.cli.command("cleanup-late-plates")
def cleanup_late_plates_cmd():
    """Manually delete all late plate requests from before today."""
    cleanup_old_late_plates()

@app.cli.command("create-user")
@click.argument("email")
@click.argument("password")
@click.argument("first_name")
@click.argument("last_name")
@click.option("--access-code", default=None, help="Chapter access code")
@click.option("--admin", is_flag=True, default=False, help="Make user an admin")
@click.option("--owner", is_flag=True, default=False, help="Make user an owner")
def create_user(email, password, first_name, last_name, access_code, admin, owner):
    """Creates a verified user directly, bypassing email verification."""
    if User.query.filter_by(email=email).first():
        print(f"Error: a user with email {email} already exists.")
        return

    chapter_id = None
    if access_code:
        chapter = Chapter.query.filter_by(access_code=access_code).first()
        if not chapter:
            print(f"Error: no chapter found with access code '{access_code}'.")
            return
        chapter_id = chapter.id

    hashed = bcrypt.generate_password_hash(password).decode('utf-8')
    user = User(
        email=email,
        password_hash=hashed,
        name=f"{first_name} {last_name}",
        first_name=first_name,
        last_name=last_name,
        chapter_id=chapter_id,
        is_admin=admin or owner,
        is_owner=owner,
    )
    db.session.add(user)
    db.session.commit()
    role = "owner" if owner else ("admin" if admin else "member")
    print(f"Created user {email} ({first_name} {last_name}) as {role}" +
          (f" in chapter ID {chapter_id}" if chapter_id else "") + ".")


@app.cli.command("make-owner")
@click.argument("email")
def make_owner(email):
    """Sets a user as an owner."""
    user = User.query.filter_by(email=email).first()
    if user:
        user.is_owner = True
        db.session.commit()
        print(f"User {email} has been set as an owner.")
    else:
        print(f"User {email} not found.")

@app.cli.command("create-chapter")
@click.argument("name")
def create_chapter_cmd(name):
    """Creates a new chapter with an auto-generated access code."""
    import secrets
    import string
    existing = Chapter.query.filter_by(name=name).first()
    if existing:
        print(f"Chapter '{name}' already exists (ID {existing.id}, code: {existing.access_code}).")
        return
    alphabet = string.ascii_uppercase + string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(6))
    chapter = Chapter(name=name, access_code=code)
    db.session.add(chapter)
    db.session.commit()
    print(f"Chapter '{name}' created (ID {chapter.id}). Access code: {code}")

@app.cli.command("migrate-to-chapters")
def migrate_to_chapters():
    """Seeds a default chapter from HouseSettings and assigns all un-assigned users and meals."""
    import secrets
    import string
    # Get existing access code from HouseSettings if available
    setting = HouseSettings.query.filter_by(key='access_code').first()
    existing_code = setting.value if setting and setting.value else None
    if not existing_code:
        alphabet = string.ascii_uppercase + string.digits
        existing_code = ''.join(secrets.choice(alphabet) for _ in range(6))

    default_chapter = Chapter.query.filter_by(name='Default').first()
    if not default_chapter:
        default_chapter = Chapter(name='Default', access_code=existing_code)
        db.session.add(default_chapter)
        db.session.flush()
        print(f"Created 'Default' chapter (ID {default_chapter.id}, code: {existing_code})")
    else:
        print(f"'Default' chapter already exists (ID {default_chapter.id})")

    users_updated = User.query.filter_by(chapter_id=None).update({'chapter_id': default_chapter.id})
    print(f"Assigned {users_updated} user(s) to Default chapter")

    meals_updated = Meal.query.filter_by(chapter_id=None).update({'chapter_id': default_chapter.id})
    print(f"Assigned {meals_updated} meal(s) to Default chapter")

    db.session.commit()
    print("Migration complete!")