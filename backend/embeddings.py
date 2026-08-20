import ollama

EMBEDDING_MODEL = "nomic-embed-text"


def embed_text(text: str) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Cannot embed empty text")

    response = ollama.embeddings(
        model=EMBEDDING_MODEL,
        prompt=text,
    )
    return response["embedding"]


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    embeddings = []
    for i, chunk in enumerate(chunks):
        try:
            vector = embed_text(chunk)
            embeddings.append(vector)
        except Exception as e:
            print(f"Failed to embed chunk {i}: {e}")
            embeddings.append(None)
    return embeddings


def embed_key_points(key_points: list[str]) -> list[float] | None:
    if not key_points:
        return None

    combined_text = "\n".join(key_points)
    return embed_text(combined_text)