import JSZip from "jszip";
import {
  ALLOWED_EXTS,
  IMAGE_EXTS,
  MAX_TOTAL_BYTES,
  safeBaseName,
  watermarkImageToTiff,
  watermarkPdfToTiffs,
} from "@/lib/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Gagal membaca form upload." }, { status: 400 });
  }

  const files = form.getAll("pdf_files").filter((f) => f && typeof f.arrayBuffer === "function");
  if (!files.length) {
    return Response.json(
      { error: "Pilih minimal satu file (PDF, JPG, atau PNG)." },
      { status: 400 },
    );
  }

  // ponytail: Vercel hard limit 4.5MB — reject early with readable error
  let total = 0;
  const jobs = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) continue;
    const bytes = Buffer.from(await file.arrayBuffer());
    total += bytes.length;
    jobs.push({ name: file.name, ext, bytes });
  }
  if (!jobs.length) {
    return Response.json({ error: "Tidak ada file valid (PDF, JPG, PNG)." }, { status: 400 });
  }
  if (total > MAX_TOTAL_BYTES) {
    return Response.json(
      { error: `Total ukuran file (${(total / 1024 / 1024).toFixed(1)} MB) melebihi batas 4 MB.` },
      { status: 413 },
    );
  }

  try {
    const zip = new JSZip();
    for (const { name, ext, bytes } of jobs) {
      const base = safeBaseName(name);
      if (IMAGE_EXTS.has(ext)) {
        const tiff = await watermarkImageToTiff(bytes);
        zip.file(`${base}_tiffs/page_1.tiff`, tiff);
      } else {
        const { stamped, pages } = await watermarkPdfToTiffs(bytes);
        zip.file(`${base}_watermarked.pdf`, stamped);
        pages.forEach((tiff, i) => zip.file(`${base}_tiffs/page_${i + 1}.tiff`, tiff));
      }
    }
    const zipBuf = await zip.generateAsync({ type: "uint8array" });
    return new Response(zipBuf, {
      headers: {
        "Content-Type": "application/zip",
        'Content-Disposition': 'attachment; filename="hasil_watermark.zip"',
      },
    });
  } catch (err) {
    console.error("upload failed:", err);
    return Response.json(
      { error: "Gagal memproses file. Pastikan format benar." },
      { status: 500 },
    );
  }
}
