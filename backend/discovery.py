from pathlib import Path

SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".txt", ".md", ".json",
    ".csv", ".xlsx", ".pptx", ".html", ".htm",
}


def discover_files(root_folder: str) -> list[str]:
    """
    Recursively walk a folder (including nested subfolders) and return
    paths of all files with supported extensions.
    """
    root = Path(root_folder)
    if not root.exists():
        raise FileNotFoundError(f"Folder not found: {root_folder}")

    return [
        str(p) for p in root.rglob("*")
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]