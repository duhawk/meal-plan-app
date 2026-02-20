from database import db

print(" Loading models.py ")

class Chapter(db.Model):
    __tablename__ = 'chapters'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    access_code = db.Column(db.String(20), nullable=True, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.current_timestamp())

    users = db.relationship('User', backref='chapter', lazy=True)
    meals = db.relationship('Meal', backref='chapter', lazy=True)

    def __repr__(self):
        return f'<Chapter {self.name}>'


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    first_name = db.Column(db.String(75), nullable=False)
    last_name = db.Column(db.String(75), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_owner = db.Column(db.Boolean, default=False, nullable=False)
    chapter_id = db.Column(db.Integer, db.ForeignKey('chapters.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.current_timestamp())
    reset_token         = db.Column(db.String(64), nullable=True, unique=True)
    reset_token_expires = db.Column(db.DateTime(timezone=True), nullable=True)

    reviews = db.relationship('Review', backref='user', lazy=True, cascade="all, delete-orphan")
    late_plates = db.relationship('LatePlate', backref='user', lazy=True, cascade="all, delete-orphan")
    eaten_meals = db.relationship('MealAttendance', backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.email}>'


class Meal(db.Model):
    __tablename__ = 'meals'
    id = db.Column(db.Integer, primary_key=True)
    meal_date = db.Column(db.DateTime, nullable=False)
    meal_type = db.Column(db.String(15), nullable=False)
    dish_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(200), nullable=True)
    late_plate_hours_before = db.Column(db.Integer, nullable=True)
    chapter_id = db.Column(db.Integer, db.ForeignKey('chapters.id'), nullable=True)
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
    hidden = db.Column(db.Boolean, default=False, nullable=False)
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
    request_date = db.Column(db.Date, nullable=False, default=db.func.current_date())
    status = db.Column(db.String(20), default='pending')
    notes = db.Column(db.Text, nullable=True)
    pickup_time = db.Column(db.Time, nullable=True)

    __table_args__ = (db.UniqueConstraint('user_id', 'meal_id', 'request_date', name='user_meal_late_plate_date_uc'),)

    def __repr__(self):
        return f'<LatePlate {self.id} by User {self.user_id}'


class MealAttendance(db.Model):
    __tablename__ = 'meal_attendance'
    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.Integer, db.ForeignKey('meals.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    attendance_time = db.Column(db.DateTime(timezone=True), default=db.func.now())
    confirmed = db.Column(db.Boolean, nullable=True)

    __table_args__ = (db.UniqueConstraint('user_id', 'meal_id', name='user_meal_attendance_uc'),)

    def __repr__(self):
        return f'<MealAttendance {self.id} by User {self.user_id} for Meal {self.meal_id}>'


class Recommendation(db.Model):
    __tablename__ = 'recommendations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    meal_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    link = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=db.func.now())

    user = db.relationship('User', backref='recommendations', lazy=True)

    def __repr__(self):
        return f'<Recommendation {self.id} - {self.meal_name}>'


class HouseSettings(db.Model):
    __tablename__ = 'house_settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(200), nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), default=db.func.now(), onupdate=db.func.now())

    def __repr__(self):
        return f'<HouseSettings {self.key}={self.value}>'


class PendingRegistration(db.Model):
    __tablename__ = 'pending_registrations'
    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    first_name    = db.Column(db.String(75), nullable=False)
    last_name     = db.Column(db.String(75), nullable=False)
    chapter_id    = db.Column(db.Integer, db.ForeignKey('chapters.id'), nullable=True)
    token         = db.Column(db.String(64), unique=True, nullable=False)
    token_expires = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at    = db.Column(db.DateTime(timezone=True), default=db.func.now())

    def __repr__(self):
        return f'<PendingRegistration {self.email}>'
