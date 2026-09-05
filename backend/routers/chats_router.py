import os
from groq import Groq

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from dependencies import get_current_user
from models.user import User
from models.chat import Chat
from models.message import Message
from models.document import Document
from models.associations import user_documents

from retrieval import (
    rewrite_query,
    retrieve_context_with_trace,
    is_broad_overview_query,
    retrieve_document_overview_context,
)
from history import load_recent_history
from summarize import get_available_model


router = APIRouter(prefix="/chat", tags=["chat"])

CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")
MAX_MESSAGE_LENGTH = 4000  # prevent abuse / runaway prompts


class ChatRequest(BaseModel):
    chat_id: int
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    document_id: int | None = None


@router.get("s")
def list_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's conversations for the frontend sidebar."""
    chats = (
        db.query(Chat)
        .filter(Chat.user_id == current_user.id)
        .order_by(Chat.updated_at.desc())
        .all()
    )
    return [{"chat_id": chat.id, "created_at": chat.created_at, "updated_at": chat.updated_at} for chat in chats]


@router.post("/new")
def create_chat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = Chat(user_id=current_user.id)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {"chat_id": chat.id, "created_at": chat.created_at}


@router.get("/{chat_id}/history")
def get_chat_history(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch full message history for a chat — useful for reloading a conversation in the UI."""
    chat_obj = (
        db.query(Chat)
        .filter(Chat.id == chat_id, Chat.user_id == current_user.id)
        .first()
    )
    if not chat_obj:
        raise HTTPException(status_code=404, detail="Chat not found")

    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [
        {"role": m.role, "content": m.content, "created_at": m.created_at}
        for m in messages
    ]


@router.delete("/{chat_id}")
def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete one conversation and all of its saved messages."""
    chat_obj = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat_obj:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat_obj)
    db.commit()
    return {"message": "Chat deleted"}


@router.delete("s")
def delete_all_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clear every saved conversation for the signed-in user."""
    chats = db.query(Chat).filter(Chat.user_id == current_user.id).all()
    for chat_obj in chats:
        db.delete(chat_obj)
    db.commit()
    return {"message": "Chat history cleared", "deleted_count": len(chats)}


@router.post("")
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 0. Verify chat exists and belongs to this user
    chat_obj = (
        db.query(Chat)
        .filter(Chat.id == payload.chat_id, Chat.user_id == current_user.id)
        .first()
    )
    if not chat_obj:
        raise HTTPException(status_code=404, detail="Chat not found")

    if payload.document_id is not None:
        owned_document = db.query(Document.id).join(user_documents).filter(
            Document.id == payload.document_id, user_documents.c.user_id == current_user.id
        ).first()
        if not owned_document:
            raise HTTPException(status_code=404, detail="Selected document was not found")

    # 1. Save user message
    user_msg = Message(chat_id=payload.chat_id, role="user", content=payload.message)
    db.add(user_msg)
    db.commit()

    # 2. Load recent history (includes the message we just saved)
    history = load_recent_history(payload.chat_id, db)

     # ============================================================
    # 3. QUERY REWRITING
    # ============================================================

    standalone_query = rewrite_query(
        payload.message,
        history[:-1]
    )


    # ============================================================
    # 4. CONTEXT RETRIEVAL
    #
    # Broad document questions:
    #   "summarize this document"
    #   "tell me about this doc"
    #   "what is this PPT about"
    #
    # use document-wide chunk sampling.
    #
    # Normal factual questions:
    #   query -> vector search -> reranking -> relevance check
    # ============================================================

    if is_broad_overview_query(payload.message) and payload.document_id is not None:

        context_text = retrieve_document_overview_context(
            user_id=current_user.id,
            db=db,
            document_id=payload.document_id,
            max_chunks=12,
        )

        is_relevant = bool(context_text)

        trace = {
            "query": payload.message,
            "original_query": payload.message,
            "rewritten_query": standalone_query,

            "document_id": payload.document_id,

            "vector_candidates": [],
            "reranked_chunks": [],

            "used_reranker": False,

            "relevant": is_relevant,

            "context_chunk_count": 12 if context_text else 0,

            "context_text": context_text,

            "reason": (
                "Broad document overview query detected. "
                "Representative chunks were selected from across "
                "the entire document instead of using vector search."
            ),
        }

    else:

        # Normal RAG pipeline
        #
        # Query
        #   ↓
        # Embedding
        #   ↓
        # Vector Search
        #   ↓
        # Reranking
        #   ↓
        # Relevance Check
        #   ↓
        # Context Writing

        context_text, is_relevant, trace = retrieve_context_with_trace(
            standalone_query,
            current_user.id,
            db,
            payload.document_id,
        )

        # Add these so frontend can display them
        trace["original_query"] = payload.message
        trace["rewritten_query"] = standalone_query
        trace["context_text"] = context_text
        if trace.get("reranked_chunks"):
            trace["source_documents"] = [
                {"document_id": item["document_id"], "document_title": item["document_title"]}
                for item in trace["reranked_chunks"]
            ]
            trace["source_file"] = trace["reranked_chunks"][0]["document_title"]
        elif trace.get("vector_candidates"):
            trace["source_documents"] = [
                {"document_id": item["document_id"], "document_title": item["document_title"]}
                for item in trace["vector_candidates"]
            ]
            trace["source_file"] = trace["vector_candidates"][0]["document_title"]
        else:
            trace["source_file"] = "Unknown"

    # 5. Build system prompt
    # ============================================================
    # 5. BUILD SYSTEM PROMPT
    # ============================================================

    if context_text:

        source_line = trace.get("source_file") or "unknown source"
        system_prompt = f"""You are a helpful assistant answering questions
