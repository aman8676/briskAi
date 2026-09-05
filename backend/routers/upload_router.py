import os
import shutil
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.associations import user_documents
from models.user import User
from models.document import Document
from ingestion import ingest_file, ingest_bundle
from extract import UnsupportedFileTypeError

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = "uploads"  # files saved here temporarily before processing

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".txt", ".md", ".json", ".csv", ".xlsx", ".pptx",
    ".html", ".htm", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"
}


@router.post("")
def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a single document or a ZIP file containing multiple documents.
    Supports: PDF, DOCX, TXT, MD, JSON, CSV, XLSX, PPTX, HTML, HTM, and images (JPG, PNG, GIF, BMP, TIFF, WEBP)
    For bulk uploads, upload a ZIP file with your documents.
    """
    # 1. Create a per-user folder so files don't collide between users
    user_folder = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_folder, exist_ok=True)

    # 2. Save the uploaded file to disk
    file_path = os.path.join(user_folder, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 3. Check if it's a ZIP file
    if file.filename.lower().endswith(".zip"):
        return _handle_bulk_upload(file_path, current_user, db, user_folder)
    else:
        # 4. Single file upload - Run the full ingestion pipeline
        return _handle_single_upload(file_path, current_user, db)


def _handle_single_upload(file_path: str, current_user: User, db: Session):
    """Handle a single file upload through the ingestion pipeline."""
    try:
        document = ingest_file(file_path, current_user, db, source_label=os.path.basename(file_path))
    except UnsupportedFileTypeError as e:
        print(f"Unsupported file type error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")
    finally:
        # Clean up the uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)

    index_dir = os.path.join(UPLOAD_DIR, str(current_user.id), "indexes")
    os.makedirs(index_dir, exist_ok=True)
    doc_relative = (document.source_path or document.source or document.title).replace('\\', '/')
    safe_name = doc_relative.replace('/', '__').replace('\\', '__')
    index_path = os.path.join(index_dir, f"{safe_name}.md")
    with open(index_path, "w", encoding="utf-8") as idx_file:
        idx_file.write(document.index_markdown or "# Document Index\n")

    return {
        "message": "Document uploaded and processed successfully",
        "document_id": document.id,
        "title": document.title,
        "source_path": document.source_path or document.source,
        "chunk_count": len(document.chunks),
    }


def _handle_bulk_upload(zip_path: str, current_user: User, db: Session, user_folder: str):
    """Handle bulk upload from a ZIP file representing one folder bundle."""
    extract_dir = os.path.join(user_folder, "extracted")
    os.makedirs(extract_dir, exist_ok=True)
    bundle_files = []
    failed_files = []
    bundle_name = Path(zip_path).stem

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        for root, _, filenames in os.walk(extract_dir):
            for filename in filenames:
                if filename.startswith('.'):
                    continue

                file_path = os.path.join(root, filename)
                file_ext = Path(filename).suffix.lower()
                if file_ext not in SUPPORTED_EXTENSIONS:
                    failed_files.append({
                        "filename": filename,
                        "reason": f"Unsupported file type: {file_ext}"
                    })
                    continue

                relative_path = os.path.relpath(file_path, extract_dir).replace('\\', '/')
                bundle_files.append((file_path, relative_path))

        if not bundle_files:
            raise HTTPException(
                status_code=400,
                detail=f"No valid documents found in ZIP. Failed: {failed_files}"
            )

        bundle_document = ingest_bundle(
            [file_path for file_path, _ in bundle_files],
            current_user,
            db,
            source_label=bundle_name,
            bundle_files=[relative_path for _, relative_path in bundle_files],
        )

        index_dir = os.path.join(UPLOAD_DIR, str(current_user.id), "indexes")
        os.makedirs(index_dir, exist_ok=True)
        safe_name = (bundle_document.source_path or bundle_document.source or bundle_name).replace('\\', '/').replace('/', '__')
        index_path = os.path.join(index_dir, f"{safe_name}.md")
        with open(index_path, "w", encoding="utf-8") as idx_file:
            idx_file.write(bundle_document.index_markdown or "# Document Index\n")

        return {
            "message": "Folder/ZIP uploaded and indexed as a single bundle",
            "document_id": bundle_document.id,
            "title": bundle_document.title,
            "source_path": bundle_document.source_path or bundle_document.source,
            "chunk_count": len(bundle_document.chunks),
            "file_count": len(bundle_files),
            "bundle_name": bundle_name,
            "failed_count": len(failed_files),
            "failed_files": failed_files if failed_files else None,
        }

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk ingestion failed: {e}")
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)