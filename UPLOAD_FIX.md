# Upload Folder/ZIP Fix

## Issue Fixed
The upload feature now properly supports:
- ✅ Selecting individual files
- ✅ Selecting entire folders 
- ✅ Uploading ZIP files directly
- ✅ Automatic ZIP creation for folders

## What Changed

### Frontend (App.jsx)
1. **Added JSZip library** - Automatically creates ZIP files from selected folders
2. **Updated file input** - Added `webkitdirectory` and `multiple` attributes to allow folder selection
3. **Enhanced upload handler** - Detects folder selections and auto-zips them before upload

### Frontend (package.json)
- Added `jszip` dependency for client-side ZIP creation

## How to Use

### Setup (One-time)
```bash
cd frontend
npm install
cd ..
```

### Usage Options

#### Option 1: Upload Individual Files
1. Click "Upload file or folder"
2. Select individual files (PDF, DOCX, images, etc.)
3. Files are processed immediately

#### Option 2: Upload a Folder (NEW!)
1. Click "Upload file or folder"
2. Click "Upload Folder" or similar option in the file dialog
3. Select the folder containing your documents
4. All files are automatically:
   - Zipped on your computer (browser)
   - Sent to the server
   - Processed recursively (including subfolders)
5. Get a summary of processed and failed documents

#### Option 3: Upload Pre-made ZIP
1. Manually create a ZIP file from your folder
2. Click "Upload file or folder"
3. Select the `.zip` file
4. Upload proceeds as normal

## File Structure Support

Your folder can have any structure:
```
my_documents/
├── contract1.pdf
├── report.docx
├── invoice_scan.png
├── notes.txt
└── subfolder/
    ├── document.pdf
    ├── image.jpg
    └── another_subfolder/
        └── nested_file.txt
```

✅ All files are processed
✅ Folder structure is preserved
✅ Supports unlimited nesting

## Supported File Types
- **Documents**: PDF, DOCX, TXT, MD, JSON, CSV, XLSX, PPTX, HTML
- **Images**: JPG, JPEG, PNG, GIF, BMP, TIFF, WEBP (with OCR)
- **Archives**: ZIP

## Browser Support

✅ Chrome/Chromium (Best support)
✅ Firefox (Supported)
✅ Edge (Supported)
✅ Safari (Limited webkitdirectory support)

## Response Example

When uploading a folder or ZIP:
```json
{
  "message": "Bulk upload completed",
  "total_processed": 15,
  "documents": [
    {
      "document_id": 1,
      "title": "contract.pdf",
      "chunk_count": 24
    },
    {
      "document_id": 2,
      "title": "scan.png",
      "chunk_count": 5
    }
  ],
  "failed_count": 2,
  "failed_files": [
    {
      "filename": "readme.exe",
      "reason": "Unsupported file type: .exe"
    }
  ]
}
```

## Troubleshooting

### Issue: Can't see "Upload Folder" option
**Solution**: This depends on your browser/OS combination:
- Most modern browsers (Chrome, Firefox, Edge) support it
- Try refreshing the page
- Check browser console for errors

### Issue: Some files not uploading
**Solution**: Check the `failed_files` in the response:
- Unsupported file types are skipped (configure in backend)
- Very large files might timeout
- Check file permissions

### Issue: Folder not recognized
**Solution**: 
- Try manually creating a ZIP file instead
- Ensure folder has valid document files
- Check browser console for JavaScript errors

## Performance Tips

- **Small folders**: < 50 files uploads quickly
- **Large folders**: 50-200 files may take longer to ZIP and process
- **Very large**: 200+ files - consider splitting into multiple uploads
- **File size**: 100MB+ total might timeout - upload in batches

## Next Steps

1. Install dependencies: `npm install` in `frontend/`
2. Start your frontend dev server
3. Try uploading a folder!

## Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Review backend logs for processing errors
3. Ensure Tesseract OCR is installed for image processing
