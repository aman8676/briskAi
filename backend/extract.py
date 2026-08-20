import json
import csv
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from docx import Document as DocxDocument
from openpyxl import load_workbook
from pptx import Presentation

from bs4 import BeautifulSoup


class UnsupportedFileTypeError(Exception):
    pass


def extract_text(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()

    extractors = {
        ".pdf": _extract_pdf,
        ".docx": _extract_docx,
        ".txt": _extract_txt,
        ".md": _extract_txt,
        ".json": _extract_json,
        ".csv": _extract_csv,
        ".xlsx": _extract_xlsx,
        ".pptx": _extract_pptx,
        ".html": _extract_html,
        ".htm": _extract_html,
    }

    if ext not in extractors:
        raise UnsupportedFileTypeError(f"Unsupported file type: {ext}")

    return extractors[ext](file_path)


def _extract_pdf(file_path: str) -> str:
    text_parts = []

    with pdfplumber.open(file_path) as pdf:

        for i, page in enumerate(pdf.pages, start=1):
            text_parts.append(f"--- Page {i} ---")

            # NORMAL TEXT
            text = page.extract_text()

            if text and text.strip():
                text_parts.append(text.strip())

            # TABLES
            tables = page.extract_tables()

            for table_index, table in enumerate(tables, start=1):

                text_parts.append(
                    f"--- Table {table_index} ---"
                )

                for row in table:

                    cells = [
                        str(cell).strip()
                        if cell is not None
                        else ""
                        for cell in row
                    ]

                    text_parts.append(" | ".join(cells))

    return "\n".join(text_parts).strip()



def _extract_docx(file_path: str) -> str:
    doc = DocxDocument(file_path)
    text_parts = []

    # ============================================================
    # EXTRACT NORMAL PARAGRAPHS
    # ============================================================
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            text_parts.append(paragraph.text.strip())

    # ============================================================
    # EXTRACT TABLES
    # ============================================================
    for table_index, table in enumerate(doc.tables, start=1):

        text_parts.append(f"--- Table {table_index} ---")

        for row in table.rows:
            cells = [
                cell.text.strip()
                for cell in row.cells
            ]

            text_parts.append(" | ".join(cells))

    return "\n".join(text_parts).strip()

def _extract_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()


def _extract_json(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return json.dumps(data, indent=2, ensure_ascii=False)


def _extract_csv(file_path: str) -> str:
    rows = []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        for row in reader:
            rows.append(", ".join(row))
    return "\n".join(rows).strip()


def _extract_xlsx(file_path: str) -> str:
    wb = load_workbook(file_path, data_only=True)
    text_parts = []
    for sheet in wb.worksheets:
        text_parts.append(f"--- Sheet: {sheet.title} ---")
        for row in sheet.iter_rows(values_only=True):
            line = ", ".join(str(cell) for cell in row if cell is not None)
            if line.strip():
                text_parts.append(line)
    return "\n".join(text_parts).strip()


def _extract_pptx(file_path: str) -> str:
    prs = Presentation(file_path)
    text_parts = []
    for i, slide in enumerate(prs.slides, start=1):
        text_parts.append(f"--- Slide {i} ---")
        for shape in slide.shapes:
            if shape.has_table:
                for row in shape.table.rows:
                    cells = [cell.text.strip() for cell in row.cells]
                    text_parts.append(" | ".join(cells))
            elif shape.has_chart:
                chart = shape.chart
                try:
                    categories = list(chart.plots[0].categories)
                except Exception:
                    categories = []
                for series in chart.series:
                    values = list(series.values)
                    if categories and len(categories) == len(values):
                        pairs = ", ".join(f"{c}: {v}" for c, v in zip(categories, values))
                    else:
                        pairs = ", ".join(str(v) for v in values)
                    text_parts.append(f"{series.name}: {pairs}")
            elif shape.has_text_frame and shape.text.strip():
                text_parts.append(shape.text)
    return "\n".join(text_parts).strip()

def _extract_html(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text(separator="\n").strip()
