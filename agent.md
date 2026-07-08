# Project: watermarkonline

Flask web app deployed on Vercel. Users upload one or more PDF files, each gets a centered image watermark stamped on every page, then every page is converted to TIFF at 300 DPI. All results are zipped and returned as a single download.

## Stack

- Python / Flask
- PyMuPDF (fitz) - PDF manipulation and page-to-image rendering
- Pillow - TIFF export
- Werkzeug - file handling
- Bootstrap 5 + SweetAlert2 - frontend UI
- Vercel - serverless hosting

## Project Structure

```
watermarkfile/
├── api/
│   ├── index.py          # Flask app, routes, processing logic
│   └── watermark_pdf.py  # Watermark stamping function
├── static/
│   └── temp_watermark.png  # Watermark image (fixed, not user-uploaded)
├── templates/
│   └── upload_form.html  # Single-page UI
├── requirements.txt
└── vercel.json           # All routes rewritten to /api/index.py
```

## Key Constraints

- Vercel serverless: filesystem is read-only except `/tmp`. All intermediate files (uploads, watermarked PDFs, TIFF folders, ZIP) must be written to `/tmp`.
- Watermark image is fixed at `static/temp_watermark.png`. It is centered on each page at 40% of page width.
- Only `.pdf` files are accepted.
- No database, no session persistence, no authentication.

## Routes

| Method | Path      | Description                                      |
|--------|-----------|--------------------------------------------------|
| GET    | `/`       | Renders upload form                              |
| POST   | `/upload` | Accepts PDF files, processes, returns ZIP file   |

## Processing Flow (`/upload`)

1. Save uploaded PDFs to `/tmp`.
2. For each PDF, call `watermark_image_to_pdf()` to produce a watermarked PDF.
3. Render every page of the watermarked PDF to TIFF at 300 DPI using PyMuPDF + Pillow.
4. Collect all watermarked PDFs and TIFF folders into `/tmp/results/`.
5. ZIP the results folder and stream it back as `hasil_watermark.zip`.

## Development

Install dependencies:

```bash
pip install -r requirements.txt
```

Run locally:

```bash
flask --app api/index.py run
```

The app expects the watermark image at `static/temp_watermark.png` relative to the project root. Replace this file to change the watermark.

## Notes

- `app.secret_key` is hardcoded. Replace with an environment variable before any sensitive deployment.
- `/tmp/results/` is wiped at the start of each `/upload` request to avoid stale data from previous invocations.
- TIFF folders are named `<original_filename>_tiffs/` and placed alongside the watermarked PDF inside the ZIP.
