from datetime import datetime, timezone
from pathlib import Path

from summarize import generate_key_points


def build_document_index_markdown(
    title: str,
    source_path: str,
    key_points: list[str] | None,
    file_type: str,
    uploaded_at: str,
    bundle_files: list[str] | None = None,
) -> str:
    source_label = source_path or title
    lines = [
        "# Document Index",
        "",
        f"- Title: {title}",
        f"- Source file: {source_label}",
        f"- File type: {file_type}",
        f"- Indexed at: {uploaded_at}",
    ]

    if bundle_files:
        lines.extend([
            f"- Total files: {len(bundle_files)}",
            "",
            "## Files in this bundle",
        ])
        for file_name in bundle_files:
            lines.append(f"- {file_name}")
    else:
        lines.append("")

    lines.append("")
    lines.append("## Key points")

    if key_points:
        for point in key_points:
            lines.append(f"- {point}")
    else:
        lines.append("- No key points were generated for this document.")

    return "\n".join(lines) + "\n"


def extract_document_metadata(
    file_path: str,
    text: str = "",
    source_label: str | None = None,
    bundle_files: list[str] | None = None,
) -> dict:
    path = Path(file_path)
    if path.exists():
        stat = path.stat()
        file_size_bytes = stat.st_size
    else:
        file_size_bytes = len(text.encode("utf-8"))

    if bundle_files:
        source_path = (source_label or path.name or "bundle").replace('\\', '/')
        title = Path(source_path).stem or source_path.replace('/', ' ').strip() or "bundle"
        source_name = source_path
        file_type = "bundle"
    else:
        source_path = (source_label or path.name).replace('\\', '/')
        title = Path(source_path).stem or path.stem
        source_name = path.name
        file_type = path.suffix.lower().lstrip(".")

    metadata = {
        "title": title,
        "source": source_name,
        "source_path": source_path,
        "file_type": file_type,
        "file_size_bytes": file_size_bytes,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

    if text.strip():
        metadata["key_points"] = generate_key_points(text)
    else:
        metadata["key_points"] = []

    metadata["index_markdown"] = build_document_index_markdown(
        title=metadata["title"],
        source_path=source_path,
        key_points=metadata["key_points"],
        file_type=metadata["file_type"],
        uploaded_at=metadata["uploaded_at"],
        bundle_files=bundle_files,
    )

    return metadata