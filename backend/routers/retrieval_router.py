from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.user import User
from models.associations import user_documents
from models.document import Document
from models.chat import Chat
from retrieval import rewrite_query, retrieve_context_with_trace
from history import load_recent_history

router = APIRouter(prefix="/retrieval", tags=["retrieval"])


class RetrievalInspectRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    document_id: int | None = None
    chat_id: int | None = None


@router.post("/inspect")
def inspect_retrieval(
    payload: RetrievalInspectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run the same retrieval path as chat, returning safe diagnostic detail."""
    if payload.document_id is not None:
        owned = db.query(Document.id).join(user_documents).filter(
            Document.id == payload.document_id, user_documents.c.user_id == current_user.id
        ).first()
        if not owned:
            raise HTTPException(status_code=404, detail="Selected document was not found")

    history = []
    if payload.chat_id is not None:
        chat_obj = db.query(Chat.id).filter(
            Chat.id == payload.chat_id, Chat.user_id == current_user.id
        ).first()
        if not chat_obj:
            raise HTTPException(status_code=404, detail="Chat not found")
        history = load_recent_history(payload.chat_id, db)

    standalone_query = rewrite_query(payload.question, history)

    _context, _relevant, trace = retrieve_context_with_trace(
        standalone_query, current_user.id, db, payload.document_id
    )
    trace["original_query"] = payload.question
    trace["rewritten_query"] = standalone_query
    return trace