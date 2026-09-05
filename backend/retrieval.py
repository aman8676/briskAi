import os
import math

from sqlalchemy.orm import Session

from embeddings import embed_text
from models.document import Document
from models.document_chunk import DocumentChunk
from models.associations import user_documents


# ============================================================
# BROAD DOCUMENT / SUMMARY QUERY DETECTION
# ============================================================

SUMMARY_TRIGGERS = [
    "summarize", "summarise", "summary",
    "overview", "give me an overview",

    "what is this doc",
    "what is this document",
    "what's in this doc",
    "what is in this doc",

    "what's this document about",
    "what is this about",
    "what's this about",

    "tell me about this doc",
    "tell me about this document",
    "tell me about this ppt",
    "tell me about this file",
    "tell me about this presentation",

    "explain this doc",
    "explain this document",
    "explain this ppt",
    "explain this file",

    "walk me through this doc",
    "walk me through this document",

    "main points",
    "key points",
    "key terms",
    "key takeaways",

    "what does this document cover",
    "what does this doc cover",

    "what is in this ppt",
    "what's in this ppt",
    "this ppt about",
    "this presentation about",
]


def is_broad_overview_query(query: str) -> bool:
    """
    Detect questions asking for a summary or broad overview
    of the currently selected document.
    """
    q = query.lower().strip()

    return any(trigger in q for trigger in SUMMARY_TRIGGERS)


# ============================================================
# LOAD RERANKER MODEL (lazily, once on the first retrieval request)
# ============================================================

reranker = None

RELEVANCE_THRESHOLD = 0.5  # probability (0-1) after sigmoid, tune from real logs
VECTOR_SIMILARITY_THRESHOLD = 0.15


def get_reranker():
    """Avoid downloading/loading the reranker while FastAPI is starting."""
    global reranker
    if reranker is None:
        from sentence_transformers import CrossEncoder
        # Do not make a chat request wait for a Hugging Face download. The
        # caller catches a missing local model and uses vector ranking instead.
        reranker = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L-6-v2",
            local_files_only=True,
        )
    return reranker


# ============================================================
# 1. QUERY REWRITING
# ============================================================

def rewrite_query(query: str, history: list[dict]) -> str:
    """
    Converts a follow-up question into a standalone question,
    using recent chat history for context resolution.
    Falls back to the original query if rewriting fails.
    """
    if not history:
        return query

    try:
        messages = [
            {
                "role": "system",
                "content": """
Rewrite the user's latest question into a standalone question.

Use the conversation history only if necessary to understand
references such as: it, that, they, this, the previous topic.

Do not answer the question.

Return ONLY the rewritten standalone question.
"""
            }
        ]
        messages.extend(history)
        messages.append({"role": "user", "content": query})

        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            return query

        from groq import Groq
        from summarize import get_available_model
        client = Groq(api_key=groq_api_key)
        model_name = os.getenv("GROQ_REWRITE_MODEL") or get_available_model(client)
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0,
            max_tokens=256,
        )

        rewritten_query = response.choices[0].message.content.strip()
        return rewritten_query if rewritten_query else query

    except Exception as e:
        print(f"[rewrite_query] error: {e}")
        return query


# ============================================================
# 2. VECTOR RETRIEVAL (correct many-to-many ownership join)
# ============================================================

def retrieve_chunks(
    query_embedding,
    user_id: int,
    db: Session,
    top_k: int = 10,
    document_id: int | None = None,
):
    """
    Retrieve document chunks belonging only to the current user.
    Ownership is many-to-many via user_documents, not a direct
    user_id column on Document — so we join through that table.
    """
    try:
        query = (
            db.query(
                DocumentChunk,
                DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
            )
            .join(Document, DocumentChunk.document_id == Document.id)
            .join(user_documents, user_documents.c.document_id == Document.id)
            .filter(user_documents.c.user_id == user_id)
        )
        if document_id is not None:
            query = query.filter(Document.id == document_id)
        chunks = (
            query
            .order_by("distance")
            .limit(top_k)
            .all()
        )
        return chunks
    except Exception as e:
        print(f"[retrieve_chunks] error: {e}")
        return []


# ============================================================
# DOCUMENT OVERVIEW RETRIEVAL
# ============================================================

def retrieve_document_overview_context(
    user_id: int,
    db: Session,
    document_id: int,
    max_chunks: int = 12,
) -> str:
    """
    Retrieve representative chunks from across the entire document.

    Used for queries such as:
    - summarize this document
    - tell me about this doc
    - what is this PPT about

    Normal vector search is not ideal for these questions because
    words like 'summarize' may not match the actual document content.
    """

    chunks = (
        db.query(DocumentChunk)
        .join(
            Document,
            DocumentChunk.document_id == Document.id
        )
        .join(
            user_documents,
            user_documents.c.document_id == Document.id
        )
        .filter(
            user_documents.c.user_id == user_id,
            Document.id == document_id,
        )
        .order_by(DocumentChunk.chunk_index)
        .all()
    )

    if not chunks:
        return ""

    # If the document has fewer chunks than the limit,
    # simply use all of them.
    if len(chunks) <= max_chunks:
        selected_chunks = chunks

    else:
        # Select chunks distributed across the entire document.
        step = len(chunks) / max_chunks

        indexes = sorted(
            {
                int(i * step)
                for i in range(max_chunks)
            }
        )

        selected_chunks = [
            chunks[i]
            for i in indexes
        ]

    context_parts = []

    for chunk in selected_chunks:
        context_parts.append(chunk.content)

    return "\n\n---\n\n".join(context_parts)

