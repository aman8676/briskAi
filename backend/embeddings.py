import os
import requests
import warnings

# Suppress harmless warnings
warnings.filterwarnings("ignore", message=".*unauthenticated requests to the HF Hub.*")

_local_model = None

def _get_gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def _embed_gemini_single(text: str, is_query: bool = False, api_key: str = "") -> list[float]:
    """
    Generate 768-D embeddings using Google Gemini's free text-embedding-004 model via REST API.
    Fast (takes ~100ms) and uses 0 MB of local CPU/RAM on Render.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    task_type = "RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT"
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": text.strip()}]},
        "taskType": task_type,
        "outputDimensionality": 768,
    }
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    return data["embedding"]["values"]


def _embed_gemini_batch(chunks: list[str], api_key: str = "") -> list[list[float]]:
    """
    Generate batch embeddings with Gemini text-embedding-004 in chunks of up to 50 items.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={api_key}"
    results = []
    
    # Process in batches of 50 (Gemini batch limit is 100)
    batch_size = 50
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        requests_list = [
            {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": c.strip()}]},
                "taskType": "RETRIEVAL_DOCUMENT",
                "outputDimensionality": 768,
            }
            for c in batch
        ]
        resp = requests.post(url, json={"requests": requests_list}, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        for emb in data.get("embeddings", []):
            results.append(emb["values"])
            
    return results


def _get_local_model():
    """Fallback local SentenceTransformer if no GEMINI_API_KEY is provided."""
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")
        kwargs = {"trust_remote_code": True}
        if token:
            kwargs["token"] = token
        print("[embeddings] Loading local SentenceTransformer nomic-ai/nomic-embed-text-v1 fallback...")
        _local_model = SentenceTransformer("nomic-ai/nomic-embed-text-v1", **kwargs)
        print("[embeddings] Local SentenceTransformer loaded.")
    return _local_model


def embed_text(text: str, is_query: bool = False) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    gemini_key = _get_gemini_api_key()
    if gemini_key:
        try:
            return _embed_gemini_single(text, is_query=is_query, api_key=gemini_key)
        except Exception as e:
            print(f"[embeddings] Gemini embed error: {e}. Falling back to local SentenceTransformer...")

    # Fallback to local model
    prefix = "search_query: " if is_query else "search_document: "
    prefixed_text = f"{prefix}{text.strip()}"
    model = _get_local_model()
    return model.encode(prefixed_text, convert_to_numpy=True).tolist()


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    if not chunks:
        return []

    gemini_key = _get_gemini_api_key()
    if gemini_key:
        try:
            return _embed_gemini_batch(chunks, api_key=gemini_key)
        except Exception as e:
            print(f"[embeddings] Gemini batch embed error: {e}. Falling back to local SentenceTransformer...")

    # Fallback to local SentenceTransformer
    model = _get_local_model()
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