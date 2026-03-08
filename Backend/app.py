import os
import secrets
import string
from datetime import datetime
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from flask_marshmallow import Marshmallow
from dotenv import load_dotenv
import click

load_dotenv()

from database import db
from extensions import bcrypt

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
        "https://ordodining.com",
        "https://www.ordodining.com",
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True
)

db.init_app(app)
bcrypt.init_app(app)
Migrate(app, db)
Marshmallow(app)

from models import User, Meal, LatePlate, Chapter, HouseSettings

# ---------------------------------------------------------------------------
# Register blueprints
# ---------------------------------------------------------------------------
from routes.auth import auth_bp
from routes.meals import meals_bp
from routes.reviews import reviews_bp
from routes.attendance import attendance_bp
from routes.late_plates import late_plates_bp
from routes.weekly_presets import weekly_presets_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(meals_bp)
app.register_blueprint(reviews_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(late_plates_bp)
app.register_blueprint(weekly_presets_bp)
app.register_blueprint(admin_bp)


# ---------------------------------------------------------------------------
# Static file serving
# ---------------------------------------------------------------------------

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    return send_from_directory(uploads_dir, filename)


# ---------------------------------------------------------------------------
# Background scheduler
# ---------------------------------------------------------------------------

def cleanup_old_late_plates():
    """Delete all late plate requests from before today."""
    with app.app_context():
        today = datetime.now().date()
        deleted = LatePlate.query.filter(LatePlate.request_date < today).delete()
        db.session.commit()
        print(f"[Cleanup] Deleted {deleted} late plate request(s) older than today.")


from apscheduler.schedulers.background import BackgroundScheduler
scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_late_plates, 'cron', hour=0, minute=0)
scheduler.start()


# ---------------------------------------------------------------------------
# CLI commands
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
