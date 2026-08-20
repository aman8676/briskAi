import ollama

SUMMARY_MODEL = "llama3.2:1b"  # replace with your exact tag from `ollama list`


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

    response = ollama.chat(
        model=SUMMARY_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_output = response["message"]["content"].strip()

    points = [
        line.lstrip("-•* ").strip()
        for line in raw_output.split("\n")
        if line.strip()
    ]

    return points[:max_points]