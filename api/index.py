import os
import sys
import fitz  # PyMuPDF
import shutil
import io
from flask import Flask, render_template, request, send_file, flash, redirect, url_for
from werkzeug.utils import secure_filename
from PIL import Image

# Setup path agar bisa import dari folder yang sama di Vercel
sys.path.append(os.path.dirname(__file__))
from watermark_pdf import watermark_image_to_pdf

app = Flask(__name__, 
            template_folder='../templates', 
            static_folder='../static')
app.secret_key = 'super_secret_key_fixed'

# WAJIB: Gunakan /tmp untuk Vercel (read-only environment)
UPLOAD_FOLDER = '/tmp'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Path ke watermark di folder static (Root -> static -> temp_watermark.png)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
WM_PATH = os.path.join(BASE_DIR, 'static', 'temp_watermark.png')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def process_single_pdf(pdf_path, output_pdf_path):
    """Proses watermark dan konversi ke TIFF dalam folder /tmp"""
    # 1. Jalankan fungsi watermark
    watermark_image_to_pdf(pdf_path, WM_PATH, output_pdf_path)
    
    # 2. Setup folder untuk hasil TIFF
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    tiff_folder = os.path.join(UPLOAD_FOLDER, f"{base_name}_tiffs")
    os.makedirs(tiff_folder, exist_ok=True)

    # 3. Konversi setiap halaman PDF ke TIFF
    doc = fitz.open(output_pdf_path)
    for i in range(doc.page_count):
        page = doc.load_page(i)
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        tiff_path = os.path.join(tiff_folder, f"page_{i+1}.tiff")
        img.save(tiff_path, format="TIFF")
    doc.close()
    return tiff_folder

@app.route('/')
def index():
    return render_template('upload_form.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'pdf_files' not in request.files:
        flash('Tidak ada file yang diunggah.', 'danger')
        return redirect(url_for('index'))

    pdf_files = request.files.getlist('pdf_files')
    if not pdf_files or pdf_files[0].filename == '':
        flash('Pilih minimal satu file PDF.', 'danger')
        return redirect(url_for('index'))

    # Bersihkan & siapkan folder sementara untuk hasil sesi ini
    session_folder = os.path.join(UPLOAD_FOLDER, "results")
    if os.path.exists(session_folder):
        shutil.rmtree(session_folder)
    os.makedirs(session_folder, exist_ok=True)

    processed_any = False
    for pdf in pdf_files:
        if pdf and allowed_file(pdf.filename):
            filename = secure_filename(pdf.filename)
            input_path = os.path.join(UPLOAD_FOLDER, filename)
            pdf.save(input_path)

            out_pdf_name = filename.replace('.pdf', '_watermarked.pdf')
            out_pdf_path = os.path.join(session_folder, out_pdf_name)

            try:
                # Jalankan alur pemrosesan
                tiff_dir = process_single_pdf(input_path, out_pdf_path)
                
                # Pindahkan folder TIFF ke dalam folder hasil utama
                shutil.move(tiff_dir, os.path.join(session_folder, os.path.basename(tiff_dir)))
                
                # Hapus file input asli untuk hemat ruang
                os.remove(input_path) 
                processed_any = True
            except Exception as e:
                print(f"Error processing {filename}: {e}")

    if processed_any:
        # Membuat arsip ZIP dari folder results
        zip_base_path = os.path.join(UPLOAD_FOLDER, "hasil_proses")
        shutil.make_archive(zip_base_path, 'zip', session_folder)
        zip_full_path = zip_base_path + ".zip"

        # Kirim file ZIP ke browser
        return send_file(zip_full_path, as_attachment=True, download_name="hasil_watermark.zip")
    
    flash('Gagal memproses file. Pastikan format benar.', 'danger')
    return redirect(url_for('index'))