import os
import json
import logging
from pathlib import Path
from google import genai
from dotenv import load_dotenv

# Load env variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("kka_uploader")

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_KEY:
    log.error("GEMINI_API_KEY bulunamadı! Lütfen .env dosyasını kontrol edin.")
    exit(1)

client = genai.Client(api_key=GEMINI_KEY)

# Bu klasöre ders kodlarına ait PDF'ler konulacak.
# Örnek:
# data/pdfs/KDB_122.pdf
# data/pdfs/FEL_202.pdf
PDF_DIR = Path("data/pdfs")
PDF_DIR.mkdir(parents=True, exist_ok=True)

# Yüklenen dosyaların Gemini ID'lerini tutacağımız veritabanı dosyası
DB_FILE = Path("course_files.json")

def load_db():
    if DB_FILE.exists():
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_db(db):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=4)

def upload_all_pdfs():
    db = load_db()
    
    pdf_files = list(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        log.info(f"{PDF_DIR} klasöründe hiç PDF bulunamadı. Lütfen ders kodlarına göre PDF ekleyin (Örn: KDB_122.pdf)")
        return

    log.info(f"Bulunan PDF sayısı: {len(pdf_files)}")

    for pdf_path in pdf_files:
        # Dosya ismini ders kodu olarak kabul ediyoruz (Örn: KDB_122 -> KDB 122)
        course_code = pdf_path.stem.replace("_", " ").upper()
        
        # Zaten yüklenmiş mi kontrol et
        if course_code in db:
            log.info(f"[{course_code}] zaten yüklenmiş. Atlanıyor. (Yeniden yüklemek için course_files.json dosyasından silin)")
            continue

        log.info(f"[{course_code}] {pdf_path.name} yükleniyor...")
        try:
            # Gemini'ye yükle (Yeni SDK)
            uploaded_file = client.files.upload(file=str(pdf_path), config={'display_name': course_code})
            
            # DB'ye kaydet
            db[course_code] = {
                "file_name": uploaded_file.name,
                "uri": uploaded_file.uri,
                "display_name": uploaded_file.display_name,
                "mime_type": uploaded_file.mime_type
            }
            log.info(f"[{course_code}] Başarıyla yüklendi! URI: {uploaded_file.uri}")
        except Exception as e:
            log.error(f"[{course_code}] yüklenirken hata oluştu: {e}")

    save_db(db)
    log.info("Yükleme işlemi tamamlandı.")

if __name__ == "__main__":
    upload_all_pdfs()

