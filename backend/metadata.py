from datetime import datetime, timezone
from pathlib import Path

from summarize import generate_key_points


def extract_document_metadata(file_path: str, text: str = "") -> dict:
    path = Path(file_path)
    stat = path.stat()

    metadata = {
        "title": path.stem,
        "source": path.name,
        "file_type": path.suffix.lower().lstrip("."),
        "file_size_bytes": stat.st_size,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

    if text.strip():
        metadata["key_points"] = generate_key_points(text)

    return metadata