about uploaded documents.

Use ONLY the DOCUMENT CONTEXT provided below.

For factual questions:
Answer directly using the information in the document context.

For questions asking for a summary, overview, explanation, or description
of the document:
Analyze the provided context and explain the main topics, important ideas,
sections, findings, numbers, and conclusions.

Do NOT expect the document to contain an exact sentence answering the user's
question. You should synthesize and summarize the information available
across multiple chunks.

If the information genuinely does not exist in the document context, clearly
say that you could not find it in the uploaded documents.

At the end of your answer, add a single line in this exact format:
Source document: {source_line}

Do not use outside knowledge.
Do not invent facts, numbers, or conclusions.

Answer strictly using the retrieved context. Do not add general knowledge, examples, techniques, numbers, or recommendations unless they are explicitly supported by the retrieved documents. If the retrieved context does not contain enough information, say that the information is not available in the provided documents. Prefer examples and terminology appearing directly in the retrieved context.

DOCUMENT CONTEXT:
{context_text}
"""
    else:
        system_prompt = (
            "A document is uploaded, but nothing in it was relevant enough "
            "to answer this question. Say clearly that you couldn't find "
            "the answer in the uploaded document. Do not answer from "
            "general knowledge or make up information."
        )

    messages = [{"role": "system", "content": system_prompt}] + history

    # 6. Stream response, with error handling around the LLM call itself
    def generate():
        full_response = ""
        try:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                err = "GROQ_API_KEY is not configured on the server. Please set it in your environment variables."
                yield err
                full_response += err
                return

            client = Groq(api_key=api_key)
            model_name = os.getenv("GROQ_CHAT_MODEL") or get_available_model(client)
            completion = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.3,
                max_tokens=2048,
                stream=True,
            )
            for chunk in completion:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_response += delta
                    yield delta

        except Exception as e:
            error_message = f"\n\n[An error occurred while generating the response: {e}]"
            print(f"[chat generate] Groq error: {e}")
            full_response += error_message
            yield error_message

        finally:
            # Always save whatever was generated, even a partial response on error
            if full_response.strip():
                assistant_msg = Message(
                    chat_id=payload.chat_id,
                    role="assistant",
                    content=full_response,
                )
                db.add(assistant_msg)
                db.commit()

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "X-RAG-Status": "grounded" if is_relevant else "no-relevant-context",
            "X-RAG-Context-Chunks": str(trace.get("context_chunk_count", 0)),
            "X-RAG-Reason": trace.get("reason", "")[:300],
        },
    )