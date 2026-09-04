from pathlib import Path

import extract


def test_find_tesseract_executable_from_custom_path(tmp_path):
    fake_tesseract = tmp_path / "Tesseract-OCR" / "tesseract.exe"
    fake_tesseract.parent.mkdir(parents=True)
    fake_tesseract.write_bytes(b"fake")

    result = extract._find_tesseract_executable([str(fake_tesseract)])

    assert result == str(fake_tesseract)
