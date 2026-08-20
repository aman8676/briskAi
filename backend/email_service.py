import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# Your registered Resend email address for local testing
TEST_EMAIL = "23052864@kiit.ac.in"


def send_verification_email(to_email: str, token: str):
    verify_link = f"{BACKEND_URL}/auth/verify-email?token={token}"

    # Override recipient for local testing if sending to another email
    recipient = to_email if to_email == TEST_EMAIL else TEST_EMAIL

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [recipient],
        "subject": "Verify your email",
        "html": f"""
            <h2>Welcome!</h2>
            <p><strong>[Testing Mode]</strong> Original Recipient: {to_email}</p>
            <p>Click the link below to verify your email address:</p>
            <a href="{verify_link}">{verify_link}</a>
            <p>This link expires in 24 hours.</p>
        """,
    })


def send_password_reset_email(to_email: str, token: str):
    # The API endpoint is POST-only. Send people to the frontend, which reads
    # the token and submits their chosen password to that endpoint.
    reset_link = f"{FRONTEND_URL}/?reset_token={token}"

    # Override recipient for local testing if sending to another email
    recipient = to_email if to_email == TEST_EMAIL else TEST_EMAIL

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": [recipient],
        "subject": "Reset your password",
        "html": f"""
            <h2>Password Reset Request</h2>
            <p><strong>[Testing Mode]</strong> Original Recipient: {to_email}</p>
            <p>Click the link below to reset your password:</p>
            <a href="{reset_link}">{reset_link}</a>
            <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        """,
    })
