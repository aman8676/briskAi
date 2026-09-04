from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os
import socket

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and "host.docker.internal" in DATABASE_URL:
    try:
        socket.gethostbyname("host.docker.internal")
    except socket.gaierror:
        DATABASE_URL = DATABASE_URL.replace("host.docker.internal", "localhost")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


class Base(DeclarativeBase):
    pass


def ensure_document_columns():
    """Add source tracking columns for existing databases created before the zip indexing feature."""
    try:
        inspector = inspect(engine)
        if not inspector.has_table("documents"):
            return
        existing_columns = {column["name"] for column in inspector.get_columns("documents")}
        with engine.begin() as conn:
            if "source_path" not in existing_columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN source_path VARCHAR"))
            if "index_markdown" not in existing_columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN index_markdown TEXT"))
    except Exception as exc:
        print(f"[database] column migration warning: {exc}")


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()