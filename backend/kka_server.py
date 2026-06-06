"""
Kültür Koruma Akademisi — Render-ready backend
================================================
Endpoints
  POST /api/ai-assistant   → Gemini chat (Turkish cultural heritage expert)
  GET  /api/health         → Render health check
  GET  /api/leaderboard    → In-memory leaderboard (seed data)
  POST /api/leaderboard/score → Submit / update a user score

Run locally:
  uvicorn kka_server:app --reload --port 8001

Deploy on Render:
  Build command : pip install -r requirements.txt
  Start command : gunicorn kka_server:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
"""

from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Load env ────────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("kka")

# ── Gemini setup ─────────────────────────────────────────────────────
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

try:
    if GEMINI_KEY:
        client = genai.Client(api_key=GEMINI_KEY)
        log.info("Gemini API configured ✓")
    else:
        client = None
        log.warning("GEMINI_API_KEY not found in env.")
except Exception as e:
    log.error(f"Failed to configure Gemini: {e}")
    client = None

# ── System prompt ─────────────────────────────────────────────────────
SYSTEM_PROMPT = """Sen 'Kültür Koruma Akademisi' platformunun uzman AI hoca asistanısın.

## Uzmanlık Alanların
- Türkiye UNESCO Dünya Mirası alanları (Göbekli Tepe, Efes, Çatalhöyük, Hattuşa, Nemrut Dağı, Troya, Kapadokya vb.)
- Arkeolojik kazı yöntemleri ve stratigrafik analiz
- Kültürel miras koruma teknikleri (konsolidasyon, restorasyon, dijital arşivleme)
- Osmanlı, Selçuklu, Bizans, Hitit ve diğer Anadolu uygarlıkları
- Müze yönetimi ve koleksiyon koruma
- ICOMOS ve UNESCO koruma standartları
- Malzeme bilimi: Paraloid akrilikler, kireç harçlar, konsolidasyon reçineleri
- Türk sanat tarihi, el sanatları ve somut olmayan kültürel miras

## Yanıt Kuralları
1. DAIMA Türkçe yanıt ver — kullanıcı başka dil kullanmadıkça.
2. Kısa, net ve akademik dil kullan — ama öğrenciye uygun sıcaklıkta.
3. Mümkünse somut örnekler ver (alan adı, dönem, teknik).
4. Bilimsel terimleri açıkla (parantez içinde).
5. Yanıtın sonunda ilgili olduğunda kısa bir "💡 Daha fazla araştır:" önerisi ekle.
6. Uydurma bilgi verme; emin olmadığında "Bu konuyu kaynaklardan teyit etmenizi öneririm" de.

## Karakter
- İsmin: Prof. Kültür
- Sıcak, meraklı, öğretmeyi seven bir akademisyen.
- Emoji kullanımı: Az ama etkili (💡🏛️📜⚗️🔍).
"""

