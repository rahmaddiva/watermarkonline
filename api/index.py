import os
import sys
import fitz  # PyMuPDF
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
from PIL import Image

# Menambahkan folder 'api' ke path sistem agar bisa import watermark_pdf tanpa tanda titik
sys.path.append(os.path.dirname(__file__))
from watermark_pdf import watermark_image_to_pdf

app = Flask(__name__, 
            template_folder='../templates', 
            static_folder='../static')
app.secret_key = 'your_secret_key_fixed'

# WAJIB: Gunakan /tmp untuk Vercel
UPLOAD_FOLDER = '/tmp'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Path ke watermark di folder static (Root -> static -> temp_watermark.png)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
WM_PATH = os.path.join(BASE_DIR, 'static', 'temp_watermark.png')

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def convert_pdf_to_tiff(pdf_path):
    doc = fitz.open(pdf_path)
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    tiff_folder = os.path.join(UPLOAD_FOLDER, base_name)
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
    if 'pdf_files' not in request.files:
        flash('Tidak ada bagian file.', 'danger')
        return redirect(url_for('index'))

    pdf_files = request.files.getlist('pdf_files')

    if not pdf_files or pdf_files[0].filename == '':
        flash('Tidak ada file PDF yang dipilih.', 'danger')
        return redirect(url_for('index'))

    # Cek apakah file watermark fisik benar-benar ada
    if not os.path.exists(WM_PATH):
        flash(f'Error: File watermark tidak ditemukan di {WM_PATH}', 'danger')
        return redirect(url_for('index'))

    for pdf in pdf_files:
        if pdf and allowed_file(pdf.filename):
            filename = secure_filename(pdf.filename)
            pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            pdf.save(pdf_path)
            
            out_name = filename.replace('.pdf', '_watermarked.pdf')
            out_pdf = os.path.join(app.config['UPLOAD_FOLDER'], out_name)

            try:
                # Gunakan WM_PATH yang sudah dipastikan lokasinya
                watermark_image_to_pdf(pdf_path, WM_PATH, out_pdf)
                # Convert ke TIFF
                convert_pdf_to_tiff(out_pdf)
                # Hapus PDF sementara
                if os.path.exists(pdf_path): os.remove(pdf_path)
            except Exception as e:
                flash(f'Gagal memproses {filename}: {str(e)}', 'danger')
                continue

    flash('Proses berhasil! File tersimpan sementara di server.', 'success')
    return redirect(url_for('index'))

# Penting untuk Vercel
app.debug = False