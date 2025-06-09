
import os
from flask import Flask, request, jsonify, make_response
from dotenv import load_dotenv
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import jwt
from functools import wraps
from flask import g
from sqlalchemy import desc
from sqlalchemy.orm import joinedload
from flask_cors import CORS

load_dotenv()
  # Load environment variables from .env file
app = Flask(__name__)

CORS(
    app,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True
)

# Handle preflight OPTIONS requests
database_url = os.getenv('DATABASE_URL')
if database_url is None:
    raise RuntimeError("DATABASE_URL environment variable is not set!")

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database and bcrypt
from database import db
db.init_app(app)
bcrypt = Bcrypt(app)


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

from models import User, Meal, Review, LatePlate, MealAttendance

with app.app_context():
    try:
        db.create_all()
        print("Database tables created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    name = f"{first_name} {last_name}" if first_name and last_name else None

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400
    
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

    try:
        with app.app_context():
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
    
    with app.app_context():
        user = User.query.filter_by(email=email).first()

        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password.'}), 401
        
        expiration_time = datetime.now() + timedelta(hours=24)

        payload = {
            'user_id': user.id,
            'exp': expiration_time,
        }
        token = jwt.encode(payload, os.getenv('JWT_SECRET'), algorithm='HS256')
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,       
        }}), 200
    
@app.route('/api/menu', methods=['GET'])
@jwt_required
def get_weekly_menu():
    with app.app_context():
        try:
            meals = Meal.query.order_by(Meal.meal_date)
            meals_data = []
            for meal in meals:
                meals_data.append({
                    'id': meal.id,
                    'meal_date': meal.meal_date.isoformat(),
                    'meal_type': meal.meal_type,
                    'dish_name': meal.dish_name,
                    'description': meal.description,
                    'image_url': meal.image_url,
                    })
            return jsonify({'meals': meals_data}), 200
        except Exception as e:
            print(f"Error fetching meals: {e}")
            return jsonify({'error': 'Failed to fetch meals.'}), 500
        
@app.route('/api/meals', methods=['POST'])
@jwt_required
def add_meal():
    data = request.get_json() # Get JSON data sent from the frontend

     # Extract meal details from the request data
    meal_date = data.get('meal_date')
    meal_type = data.get('meal_type')
    dish_name = data.get('dish_name')
    description = data.get('description')
    image_url = data.get('image_url')
    # checking all required fields are present
    if not meal_date or not meal_type or not dish_name:
        return jsonify({'error': 'Meal date, type, and dish name are required.'}), 400
    
    #Converting meal_date string to date object
    try:
        meal_date = datetime.fromisoformat(meal_date)
    except ValueError:
        return jsonify({'error': 'Invalid meal date format. Use ISO format (YYYY-MM-DDTHH:MM:SS).'}), 400
    
    # Create a new Meal instance
    new_meal = Meal(
        meal_date=meal_date,
        meal_type=meal_type,
        dish_name=dish_name,
        description=description,
        image_url=image_url
    )

    try:
        with app.app_context(): # Get the app context to access the db
            db.session.add(new_meal)
            db.session.commit() # committing the new meal to the db
        return jsonify({'message': 'Meal added successfully.'}), 201
    except Exception as e:
        db.session.rollback() # undo any changes that may have been made 
        print(f"Error adding meal: {e}")
        return jsonify({'error': 'Failed to add meal.'}), 500
    
