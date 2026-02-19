import os
import fitz  # PyMuPDF
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
from PIL import Image
# Di dalam api/index.py
from .watermark_pdf import watermark_image_to_pdf

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # ganti dengan secret key Anda

# UBAH INI: Gunakan /tmp untuk environment serverless
UPLOAD_FOLDER = '/tmp' 
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Hanya PDF yang diizinkan
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Jika logo.png atau temp_watermark.png ada di root project, 
# kita harus ambil path relatif ke file ini
BASE_DIR = os.path.dirname(os.path.dirname(__file__)) 
WM_PATH = os.path.join(BASE_DIR, 'temp_watermark.png')

# Pastikan folder uploads ada
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return (
        '.' in filename and 
        filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']
    )

def convert_pdf_to_tiff(pdf_path):
    """Convert setiap halaman PDF menjadi TIFF dan simpan di folder bernama base PDF."""
    doc = fitz.open(pdf_path)
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    tiff_folder = os.path.join(os.path.dirname(pdf_path), base_name)
    os.makedirs(tiff_folder, exist_ok=True)

    for i in range(doc.page_count):
        page = doc.load_page(i)
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        tiff_path = os.path.join(tiff_folder, f"page_{i+1}.tiff")
        img.save(tiff_path, format="TIFF")

    doc.close()

@app.route('/')
def index():
    return render_template('upload_form.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    pdf_files = request.files.getlist('pdf_files')

   # Gunakan WM_PATH yang baru didefinisikan di atas
    if not os.path.exists(WM_PATH):
        flash('File watermark tidak ditemukan.', 'danger')
        return redirect(url_for('index'))

    # path watermark yang fixed
    wm_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_watermark.png')
    if not os.path.exists(wm_path):
        flash('File watermark (temp_watermark.png) tidak ditemukan di folder uploads/.', 'danger')
        return redirect(url_for('index'))

    for pdf in pdf_files:
        if pdf and allowed_file(pdf.filename):
            filename = secure_filename(pdf.filename)
            pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            pdf.save(pdf_path)
            # nama dan path output watermarked PDF
            out_name = filename.replace('.pdf', '_watermarked.pdf')
            out_pdf = os.path.join(app.config['UPLOAD_FOLDER'], out_name)

            # proses watermark
            watermark_image_to_pdf(pdf_path, wm_path, out_pdf)

            # hapus PDF asli
            os.remove(pdf_path)
            # convert ke TIFF
            convert_pdf_to_tiff(out_pdf)

    flash('Proses berhasil! PDF di-watermark dan dikonversi ke TIFF.', 'success')
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5001)
