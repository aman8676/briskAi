from sqlalchemy.orm import Session

from extract import extract_text, UnsupportedFileTypeError
from cleaning import clean_text
from chunking import chunk_text
from metadata import extract_document_metadata
from embeddings import embed_chunks, embed_key_points

from models.document import Document
from models.document_chunk import DocumentChunk
from models.user import User


def ingest_file(file_path: str, user: User, db: Session) -> Document:
    """
    Full ingestion pipeline for a single file:
    extract -> clean -> metadata -> chunk -> embed -> save to Postgres, linked to `user`.

    Returns the created Document row.
    """
    # 1. Extract
    raw_text = extract_text(file_path)

    # 2. Clean
    cleaned_text = clean_text(raw_text)

    # 3. Metadata (includes key_points generation internally)
    meta = extract_document_metadata(file_path, text=cleaned_text)

    # 4. Chunk
    chunks = chunk_text(cleaned_text)
    if not chunks:
        raise ValueError(f"No chunks produced for file: {file_path}")

    # 5. Embed chunks
    chunk_embeddings = embed_chunks(chunks)

    # 6. Embed key_points summary
    kp_embedding = embed_key_points(meta.get("key_points", []))

    # 7. Create Document row
    document = Document(
        title=meta["title"],
        source=meta["source"],
        content=cleaned_text,
        key_points=meta.get("key_points"),
        key_points_embedding=kp_embedding,
    )
    db.add(document)
    db.flush()  # assigns document.id without fully committing yet

    # 8. Create DocumentChunk rows — skip any that failed to embed
    for i, (chunk_content, embedding) in enumerate(zip(chunks, chunk_embeddings)):
        if embedding is None:
            print(f"Skipping chunk {i} — embedding failed")
            continue

        db_chunk = DocumentChunk(
            document_id=document.id,
            chunk_index=i,
            content=chunk_content,
            embedding=embedding,
        )
        db.add(db_chunk)

    # 9. Link document to the user
    user.documents.append(document)

    # 10. Commit everything as one transaction
    db.commit()
    db.refresh(document)

    return document