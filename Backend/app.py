
import os
from flask import Flask, request, jsonify, make_response, send_from_directory
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
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

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
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
        "http://127.0.0.1:3000"
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

from models import User, Meal, Review, LatePlate, MealAttendance, Recommendation

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

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON.'}), 400

        email = data.get('email')
        password = data.get('password')
        first_name = data.get('firstName')
        last_name = data.get('lastName')
        
        if not email: return jsonify({'error': 'Email is required.'}), 400
        if not password: return jsonify({'error': 'Password is required.'}), 400
        if not first_name: return jsonify({'error': 'First name is required.'}), 400
        if not last_name: return jsonify({'error': 'Last name is required.'}), 400

        name = f"{first_name} {last_name}"
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists.'}), 400
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
       
        new_user = User(
            email=email,
            password_hash=hashed_password,
            name=name,
            first_name=first_name,
            last_name=last_name
        )

        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error registering user: {e}")
        return jsonify({'error': 'Failed to register user.'}), 500

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
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
        'is_admin': user.is_admin,
        'is_owner': user.is_owner
    }), 200
    
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
        
        user_attendance = {ma.meal_id for ma in MealAttendance.query.filter_by(user_id=user_id).all()}

        meals = db.session.query(
            Meal,
            attendance_subquery.c.attendance_count
        ).outerjoin(
            attendance_subquery, Meal.id == attendance_subquery.c.meal_id
        ).filter(db.func.date(Meal.meal_date) == today).order_by(Meal.meal_date).all()

        meals_data = []
        for meal, attendance_count in meals:
            meals_data.append({
                'id': meal.id,
                'meal_date': meal.meal_date.isoformat(),
                'meal_type': meal.meal_type,
                'dish_name': meal.dish_name,
                'description': meal.description,
                'image_url': meal.image_url,
                'is_attending': meal.id in user_attendance,
                'attendance_count': attendance_count or 0,
            })
        return jsonify({'meals': meals_data}), 200
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

        user_attendance = {ma.meal_id for ma in MealAttendance.query.filter_by(user_id=user_id).all()}
        print(f"User {user_id} attending meals: {user_attendance}")

        meals = db.session.query(
            Meal,
            attendance_subquery.c.attendance_count
        ).outerjoin(
            attendance_subquery, Meal.id == attendance_subquery.c.meal_id
        ).filter(Meal.meal_date >= start_of_week, Meal.meal_date <= end_of_week).order_by(Meal.meal_date).all()

        meals_data = []
        for meal, attendance_count in meals:
            meals_data.append({
                'id': meal.id,
                'meal_date': meal.meal_date.isoformat(),
                'meal_type': meal.meal_type,
                'dish_name': meal.dish_name,
                'description': meal.description,
                'image_url': meal.image_url,
                'is_attending': meal.id in user_attendance,
                'attendance_count': attendance_count or 0,
            })
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
        ).filter(Meal.meal_date < start_of_week).subquery() # Filter for previous week cycles

        # Main query to group by dish_name and aggregate data
        grouped_meals_data = db.session.query(
            all_meal_instances_subquery.c.dish_name,
            func.max(all_meal_instances_subquery.c.description).label('description'),
            func.max(all_meal_instances_subquery.c.image_url).label('image_url'),
            func.avg(all_meal_instances_subquery.c.attendance_for_date).label('average_attendance'),
            func.array_agg(
                func.jsonb_build_object(
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
                    {'date': datetime.fromisoformat(occ['date']), 'attendance': occ['attendance']}
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
            if file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_url = f"/uploads/{filename}"
        
        meal_date = request.form.get('meal_date')
        meal_type = request.form.get('meal_type')
        dish_name = request.form.get('dish_name')
        description = request.form.get('description')

        if not meal_date or not meal_type or not dish_name:
            return jsonify({'error': 'Meal date, type, and dish name are required.'}), 400
        
        meal_date_obj = datetime.fromisoformat(meal_date)
        
        new_meal = Meal(
            meal_date=meal_date_obj,
            meal_type=meal_type,
            dish_name=dish_name,
            description=description,
            image_url=image_url
        )
        db.session.add(new_meal)
        db.session.flush() # Flush to get the new_meal.id before commit

        # Mark all existing users as attending the new meal
        all_users = User.query.all()
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
    data = request.get_json()
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

@app.route('/api/meals/<int:meal_id>/late-plates', methods=['POST'])
@jwt_required
def request_late_plate(meal_id):
    data = request.get_json()
    notes = data.get('notes') 
    user_id = g.current_user.id
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        # Check if the meal date has already passed
        if meal.meal_date.date() < datetime.now().date():
            return jsonify({'error': 'Cannot request a late plate for a past meal.'}), 400
        
        today_date = datetime.now().date() # Get today's date
        existing_late_plate = LatePlate.query.filter_by(
            user_id=user_id, 
            meal_id=meal_id, 
            request_date=today_date # Filter by today's date
        ).first()
        
        if existing_late_plate:
            return jsonify({'error': 'You have already requested a late plate for this meal today.'}), 400
        
        new_late_plate = LatePlate(
            meal_id=meal_id, 
            user_id=user_id, 
            notes=notes, 
            status='pending',
            request_date=today_date # Set request_date
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

        all_users = User.query.all()
        attending_user_ids = {ma.user_id for ma in MealAttendance.query.filter_by(meal_id=meal_id).all()}

        attending_users = []
        not_attending_users = []

        for user in all_users:
            user_data = {
                'id': user.id,
                'name': user.name,
                'email': user.email,
            }
            if user.id in attending_user_ids:
                attending_users.append(user_data)
            else:
                not_attending_users.append(user_data)
        
        return jsonify({
            'meal': {
                'id': meal.id,
                'dish_name': meal.dish_name,
                'meal_date': meal.meal_date.isoformat(),
                'meal_type': meal.meal_type,
                'image_url': meal.image_url,
            },
            'attending_users': attending_users,
            'not_attending_users': not_attending_users,
            'attending_count': len(attending_users),
            'not_attending_count': len(not_attending_users),
            'total_users': len(all_users),
        }), 200
    except Exception as e:
        print(f"Error fetching meal attendance details for meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to fetch attendance details.'}), 500

@app.route('/api/meals/<int:meal_id>', methods=['PUT'])
@admin_required
def update_meal(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'error': 'Meal not found.'}), 404
        
        image_url = request.form.get('image_url')
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_url = f"/uploads/{filename}"

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
@admin_required
def get_all_reviews():
    try:
        reviews = db.session.query(Review).options(
            joinedload(Review.meal),
            joinedload(Review.user)
        ).order_by(Review.created_at.desc()).all()
        
        reviews_data = [{
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at.isoformat(),
            'meal': { 'id': review.meal.id, 'dish_name': review.meal.dish_name, 'meal_date': review.meal.meal_date.isoformat() },
            'user': { 'id': review.user.id, 'name': review.user.name }
        } for review in reviews]
        return jsonify({'reviews': reviews_data}), 200
    except Exception as e:
        print(f"Error fetching all reviews: {e}")
        return jsonify({'error': 'Failed to fetch reviews.'}), 500

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    try:
        users = User.query.order_by(User.name).all()
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
        if not user_to_delete:
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
        if not user_to_update:
            return jsonify({'error': 'User not found.'}), 404
        
        data = request.get_json()
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
        ).join(Meal).filter( # Explicitly join Meal table
            db.func.date(LatePlate.request_date) == today.date(), # Filter by today's request date
            db.func.date(Meal.meal_date) >= today.date() # Only show for meals on or after today
        ).order_by(LatePlate.request_time.desc()).all()

        late_plates_data = [{
            'id': lp.id,
            'user_id': lp.user_id,
            'user_name': lp.user.name if lp.user else 'Unknown User',
            'meal_id': lp.meal_id,
            'meal_dish_name': lp.meal.dish_name if lp.meal else 'Unknown Meal',
            'meal_date': lp.meal.meal_date.isoformat() if lp.meal else None,
            'request_time': lp.request_time.isoformat(),
            'status': lp.status,
            'notes': lp.notes,
        } for lp in late_plates]

        return jsonify({'late_plates': late_plates_data}), 200
    except Exception as e:
        print(f"Error fetching today's late plates: {e}")
        return jsonify({'error': 'Failed to fetch today\'s late plates.'}), 500

@app.route('/api/recommendations', methods=['POST'])
@jwt_required
def submit_recommendation():
    try:
        data = request.get_json()
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
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    image_url = f"/uploads/{filename}"
                    print(f"Saved file as {filename}, URL: {image_url}")

            meal_date_obj = datetime.fromisoformat(meal_data['meal_date'])
            
            new_meal = Meal(
                meal_date=meal_date_obj,
                meal_type=meal_data['meal_type'],
                dish_name=meal_data['dish_name'],
                description=meal_data.get('description'),
                image_url=image_url
            )
            db.session.add(new_meal)
            new_meals.append(new_meal)
        
        print("Flushing to get meal IDs...")
        db.session.flush()

        print("Adding attendance records for all users...")
        all_users = User.query.all()
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

        # Subquery to get all dates for each dish_name
        dates_subquery = db.session.query(
            Meal.dish_name,
            db.func.array_agg(Meal.meal_date).label('all_dates')
        ).filter(
            Meal.dish_name.ilike(f'%{query}%')
        ).group_by(Meal.dish_name).subquery()

        # Main query to get the most recent meal for each dish_name
        # and join with the dates subquery
        sub = db.session.query(
            Meal.dish_name,
            db.func.max(Meal.meal_date).label('max_meal_date')
        ).filter(
            Meal.dish_name.ilike(f'%{query}%')
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