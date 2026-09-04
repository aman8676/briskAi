from pathlib import Path

from sqlalchemy.orm import Session

from extract import extract_text, UnsupportedFileTypeError
from cleaning import clean_text
from chunking import chunk_text
from metadata import extract_document_metadata
from embeddings import embed_chunks, embed_key_points

from models.document import Document
from models.document_chunk import DocumentChunk
from models.user import User


def ingest_file(file_path: str, user: User, db: Session, source_label: str | None = None) -> Document:
    """
    Full ingestion pipeline for a single file:
    extract -> clean -> metadata -> chunk -> embed -> save to Postgres, linked to `user`.

    Returns the created Document row.
    """
    raw_text = extract_text(file_path)
    cleaned_text = clean_text(raw_text)
    meta = extract_document_metadata(file_path, text=cleaned_text, source_label=source_label)

    chunks = chunk_text(cleaned_text)
    if not chunks:
        raise ValueError(f"No chunks produced for file: {file_path}")

    chunk_embeddings = embed_chunks(chunks)
    kp_embedding = embed_key_points(meta.get("key_points", []))

    document = Document(
        title=meta["title"],
        source=meta["source"],
        source_path=meta.get("source_path"),
        index_markdown=meta.get("index_markdown"),
        content=cleaned_text,
        key_points=meta.get("key_points"),
        key_points_embedding=kp_embedding,
    )
    db.add(document)
    db.flush()

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

    user.documents.append(document)
    db.commit()
    db.refresh(document)

    return document


def ingest_bundle(
    file_paths: list[str],
    user: User,
    db: Session,
    source_label: str | None = None,
    bundle_files: list[str] | None = None,
) -> Document:
    """Create a single document representing a folder or ZIP bundle."""
    if not file_paths:
        raise ValueError("No files provided for bundle ingestion")

    bundle_labels = bundle_files or [Path(path).name for path in file_paths]
    cleaned_parts = []

    for file_path, display_name in zip(file_paths, bundle_labels):
        try:
            raw_text = extract_text(file_path)
        except UnsupportedFileTypeError:
            continue

        cleaned_text = clean_text(raw_text)
        if not cleaned_text.strip():
            continue

        cleaned_parts.append(f"--- File: {display_name} ---\n{cleaned_text}")

    if not cleaned_parts:
        raise ValueError("No valid text content found in the uploaded bundle")

    combined_text = "\n\n".join(cleaned_parts)
    chunks = chunk_text(combined_text)
    if not chunks:
        raise ValueError("No chunks produced for the uploaded bundle")

    meta = extract_document_metadata(
        file_path=source_label or (bundle_labels[0] if bundle_labels else "bundle"),
        text=combined_text,
        source_label=source_label,
        bundle_files=bundle_labels,
    )

    chunk_embeddings = embed_chunks(chunks)
    kp_embedding = embed_key_points(meta.get("key_points", []))

    document = Document(
        title=meta["title"],
        source=meta["source"],
        source_path=meta.get("source_path"),
        index_markdown=meta.get("index_markdown"),
        content=combined_text,
        key_points=meta.get("key_points"),
        key_points_embedding=kp_embedding,
    )
    db.add(document)
    db.flush()

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

    user.documents.append(document)
    db.commit()
    db.refresh(document)
    return document