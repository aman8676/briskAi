from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class ORMModel(BaseModel):
    """Base schema for responses built from SQLAlchemy model instances."""

    model_config = ConfigDict(from_attributes=True)


# =========================
# USER / AUTH SCHEMAS
# =========================

class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: int
    username: str
    email: EmailStr
    is_verified: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# =========================
# DOCUMENT SCHEMAS
# =========================

class DocumentOut(ORMModel):
    id: int
    title: str
    source: str | None
    content: str | None
    created_at: datetime | None
    key_points: list[str] | None


class DocumentChunkOut(ORMModel):
    id: int
    document_id: int
    chunk_index: int
    content: str


class UploadDocumentOut(BaseModel):
    message: str
    document_id: int
    title: str
    chunk_count: int


# =========================
# CHAT / MESSAGE SCHEMAS
# =========================

class ChatOut(ORMModel):
    id: int
    user_id: int
    created_at: datetime | None
    updated_at: datetime | None


class MessageOut(ORMModel):
    id: int
    chat_id: int
    role: str
    content: str
    created_at: datetime | None


class ChatSummaryOut(BaseModel):
    """Response shape for a generated summary; it is not a database model yet."""

    chat_id: int
    summary: str
