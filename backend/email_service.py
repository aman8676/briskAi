import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "no-reply@rag-studio.amanjalan.tech")
BACKEND_URL = os.getenv("BACKEND_URL", "https://rag-studio.amanjalan.tech").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://rag-studio.amanjalan.tech").rstrip("/")


def send_verification_email(to_email: str, token: str):
    verify_link = f"{BACKEND_URL}/auth/verify-email?token={token}"

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": "Verify your email",
        "html": f"""
            <h2>Welcome!</h2>
            <p>Click the link below to verify your email address:</p>
            <a href="{verify_link}">{verify_link}</a>
            <p>This link expires in 24 hours.</p>
        """,
    })


def send_password_reset_email(to_email: str, token: str):
    # The API endpoint is POST-only. Send people to the frontend, which reads
    # the token and submits their chosen password to that endpoint.
    reset_link = f"{FRONTEND_URL}/?reset_token={token}"

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": "Reset your password",
        "html": f"""
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="{reset_link}">{reset_link}</a>
            <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        """,
    })