@app.route('/api/meals/<int:meal_id>/reviews', methods=['POST'])
@jwt_required
def submit_review(meal_id):
    data = request.get_json()
    rating = float(data.get('rating'))
    comment = data.get('comment')

    user_id = g.current_user.id #Getting the user login from the JWT
    if rating is None:
        return jsonify({'error': 'Rating is required.'}), 400
    if not (1.0 <= rating <= 5.0 and (rating * 2) % 1 == 0):
        return jsonify({'error': 'Rating must be between 1.0 and 5.0 in half star increments.'})
    
    try:
        with app.app_context():
            # checking if meal exists
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'}), 404
            
            #checking if the meal has already been reviewed by user
            existing_review = Review.query.filter_by(user_id=user_id, meal_id=meal_id).first()
            if existing_review:
                return jsonify({'error': 'You have already reviewed this meal.'}), 400
            
            #creating the new review
            new_review = Review(
                meal_id=meal_id,
                user_id=user_id,
                rating=rating,
                comment=comment
            )
            #adding the new review to database
            db.session.add(new_review)
            #check if the user has been marked as attending and if not set to attending
            existing_attendance = MealAttendance.query.filter_by(user_id=user_id, meal_id=meal_id).first()
            if not existing_attendance:
                new_attendance = MealAttendance(
                    meal_id=meal_id,
                    user_id=user_id
                )
                db.session.add(new_attendance)
            db.session.commit()
        return jsonify({'message': 'meal review created successfully ', 'review_id': new_review.id  }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting review: {e}")
        return jsonify({'error': 'Failed to submit review.'}), 500

@app.route('/api/meals/<int:meal_id>/late-plates', methods=['POST'])
@jwt_required
def request_late_plate(meal_id):
    data = request.get_json() # Get JSON data from frontend
    notes = data.get('notes') 

    user_id = g.current_user.id
    try:
        with app.app_context():
            # Check if meal exists
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'}), 404
            
            # Check if user has already requested a late plate for this meal
            existing_late_plate = LatePlate.query.filter_by(user_id=user_id, meal_id=meal_id).first()
            if existing_late_plate:
                return jsonify({'error': 'You have already requested a late plate for this meal.'}), 400
            
            # Create new late plate request
            new_late_plate = LatePlate(
                meal_id=meal_id,
                user_id=user_id,
                notes=notes,
                status='pending'
                  # Default status
            
            )
            db.session.add(new_late_plate)
            late_plate_id = new_late_plate.id
            db.session.commit()
        return jsonify({'message': 'Late plate request submitted successfully.', 'late_plate_id': late_plate_id}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error requesting late plate: {e}")
        return jsonify({'error': 'Failed to request late plate.'}), 500
    
@app.route('/api/meals/<int:meal_id>/attendance', methods=['POST'])
@jwt_required
def mark_attendance(meal_id):
    user_id = g.current_user.id
    try:
        with app.app_context():
            # Check if meal exists
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'}), 404
            
            # Check if user has already marked attendance for this meal
            existing_attendance = MealAttendance.query.filter_by(user_id=user_id, meal_id=meal_id).first()
            if existing_attendance:
                return jsonify({'error': 'You have already marked attendance for this meal.'}), 400
            
            # Create new attendance record
            new_attendance = MealAttendance(
                meal_id=meal_id,
                user_id=user_id
            )
            db.session.add(new_attendance)
            db.session.commit()
        return jsonify({'message': 'Attendance marked successfully.'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error marking attendance: {e}")
        return jsonify({'error': 'Failed to mark attendance.'}), 500
    
@app.route('/api/meals/<int:meal_id>/reviews', methods=['GET'])
@jwt_required
def get_meal_reviews(meal_id):
    try:
        with app.app_context():
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'}), 404
            
            reviews = Review.query.filter_by(meal_id=meal_id).order_by(Review.created_at.desc()).all()
            reviews_data = []
            for review in reviews:
                #for general display we dont wanna include the names 
                reviews_data.append({
                    'id': review.id,
                    'rating': review.rating,
                    'comment': review.comment,
                    'created_at': review.created_at.isoformat() # converts to date type
                })
            return jsonify({'reviews': reviews_data}), 200
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return jsonify({'error': 'Failed to fetch reviews.'}), 500

@app.route('/api/meals/<int:meal_id>/late-plates', methods=['GET'])
@jwt_required
def get_late_plates(meal_id):
    try:
        with app.app_context():
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'}), 404
            
            late_plates = db.session.query(LatePlate).options(
                joinedload(LatePlate.user), 
                # more efficient loading of user data since if done seperately it would result in N+1 queries where database is queried for each user 
                joinedload(LatePlate.meal)
                ).order_by(LatePlate.request_time.desc()).all()
            late_plates_data = []
            for lp in late_plates:
                late_plates_data.append({
                    'id': lp.id,
                    'user_id': lp.user_id,
                    'meal_id': lp.meal_id,
                    'request_time': lp.request_time.isoformat(),
                    'status': lp.status,
                    'notes': lp.notes,
                    'user_name': lp.user.name if lp.user else None,  # Include user name
                })
            return jsonify({'late_plates': late_plates_data}), 200
    except Exception as e:
        print(f"Error fetching late plates: {e}")
        return jsonify({'error': 'Failed to fetch late plates.'}), 500
    
@app.route('/api/meals/<int:meal_id>/attendance', methods=['GET'])
@jwt_required
def get_meal_attendance(meal_id):
    try:
        with app.app_context():
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'})
            # Collect attendance records for the meal including the user 
            attendance_records = db.session.query(MealAttendance).options(
                joinedload(MealAttendance.user)
            ).filter_by(meal_id=meal_id).all()

            attendance_count = len(attendance_records)
            attendance_list = []
            for record in attendance_records:
                attendance_list.append({
                    'user_id': record.user_id,
                    'user_name': record.user.name,
                    'user_email': record.user.email,
                    'attended_at': record.attendance_time.isoformat()

                })

            return jsonify({
                'meal_id': meal_id,
                'attendance_count': attendance_count,
                'attendance': attendance_list
            }), 200
    except Exception as e:
        print(f"Error fetching meal attendance: {e}")
        return jsonify({'error': 'Failed to fetch meal attendance.'}), 500
    
@app.route('/api/meals/<int:meal_id>', methods=['PUT'])
@jwt_required
def update_meal(meal_id):
    data = request.get_json()
    
    try:
        with app.app_context():
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'}), 404
            
            # Update meal details
            # adding the former value in case it is not changed so that none is not returned
            meal.meal_date = datetime.fromisoformat(data.get('meal_date', meal.meal_date.isoformat()))
            meal.meal_type = data.get('meal_type', meal.meal_type)
            meal.dish_name = data.get('dish_name', meal.dish_name)
            meal.description = data.get('description', meal.description)
            meal.image_url = data.get('image_url', meal.image_url)
            
            db.session.commit()
        return jsonify({'message': 'Meal updated successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to update meal.'}), 500
    
@app.route('/api/meals/<int:meal_id>', methods=['DELETE'])
@jwt_required
def delete_meal(meal_id):
    try:
        with app.app_context():
            meal = Meal.query.get(meal_id)
            if not meal:
                return jsonify({'error': 'Meal not found.'}), 404
            #deleting meal from database
            db.session.delete(meal)
            db.session.commit()
        return jsonify({'message': 'Meal deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting meal {meal_id}: {e}")
        return jsonify({'error': 'Failed to delete meal.'}), 500
    

    


        
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)