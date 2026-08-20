import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.user import User
from ingestion import ingest_file
from extract import UnsupportedFileTypeError

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = "uploads"  # files saved here temporarily before processing


@router.post("")
def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Create a per-user folder so files don't collide between users
    user_folder = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_folder, exist_ok=True)

    # 2. Save the uploaded file to disk
    file_path = os.path.join(user_folder, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 3. Run the full ingestion pipeline (extract -> clean -> metadata -> chunk -> embed -> save)
    try:
        document = ingest_file(file_path, current_user, db)
    except UnsupportedFileTypeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    return {
        "message": "Document uploaded and processed successfully",
        "document_id": document.id,
        "title": document.title,
        "chunk_count": len(document.chunks),
    }