# ── FastAPI app ───────────────────────────────────────────────────────
app = FastAPI(title="KKA Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kultur-koruma-akademisi.web.app",
        "https://kultur-koruma-akademisi.firebaseapp.com",
        "http://localhost:3000",
        "http://localhost:8001",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# ── Pydantic models ───────────────────────────────────────────────────
class AIRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class AIResponse(BaseModel):
    response: str
    session_id: str

class CourseChatRequest(BaseModel):
    course_code: str
    message: str

class ScoreSubmit(BaseModel):
    uid: str
    display_name: str
    avatar: str       # single initial, e.g. "Z"
    color: str        # hex, e.g. "#4A8C6A"
    xp: int
    streak: int

class LeaderboardEntry(BaseModel):
    uid: str
    display_name: str
    avatar: str
    color: str
    xp: int
    streak: int
    rank: int
    updated_at: str

# ── In-memory leaderboard (seed) ─────────────────────────────────────
# In production this is replaced by Firebase Firestore; this acts as
# a fast fallback / demo seed when Firebase is not yet connected.
_LEADERBOARD: dict[str, dict] = {
    "user_zeynep": dict(uid="user_zeynep", display_name="Zeynep A.", avatar="Z", color="#4A8C6A", xp=2840, streak=31),
    "user_mehmet": dict(uid="user_mehmet", display_name="Mehmet K.", avatar="M", color="#6A4A8C", xp=2610, streak=18),
    "user_elif":   dict(uid="user_elif",   display_name="Elif Ş.",   avatar="E", color="#C45E8A", xp=2380, streak=22),
    "user_hasan":  dict(uid="user_hasan",  display_name="Hasan Y.",  avatar="H", color="#4A6A8C", xp=1890, streak=14),
    "user_ayse":   dict(uid="user_ayse",   display_name="Ayşe T.",   avatar="A", color="#8B6F4A", xp=1740, streak=9),
}

def _ranked_leaderboard() -> list[LeaderboardEntry]:
    sorted_users = sorted(_LEADERBOARD.values(), key=lambda u: u["xp"], reverse=True)
    return [
        LeaderboardEntry(rank=i + 1, updated_at=datetime.now(timezone.utc).isoformat(), **u)
        for i, u in enumerate(sorted_users)
    ]

# ── Routes ────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "gemini": "configured" if client else "missing_key",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/ai-assistant", response_model=AIResponse)
async def ai_assistant(req: AIRequest):
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Gemini API anahtarı yapılandırılmamış. Render ortam değişkenlerini kontrol edin.",
        )

    session_id = req.session_id or f"kka_{datetime.now(timezone.utc).timestamp()}"

    try:
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=req.message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=1024,
            )
        )
        answer = (result.text or "").strip() or "Bu bilgiye ulaşılamadı."
        return AIResponse(response=answer, session_id=session_id)

    except Exception as exc:
        log.error("Gemini error: %s", exc)
        raise HTTPException(status_code=500, detail=f"AI servis hatası: {exc}")


@app.post("/api/course-chat", response_model=AIResponse)
async def course_chat(req: CourseChatRequest):
    if not GEMINI_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API anahtarı yapılandırılmamış."
        )

    import json
    from pathlib import Path
    DB_FILE = Path("course_files.json")

    # 1) Ders dosyalarını kontrol et
    if not DB_FILE.exists():
        log.warning("course_files.json bulunamadı. Kullanıcı doğrudan modele sorulacak.")
        file_info = None
    else:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            db = json.load(f)
        # Örn: 'KDB 122' formunda eşleştirme
        course_code = req.course_code.strip().upper()
        # '_' veya boşluk desteklemek için:
        alt_code = course_code.replace(" ", "_")
        
        file_info = db.get(course_code) or db.get(alt_code)

    try:
        system_instruction = f"Sen '{req.course_code}' dersinin uzman asistanısın. Sağlanan PDF belgesine dayanarak öğrencinin sorusunu yanıtla. Belgede yoksa genel uzmanlığını kullanarak ama belge dışı olduğunu belirterek kısa cevap ver."
        
        contents = []
        # Eğer PDF yüklenmişse referans veriyoruz
        if file_info:
            try:
                # Gemini File API'den dosyayı çek
                gemini_file = client.files.get(name=file_info["file_name"])
                contents.append(gemini_file)
            except Exception as e:
                log.error(f"Dosya referansı alınamadı: {e}")
        
        contents.append(req.message)

        # Gemini 2.5 Flash
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
                max_output_tokens=1024,
            )
        )
        answer = (result.text or "").strip() or "Bu bilgiye ulaşılamadı."
        
        if not file_info:
            answer = "⚠️ (Dersin arşivi sisteme henüz yüklenmemiş. Genel bilgilere dayanarak cevap veriyorum.)\n\n" + answer

        return AIResponse(response=answer, session_id="course_chat")

    except Exception as exc:
        log.error("Course chat error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Ders asistanı hatası: {exc}")


@app.get("/api/leaderboard")
async def get_leaderboard():
    return {"leaderboard": [e.dict() for e in _ranked_leaderboard()]}


@app.post("/api/leaderboard/score")
async def submit_score(body: ScoreSubmit):
    _LEADERBOARD[body.uid] = body.dict()
    board = _ranked_leaderboard()
    my_rank = next((e.rank for e in board if e.uid == body.uid), None)
    return {"rank": my_rank, "leaderboard": [e.dict() for e in board]}
