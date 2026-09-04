from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from database import Base
from models.associations import user_documents

EMBEDDING_DIMENSION = 768


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    source = Column(String, nullable=True)
    source_path = Column(String, nullable=True)
    index_markdown = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    key_points = Column(JSON, nullable=True)
    key_points_embedding = Column(Vector(EMBEDDING_DIMENSION), nullable=True)

    users = relationship(
        "User",
        secondary=user_documents,
        back_populates="documents"
    )

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan"
    )