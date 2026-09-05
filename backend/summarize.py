import os
from groq import Groq

SUMMARY_MODEL = os.getenv("GROQ_SUMMARY_MODEL", "llama-3.1-8b-instant")


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
            # Fallback if no key is configured: generate quick heuristic bullets
            lines = [line.strip() for line in excerpt.split("\n") if len(line.strip()) > 30]
            return lines[:max_points]

        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=SUMMARY_MODEL,
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