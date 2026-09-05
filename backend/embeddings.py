import os
import requests
import warnings

# Suppress harmless warnings
warnings.filterwarnings("ignore", message=".*unauthenticated requests to the HF Hub.*")

def _get_gemini_api_key() -> str | None:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if key:
        key = key.strip().strip("'").strip('"')
    return key


def _embed_gemini_single(text: str, is_query: bool = False, api_key: str = "") -> list[float]:
    """
    Generate 768-D embeddings using Google Gemini's free text-embedding-004 model via REST API.
    Fast (takes ~100ms) and uses 0 MB of local CPU/RAM on Render.
    """
    url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }
    task_type = "RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT"
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": text.strip()}]},
        "taskType": task_type,
        "outputDimensionality": 768,
    }
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    if not response.ok:
        raise ValueError(f"Gemini API error {response.status_code}: {response.text}")
    data = response.json()
    return data["embedding"]["values"]


def _embed_gemini_batch(chunks: list[str], api_key: str = "") -> list[list[float]]:
    """
    Generate batch embeddings with Gemini text-embedding-004 in chunks of up to 50 items.
    """
    url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }
    results = []
    
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
        resp = requests.post(url, headers=headers, json={"requests": requests_list}, timeout=60)
        if not resp.ok:
            raise ValueError(f"Gemini Batch API error {resp.status_code}: {resp.text}")
        data = resp.json()
        for emb in data.get("embeddings", []):
            results.append(emb["values"])
            
    return results


def embed_text(text: str, is_query: bool = False) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    gemini_key = _get_gemini_api_key()
    if not gemini_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured. Please get a free API key starting with 'AIzaSy...' "
            "from https://aistudio.google.com/app/apikey and add it to Render's Environment tab."
        )

    return _embed_gemini_single(text, is_query=is_query, api_key=gemini_key)


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    if not chunks:
        return []

    gemini_key = _get_gemini_api_key()
    if not gemini_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured. Please get a free API key starting with 'AIzaSy...' "
            "from https://aistudio.google.com/app/apikey and add it to Render's Environment tab."
        )

    return _embed_gemini_batch(chunks, api_key=gemini_key)


def embed_key_points(key_points: list[str]) -> list[float] | None:
    if not key_points:
        return None

    combined_text = "\n".join(key_points)
    return embed_text(combined_text)