# ============================================================
# 3. RERANK CHUNKS
# ============================================================

def rerank_chunks(query: str, chunks, top_k: int = 5):
    """
    Uses a CrossEncoder to rerank retrieved chunks by true relevance
    to the query. The raw model output is an unbounded logit, so it's
    squashed through a sigmoid to give a 0-1 relevance probability —
    that's what makes RELEVANCE_THRESHOLD meaningful.
    """
    if not chunks:
        return []

    pairs = [(query, chunk.content) for chunk, _distance in chunks]
    raw_scores = get_reranker().predict(pairs)
    scores = [1 / (1 + math.exp(-float(s))) for s in raw_scores]  # logit -> [0,1]
    ranked_chunks = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
    return ranked_chunks[:top_k]


# ============================================================
# 4. RELEVANCE CHECK
# ============================================================

def check_relevance(ranked_chunks, threshold: float = RELEVANCE_THRESHOLD, used_reranker: bool = True) -> bool:
    """
    Checks whether the best-ranked chunk is relevant enough to use as context.
    """
    if not ranked_chunks:
        return False

    best_score = float(ranked_chunks[0][1])
    if used_reranker:
        print(f"[check_relevance] reranker score: {best_score:.4f} (threshold: {threshold})")
        return best_score >= threshold

    # A reranker model may be unavailable on a fresh/offline installation. In
    # that case keep the already-retrieved vector results instead of silently
    # treating every uploaded document as irrelevant.
    print(f"[check_relevance] vector similarity: {best_score:.4f} (threshold: {VECTOR_SIMILARITY_THRESHOLD})")
    return best_score >= VECTOR_SIMILARITY_THRESHOLD


# ============================================================
# 5. BUILD CONTEXT
# ============================================================

def build_context(ranked_chunks) -> str:
    """Combines the top reranked chunks into one context string."""
    context_parts = []
    for item, score in ranked_chunks:
        chunk, distance = item
        context_parts.append(chunk.content)

    return "\n\n---\n\n".join(context_parts)


# ============================================================
# 6. COMPLETE RETRIEVAL PIPELINE
# ============================================================

def retrieve_context_with_trace(
    query: str, user_id: int, db: Session, document_id: int | None = None
) -> tuple[str, bool, dict]:
    """
    Full retrieval pipeline:
    query -> embedding -> vector search -> rerank -> relevance check -> context

    Returns (context_text, is_relevant, trace). Never raises — any internal
    failure degrades gracefully to ("", False), so the caller can
    fall back to a plain chat answer.
    """
    trace = {
        "query": query,
        "rewritten_query": query,
        "document_id": document_id,
        "vector_candidates": [],
        "reranked_chunks": [],
        "used_reranker": False,
        "relevant": False,
        "reason": "",
    }
    if not query or not query.strip():
        trace["reason"] = "The question is empty."
        return "", False, trace

    try:
        query_embedding = embed_text(query)
    except Exception as e:
        print(f"[retrieve_context] embedding failed: {e}")
        trace["reason"] = f"Query embedding failed: {e}"
        return "", False, trace

    chunks = retrieve_chunks(query_embedding, user_id, db, top_k=10, document_id=document_id)
    if not chunks:
        trace["reason"] = "No chunks belonging to this user were returned by vector search."
        return "", False, trace
    trace["vector_candidates"] = [
        {
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "document_title": chunk.document.title,
            "chunk_index": chunk.chunk_index,
            "similarity": round(1 - float(distance), 4),
            "preview": chunk.content[:180],
            "content": chunk.content,
        }
        for chunk, distance in chunks
    ]

    try:
        ranked_chunks = rerank_chunks(query, chunks, top_k=5)
        used_reranker = True
    except Exception as e:
        print(f"[rerank_chunks] error; using vector order: {e}")
        ranked_chunks = [((chunk, distance), 1 - float(distance)) for chunk, distance in chunks[:5]]
        used_reranker = False
        trace["reranker_warning"] = f"Reranker unavailable; vector similarity was used instead: {e}"

    trace["used_reranker"] = used_reranker
    trace["reranked_chunks"] = [
        {
            "chunk_id": item[0].id,
            "document_id": item[0].document_id,
            "document_title": item[0].document.title,
            "chunk_index": item[0].chunk_index,
            "score": round(float(score), 4),
            "preview": item[0].content[:180],
            "content": item[0].content,
        }
        for (item, score) in ranked_chunks
    ]

    if not check_relevance(ranked_chunks, used_reranker=used_reranker):
        trace["reason"] = "The best retrieved chunk did not pass the relevance threshold."
        return "", False, trace

    context_text = build_context(ranked_chunks)

    trace["relevant"] = True
    trace["context_chunk_count"] = len(ranked_chunks)

    # This is the exact context sent to the LLM.
    # Your frontend can display this in the retrieval pipeline.
    trace["context_text"] = context_text

    trace["reason"] = (
    "Relevant chunks were selected, reranked, "
    "and combined into the final context."
    )
    return context_text, True, trace


def retrieve_context(query: str, user_id: int, db: Session, document_id: int | None = None) -> tuple[str, bool]:
    """Backward-compatible retrieval entry point for callers that only need context."""
    context, is_relevant, _trace = retrieve_context_with_trace(query, user_id, db, document_id)
    return context, is_relevant