import path from "node:path";
import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import * as mupdf from "mupdf";
import sharp from "sharp";

export const WM_PATH = path.join(process.cwd(), "static", "temp_watermark.png");
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
export const ALLOWED_EXTS = new Set(["pdf", "jpg", "jpeg", "png"]);
export const IMAGE_EXTS = new Set(["jpg", "jpeg", "png"]);

let wmCache = null;
async function watermarkBytes() {
  if (!wmCache) wmCache = await fs.readFile(WM_PATH);
  return wmCache;
}

/** Stamp PNG watermark (centered, 40% page width) on every PDF page,
 *  then render each page to TIFF @300 DPI. Returns Buffer[] (one per page). */
export async function watermarkPdfToTiffs(pdfBytes) {
  const wm = await watermarkBytes();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const wmImg = await pdfDoc.embedPng(wm);
  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const targetW = width * 0.4;
    const targetH = wmImg.height * (targetW / wmImg.width);
    page.drawImage(wmImg, {
      x: (width - targetW) / 2,
      y: (height - targetH) / 2,
      width: targetW,
      height: targetH,
    });
  }
  const stamped = await pdfDoc.save();

  const mdoc = mupdf.Document.openDocument(Buffer.from(stamped), "application/pdf");
  const zoom = 300 / 72;
  const pages = [];
  for (let i = 0; i < mdoc.countPages(); i++) {
    const pix = mdoc
      .loadPage(i)
      .toPixmap(mupdf.Matrix.scale(zoom, zoom), mupdf.ColorSpace.DeviceRGB, false);
    pages.push(await sharp(Buffer.from(pix.asPNG())).tiff({ compression: "lzw" }).toBuffer());
  }
  return { stamped: Buffer.from(stamped), pages };
}

/** Composite PNG watermark (centered, 40% width) onto a JPG/PNG, return TIFF Buffer. */
export async function watermarkImageToTiff(imgBytes) {
  const wm = await watermarkBytes();
  const meta = await sharp(imgBytes).metadata();
  const targetW = Math.round(meta.width * 0.4);
  const resized = await sharp(wm).resize(targetW).toBuffer();
  const wmMeta = await sharp(resized).metadata();
  return sharp(imgBytes)
    .composite([
      {
        input: resized,
        left: Math.round((meta.width - wmMeta.width) / 2),
        top: Math.round((meta.height - wmMeta.height) / 2),
      },
    ])
    .tiff({ compression: "lzw" })
    .toBuffer();
}

export function safeBaseName(filename) {
  return (
    filename
      .split("/")
      .pop()
      .split("\\")
      .pop()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 100) || "file"
  );
}
