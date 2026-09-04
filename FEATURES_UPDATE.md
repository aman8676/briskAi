# RAG Website - New Features (OCR & Bulk Upload)

## 🎯 What's New?

### 1. **OCR Image Recognition** 📷
Users can now upload images directly. The system will extract text using Tesseract OCR and process it just like text documents.

**Supported image formats:**
- JPG, JPEG
- PNG  
- GIF
- BMP
- TIFF
- WEBP

### 2. **Bulk Folder Upload** 📁
Upload multiple files at once by creating a ZIP archive of your documents folder.

**How to use:**
1. Create a folder with your documents (PDFs, DOCs, images, etc.)
2. Compress it into a ZIP file
3. Upload the ZIP file through the UI
4. System processes all files automatically

**Example structure:**
```
my_documents.zip
├── contract1.pdf
├── report.docx
├── invoice.png
├── memo.txt
└── subfolder/
    ├── document.pdf
    └── image.jpg
```

## ⚙️ Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Tesseract-OCR

**Windows:**
```powershell
# Using Chocolatey
choco install tesseract

# OR download and run installer from:
# https://github.com/UB-Mannheim/tesseract/wiki
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

### 3. (Optional) Configure Tesseract Path
If Tesseract is not in your PATH, update `backend/extract.py`:
```python
import pytesseract
pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows
```

## 📊 How It Works

### Single File Upload (Existing Flow)
```
User uploads file → Extract text → Clean → Chunk → Embed → Save
```

### Image Upload (New Feature)
```
User uploads image (.jpg/.png/etc) → OCR extract text → Clean → Chunk → Embed → Save
```

### Bulk ZIP Upload (New Feature)
```
User uploads ZIP → Extract contents → For each file:
  - Validate file type
  - Extract text (OCR for images)
  - Clean → Chunk → Embed → Save
→ Return summary (processed count, failed files)
```

## 🔄 Ingestion Pipeline (Unchanged)

The overall flow remains the same:
1. **Extract** - Get text from file (now includes OCR for images)
2. **Clean** - Remove noise and standardize formatting
3. **Metadata** - Extract title, source, key points
4. **Chunk** - Break into manageable pieces
5. **Embed** - Generate embeddings using Sentence Transformers
6. **Save** - Store in PostgreSQL with pgvector

## ✨ Features & Enhancements

### Support for More File Types
- **Images**: PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP (with OCR)
- **Existing**: PDF, DOCX, TXT, MD, JSON, CSV, XLSX, PPTX, HTML, HTM

### Bulk Upload Response
When uploading ZIP files, you'll get:
```json
{
  "message": "Bulk upload completed",
  "total_processed": 45,
  "documents": [
    {
      "document_id": 1,
      "title": "Contract_v1.pdf",
      "chunk_count": 12
    },
    ...
  ],
  "failed_count": 2,
  "failed_files": [
    {
      "filename": "unsupported.exe",
      "reason": "Unsupported file type: .exe"
    }
  ]
}
```

### Smart Error Handling
- Unsupported file types in ZIP are skipped (not deleted)
- Failed files are reported with reasons
- Successful files are still processed even if others fail
- Clear feedback on upload completion

## 📝 Frontend Updates

### Upload UI
- Changed from "Upload file" → "Upload file or folder"
- Updated accepted file types in input element
- Helper text: "PDF, DOCX, Images, or ZIP for bulk upload"

### Upload Feedback
- Single file: "Document processed successfully"
- Bulk ZIP: "Bulk upload completed! Processed: X document(s)"
- Shows failed count if any files failed

## 🔍 Image Processing Details

When you upload an image:
1. File format and dimensions are extracted
2. OCR (Tesseract) extracts text from image
3. Text is added to document content
4. Same chunking and embedding pipeline applies
5. Searchable just like text documents

**Example:**
```
--- Image File: contract_scan.png ---
Image size: 2400x3200 pixels
Image format: PNG
--- OCR Extracted Text ---
AGREEMENT FOR SERVICES
This agreement made this 1st day of January 2024...
```

## ⚠️ Limitations & Notes

1. **OCR Quality**: Depends on image quality and clarity
2. **Tesseract Setup Required**: Must be installed for image processing
3. **ZIP Limit**: No enforced limit, but large ZIPs may take time
4. **Recursive Folders**: Supports nested folder structures in ZIP
5. **File Naming**: Maintains original filenames for metadata

## 🚀 Future Enhancements

Possible improvements:
- OCR language detection and multi-language support
- Drag-and-drop file uploads
- Progress bar for bulk uploads
- Batch processing optimization
- Image preprocessing (deskew, denoise) before OCR

## 💡 Tips

- **For Best OCR Results**: Use high-quality, clear images
- **Folder Organization**: Keep related documents together in ZIP
- **File Naming**: Use descriptive names (processed as document titles)
- **Batch Processing**: Upload smaller ZIPs (< 100 files) for faster processing

---

**Questions or Issues?** Check the logs for detailed error messages during ingestion.
