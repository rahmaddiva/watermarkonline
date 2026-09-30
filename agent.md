# Project: watermarkonline

Next.js App Router (full JavaScript). Users upload PDF/JPG/PNG files, each gets a centered PNG watermark stamped on every page, then every page is converted to TIFF at 300 DPI. Watermarked PDFs + TIFF folders are zipped in-memory and returned as a single download.

## Stack

- Next.js App Router (frontend + backend in one repo, Vercel zero-config)
- pdf-lib — stamp watermark onto PDF pages
- mupdf (official MuPDF WASM build) — render PDF pages at 300 DPI
- sharp — composite watermark onto JPG/PNG, encode TIFF (LZW)
- JSZip — in-memory ZIP
- Tailwind CSS + shadcn-style components (`components/ui/`) + sonner toasts + lucide icons

## Project Structure

```
watermarkfile/
├── app/
│   ├── page.jsx            # Upload form UI
│   ├── layout.jsx          # Root layout + Toaster
│   ├── globals.css         # Tailwind + DISPUSIP theme tokens
│   └── api/upload/route.js # POST /api/upload → hasil_watermark.zip
├── components/ui/          # button, card, progress (shadcn-style)
├── lib/
│   ├── process.js          # watermark + 300 DPI + TIFF logic
│   └── utils.js            # cn(), formatBytes()
├── static/
│   └── temp_watermark.png  # Watermark image (fixed, not user-uploaded)
└── next.config.mjs         # serverExternalPackages: mupdf, sharp
```

## Key Constraints

- Node.js runtime required on `/api/upload` (`export const runtime = "nodejs"`) — mupdf WASM + sharp do not run on edge.
- Watermark defaults to `static/temp_watermark.png`, bundled via `outputFileTracingIncludes`. Each request may send an optional `watermark_file` (PNG, ≤1 MB) as override. Centered on each page at 40% of page width.
- Accepted: `.pdf`, `.jpg`, `.jpeg`, `.png`. Total upload cap 4 MB (Vercel serverless 4.5 MB limit) — rejected early, client + server.
- Fully stateless: no `/tmp` writes, no DB, no session, no auth. Files flow as Buffers → ZIP generated in memory.
- Measured on production (Hobby, fluid compute): 20-page PDF ≈ 17.6s end-to-end, well under the 60s maxDuration default. Ceiling ≈ 50 pages/request before timeout risk — batch large documents client-side if that is ever exceeded.

## Routes

| Method | Path         | Description                                     |
|--------|--------------|-------------------------------------------------|
| GET    | `/`          | Upload form                                     |
| POST   | `/api/upload`| Accepts files (field `pdf_files`) + optional `watermark_file` (PNG), returns ZIP |

## Processing Flow (`POST /api/upload`)

1. Read multipart files from memory (`arrayBuffer()`), plus optional `watermark_file` override (PNG magic-byte checked).
2. Per PDF: pdf-lib stamps watermark on every page → mupdf renders each page @300 DPI → sharp encodes TIFF (LZW).
3. Per image: sharp composites watermark centered at 40% width → TIFF (LZW).
4. ZIP contains `<base>_watermarked.pdf` (PDF inputs only) + `<base>_tiffs/page_N.tiff`, streamed back as `hasil_watermark.zip`.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```
