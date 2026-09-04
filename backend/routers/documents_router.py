from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.associations import user_documents
from models.document import Document
from models.document_chunk import DocumentChunk
from models.user import User

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_owned_document(document_id: int, user_id: int, db: Session) -> Document:
    document = (
        db.query(Document)
        .join(user_documents, user_documents.c.document_id == Document.id)
        .filter(Document.id == document_id, user_documents.c.user_id == user_id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("")
def list_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    documents = (
        db.query(Document)
        .join(user_documents, user_documents.c.document_id == Document.id)
        .filter(user_documents.c.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        {
            "id": document.id,
            "title": document.title,
            "source": document.source,
            "source_path": document.source_path or document.source,
            "created_at": document.created_at,
            "chunk_count": len(document.chunks),
        }
        for document in documents
    ]


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a document from the user's workspace and delete its data when unshared."""
    document = _get_owned_document(document_id, current_user.id, db)
    title = document.title

    db.execute(
        user_documents.delete().where(
            user_documents.c.user_id == current_user.id,
            user_documents.c.document_id == document.id,
        )
    )
    db.flush()

    remaining_users = (
        db.query(user_documents.c.user_id)
        .filter(user_documents.c.document_id == document.id)
        .count()
    )
    if remaining_users == 0:
        # The relationship cascade removes document_chunks (including embeddings).
        db.delete(document)

    db.commit()
    return {"message": f"Deleted '{title}'", "document_id": document_id}


@router.get("/{document_id}/chunks")
def get_top_chunks(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_owned_document(document_id, current_user.id, db)
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    return [{"id": chunk.id, "chunk_index": chunk.chunk_index, "content": chunk.content} for chunk in chunks]


@router.get("/{document_id}/metadata")
def get_metadata(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = _get_owned_document(document_id, current_user.id, db)
    return {
        "id": document.id,
        "title": document.title,
        "source": document.source,
        "source_path": document.source_path or document.source,
        "created_at": document.created_at,
        "key_points": document.key_points or [],
        "index_markdown": document.index_markdown,
    }


@router.get("/{document_id}/embeddings")
def get_embedding_preview(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_owned_document(document_id, current_user.id, db)
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .limit(5)
        .all()
    )
    return [
        {
            "id": chunk.id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "embedding_preview": list(chunk.embedding[:8]),
            "embedding_dimensions": len(chunk.embedding),
        }
        for chunk in chunks
    ]
