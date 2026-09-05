import os
from groq import Groq

# Fallback candidate models in case specific models get deprecated by Groq
CANDIDATE_MODELS = [
    os.getenv("GROQ_SUMMARY_MODEL"),
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "mixtral-8x7b-32768",
]

_detected_model = None

def get_available_model(client: Groq) -> str:
    """Find the best currently active model on the Groq account."""
    global _detected_model
    if _detected_model:
        return _detected_model

    try:
        remote_models = [m.id for m in client.models.list().data]
        # Check candidates in order
        for candidate in CANDIDATE_MODELS:
            if candidate and candidate in remote_models:
                _detected_model = candidate
                return _detected_model

        # If none matched our list, pick the first available text chat model
        for m in remote_models:
            if not any(x in m for x in ["whisper", "tts", "orpheus", "guard", "vision"]):
                _detected_model = m
                return _detected_model

        if remote_models:
            _detected_model = remote_models[0]
            return _detected_model
    except Exception as e:
        print(f"[get_available_model] Warning: could not list models: {e}")

    # Fallback to configured model or gpt-oss-20b
    return os.getenv("GROQ_SUMMARY_MODEL") or "openai/gpt-oss-20b"


def generate_key_points(text: str, max_points: int = 5) -> list[str]:
    if not text or not text.strip():
        return []

    excerpt = text[:6000]

    prompt = (
        f"Read the following document text and extract the {max_points} most "
        f"important key points as a concise bulleted list. "
        f"Return ONLY the bullet points, one per line, no preamble, no numbering.\n\n"
        f"Document:\n{excerpt}"
    )

    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            lines = [line.strip() for line in excerpt.split("\n") if len(line.strip()) > 30]
            return lines[:max_points]

        client = Groq(api_key=api_key)
        model_name = get_available_model(client)

        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=512,
        )

        raw_output = response.choices[0].message.content.strip()

        points = [
            line.lstrip("-•* ").strip()
            for line in raw_output.split("\n")
            if line.strip()
        ]

        return points[:max_points]

    except Exception as e:
        print(f"[generate_key_points] Error: {e}")
        lines = [line.strip() for line in excerpt.split("\n") if len(line.strip()) > 30]
        return lines[:max_points]