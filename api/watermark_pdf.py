import fitz  # PyMuPDF
import os 

def watermark_image_to_pdf(input_pdf_path, watermark_image_path, output_pdf_path):
    # Buka dokumen sumber
    doc = fitz.open(input_pdf_path)
    # Baca watermark sebagai Pixmap
    pix = fitz.Pixmap(watermark_image_path)
    orig_w, orig_h = pix.width, pix.height

    for page in doc:
        p_rect = page.rect
        # Hitung ukuran target: 40% dari lebar halaman
        target_w = p_rect.width * 0.4
        target_h = orig_h * (target_w / orig_w)

        # Hitung posisi supaya center
        x0 = (p_rect.width  - target_w) / 2
        y0 = (p_rect.height - target_h) / 2
        box = fitz.Rect(x0, y0, x0 + target_w, y0 + target_h)

        # Sisipkan watermark yang sudah diskalakan
        page.insert_image(box, pixmap=pix, overlay=True)

    # Simpan hasil dan tutup dokumen
    doc.save(output_pdf_path)

def convert_pdf_to_tiff(pdf_path):
    doc = fitz.open(pdf_path)
    # Ambil nama file tanpa .pdf
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    folder_name = os.path.join(os.path.dirname(pdf_path), base_name)

    # Buat folder kalau belum ada
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    # Convert per halaman ke TIFF
    for page_number in range(doc.page_count):
        page = doc.load_page(page_number)
        pix = page.get_pixmap(dpi=300)  # bisa ubah dpi sesuai kebutuhan
        output_tiff_path = os.path.join(folder_name, f"page_{page_number + 1}.tiff")
        pix.save(output_tiff_path)

    doc.close()
