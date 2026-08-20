# batch_process.py
import json
import time

from discovery import discover_files
from extract import extract_text, UnsupportedFileTypeError
from cleaning import clean_text
from metadata import extract_document_metadata
from chunking import chunk_text

OUTPUT_FILE = "batch_results.jsonl"
FAILURES_FILE = "batch_failures.log"


def load_already_processed() -> set:
    """Return the set of file_paths already saved, so we can skip them on resume."""
    processed = set()
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    record = json.loads(line)
                    processed.add(record.get("file_path"))
    except FileNotFoundError:
        pass
    return processed


def run_batch(folder_path: str):
    all_files = discover_files(folder_path)
    already_done = load_already_processed()

    files = [f for f in all_files if f not in already_done]
    total = len(files)

    print(f"Found {len(all_files)} total files")
    print(f"Already processed: {len(already_done)}")
    print(f"Remaining to process: {total}\n")

    success_count = 0
    fail_count = 0
    start_time = time.time()

    with open(OUTPUT_FILE, "a", encoding="utf-8") as out_f, \
         open(FAILURES_FILE, "a", encoding="utf-8") as fail_f:

        for i, file_path in enumerate(files, start=1):
            elapsed = time.time() - start_time
            avg_per_file = elapsed / i if i > 0 else 0
            eta_seconds = avg_per_file * (total - i)

            print(f"[{i}/{total}] {file_path}  "
                  f"(elapsed: {elapsed/60:.1f}m, ETA: {eta_seconds/60:.1f}m)")

            try:
                raw = extract_text(file_path)
                cleaned = clean_text(raw)
                meta = extract_document_metadata(file_path, text=cleaned)
                meta["file_path"] = file_path

                chunks = chunk_text(cleaned)
                meta["chunk_count"] = len(chunks)

                out_f.write(json.dumps(meta, ensure_ascii=False) + "\n")
                out_f.flush()
                success_count += 1

            except UnsupportedFileTypeError as e:
                fail_f.write(f"{file_path}\t{e}\n")
                fail_f.flush()
                fail_count += 1
            except Exception as e:
                fail_f.write(f"{file_path}\t{type(e).__name__}: {e}\n")
                fail_f.flush()
                fail_count += 1

    total_time = time.time() - start_time
    print(f"\nDone in {total_time/60:.1f} minutes")
    print(f"Success: {success_count}, Failed: {fail_count}")


if __name__ == "__main__":
    run_batch("Rag_doc")