from sqlalchemy.orm import Session
from models.message import Message

HISTORY_LIMIT = 10


def load_recent_history(chat_id: int, db: Session, limit: int = HISTORY_LIMIT) -> list[dict]:
    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    messages.reverse()  # oldest -> newest, for correct conversational order
    return [{"role": m.role, "content": m.content} for m in messages]