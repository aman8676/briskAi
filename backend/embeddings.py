import os
from sentence_transformers import SentenceTransformer

# Load model locally via sentence-transformers (exact same 768-D vectors as nomic-embed-text)
# Initialized lazily to avoid startup delays
_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("nomic-ai/nomic-embed-text-v1", trust_remote_code=True)
    return _model


def embed_text(text: str, is_query: bool = False) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    # Nomic embed text uses prefixes for optimal performance:
    # "search_query: " for queries, "search_document: " for documents
    prefix = "search_query: " if is_query else "search_document: "
    prefixed_text = f"{prefix}{text.strip()}"

    model = get_model()
    embedding = model.encode(prefixed_text, convert_to_numpy=True)
    return embedding.tolist()


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    if not chunks:
        return []

    model = get_model()
    prefixed_chunks = [f"search_document: {c.strip()}" for c in chunks]
    try:
        embeddings = model.encode(prefixed_chunks, convert_to_numpy=True, batch_size=32)
        return [emb.tolist() for emb in embeddings]
    except Exception as e:
        print(f"Batch embedding error: {e}, falling back to per-chunk...")
        results = []
        for i, chunk in enumerate(chunks):
            try:
                results.append(embed_text(chunk))
            except Exception as ce:
                print(f"Failed to embed chunk {i}: {ce}")
                results.append(None)
        return results


def embed_key_points(key_points: list[str]) -> list[float] | None:
    if not key_points:
        return None

    combined_text = "\n".join(key_points)
    return embed_text(combined_text)