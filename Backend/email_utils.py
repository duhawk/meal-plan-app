import resend
import os

FROM_EMAIL = 'Ordo <noreply@ordodining.com>'


def _init():
    resend.api_key = os.getenv('RESEND_API_KEY')
    return os.getenv('FRONTEND_URL', 'http://localhost:5173')


def send_verification_email(to_email, token):
    frontend_url = _init()
    link = f"{frontend_url}/verify-email?token={token}"
    resend.Emails.send({
        'from': FROM_EMAIL,
        'to': to_email,
        'subject': 'Verify your Ordo email',
        'html': (
            f'<p>Click the link below to verify your email address (expires in 24 hours):</p>'
            f'<p><a href="{link}">{link}</a></p>'
        ),
    })


def send_reset_email(to_email, token):
    frontend_url = _init()
    link = f"{frontend_url}/reset-password?token={token}"
    resend.Emails.send({
        'from': FROM_EMAIL,
        'to': to_email,
        'subject': 'Reset your Ordo password',
        'html': (
            f'<p>Click the link below to reset your password (expires in 1 hour):</p>'
            f'<p><a href="{link}">{link}</a></p>'
        ),
    })
