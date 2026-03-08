import os
import secrets
import jwt
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g

from database import db
from extensions import bcrypt
from models import User, Chapter, PendingRegistration
from helpers import jwt_required
from email_utils import send_verification_email, send_reset_email

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON.'}), 400

        email = (data.get('email') or '').strip().lower()
        password = data.get('password')
        first_name = data.get('firstName')
        last_name = data.get('lastName')

        if not email:      return jsonify({'error': 'Email is required.'}), 400
        if not password:   return jsonify({'error': 'Password is required.'}), 400
        if not first_name: return jsonify({'error': 'First name is required.'}), 400
        if not last_name:  return jsonify({'error': 'Last name is required.'}), 400

        submitted_code = (data.get('access_code') or '').strip()
        chapter = Chapter.query.filter_by(access_code=submitted_code).first() if submitted_code else None
        if not chapter:
            if Chapter.query.count() > 0:
                return jsonify({'error': 'Invalid access code.'}), 403
            chapter_id = None
        else:
            chapter_id = chapter.id

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists.'}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        token = secrets.token_urlsafe(32)

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


@auth_bp.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json(silent=True)
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    payload = {'user_id': user.id, 'exp': datetime.now() + timedelta(hours=24)}
    token = jwt.encode(payload, os.getenv('JWT_SECRET'), algorithm='HS256')
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {'id': user.id, 'email': user.email, 'name': user.name,
                 'is_admin': user.is_admin, 'is_owner': user.is_owner},
    }), 200


@auth_bp.route('/api/me', methods=['GET'])
@jwt_required
def get_me():
    user = g.current_user
    return jsonify({
        'id': user.id, 'email': user.email, 'name': user.name,
        'first_name': user.first_name, 'last_name': user.last_name,
        'is_admin': user.is_admin, 'is_owner': user.is_owner,
    }), 200


@auth_bp.route('/api/me', methods=['PUT'])
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
                'id': user.id, 'email': user.email, 'name': user.name,
                'first_name': user.first_name, 'last_name': user.last_name,
                'is_admin': user.is_admin, 'is_owner': user.is_owner,
            },
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user profile: {e}")
        return jsonify({'error': 'Failed to update profile.'}), 500


@auth_bp.route('/api/verify-email', methods=['GET'])
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


@auth_bp.route('/api/resend-verification', methods=['POST'])
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


@auth_bp.route('/api/forgot-password', methods=['POST'])
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


@auth_bp.route('/api/reset-password', methods=['POST'])
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
