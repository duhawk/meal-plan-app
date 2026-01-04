from database import db

print(" Loading models.py ")
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(150), nullable = False)
    first_name = db.Column(db.String(75), nullable=False)
    last_name = db.Column(db.String(75), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_owner = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.current_timestamp())
    """ fraternity_id = db.Column(db.Integer, db.ForeignKey('fraternities.id'), nullable=False)
 """

    reviews = db.relationship('Review', backref='user', lazy=True, cascade="all, delete-orphan")
    late_plates = db.relationship('LatePlate', backref='user', lazy=True, cascade="all, delete-orphan")
    eaten_meals = db.relationship('MealAttendance', backref='user', lazy=True, cascade='all, delete-orphan')
    def __repr__(self):
        return f'<User {self.email}>'
    
""" class fraternity(db.Model):
    __tablename__ = 'fraternities'
    id = db.Column(db.Integer, primary_key=True)
    fraterinity_name= db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.current_timestamp())
    access_code = db.Column(db.String(20), nullable=False, unique=True) """


class Meal(db.Model):
    __tablename__ = 'meals'
    id = db.Column(db.Integer, primary_key=True)
    meal_date = db.Column(db.DateTime, nullable=False)
    meal_type = db.Column(db.String(15), nullable=False)
    dish_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now())

    reviews = db.relationship('Review', backref='meal', lazy=True, cascade="all, delete-orphan")
    late_plates = db.relationship('LatePlate', backref='meal', lazy=True, cascade='all, delete-orphan')
    attendees = db.relationship('MealAttendance', backref='meal', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Meal {self.dish_name} on {self.meal_date}>'

class Review(db.Model):
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.Integer, db.ForeignKey('meals.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Float, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now())

    __table_args__ = (db.UniqueConstraint('user_id', 'meal_id', name='user_meal_review_uc'),)

    def __repr__(self):
        return f'<Review {self.id} by User {self.user_id} for Meal {self.meal_id}>'

class LatePlate(db.Model):
    __tablename__ = 'late_plates'
    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.Integer, db.ForeignKey('meals.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    request_time = db.Column(db.DateTime(timezone=True), default=db.func.now())
    status = db.Column(db.String(20), default='pending')  # pending, approved, denied
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (db.UniqueConstraint('user_id', 'meal_id', name='user_meal_late_plate_uc'),)

    def __repr__(self):
        return f'<LatePlate {self.id} by User {self.user_id}'

class MealAttendance(db.Model):
    __tablename__ = 'meal_attendance'
    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.Integer, db.ForeignKey('meals.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    attendance_time = db.Column(db.DateTime(timezone=True), default=db.func.now())
   
    __table_args__ = (db.UniqueConstraint('user_id', 'meal_id', name='user_meal_attendance_uc'),)

    def __repr__(self):
        return f'<MealAttendance {self.id} by User {self.user_id} for Meal {self.meal_id}>'

