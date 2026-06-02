from fastapi import FastAPI, APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, Response, Request, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date, timedelta, timezone
import math
import asyncio
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage
from comparative_religions import COMPARATIVE_TEXTS, TOPICS, get_comparative_data, get_all_topics, search_comparative

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ===================== QURAN AUDIO RECITERS =====================
# Free Quran Audio API - Multiple Reciters from alquran.cloud
QURAN_RECITERS = {
    "alafasy": {
        "id": "ar.alafasy",
        "name": "Mishary Rashid Alafasy",
        "name_ar": "مشاري راشد العفاسي",
        "style": "Murattal",
        "quality": 128
    },
    "abdulbasit": {
        "id": "ar.abdulbasitmurattal",
        "name": "Abdul Basit Abdul Samad",
        "name_ar": "عبد الباسط عبد الصمد",
        "style": "Murattal",
        "quality": 192
    },
    "abdulbasit_mujawwad": {
        "id": "ar.abdulsamad",
        "name": "Abdul Basit (Mujawwad)",
        "name_ar": "عبد الباسط - مجود",
        "style": "Mujawwad",
        "quality": 64
    },
    "husary": {
        "id": "ar.husary",
        "name": "Mahmoud Khalil Al-Husary",
        "name_ar": "محمود خليل الحصري",
        "style": "Murattal",
        "quality": 128
    },
    "minshawi": {
        "id": "ar.minshawi",
        "name": "Mohamed Siddiq Al-Minshawi",
        "name_ar": "محمد صديق المنشاوي",
        "style": "Murattal",
        "quality": 128
    },
    "sudais": {
        "id": "ar.abdurrahmaansudais",
        "name": "Abdurrahman As-Sudais",
        "name_ar": "عبدالرحمن السديس",
        "style": "Murattal",
        "quality": 192
    },
    "shuraim": {
        "id": "ar.saabormohamad",
        "name": "Saud Al-Shuraim",
        "name_ar": "سعود الشريم",
        "style": "Murattal",
        "quality": 64
    },
    "ghamdi": {
        "id": "ar.ghamadi",
        "name": "Saad Al-Ghamdi",
        "name_ar": "سعد الغامدي",
        "style": "Murattal",
        "quality": 128
    }
}

# English Translation Audio
ENGLISH_RECITERS = {
    "sahih_intl": {
        "id": "en.sahih",
        "name": "Sahih International",
        "language": "en"
    },
    "ibrahim_walk": {
        "id": "en.walk",
        "name": "Ibrahim Walk",
        "language": "en"
    }
}

def get_audio_url(surah: int, ayah: int, reciter: str = "alafasy") -> str:
    """Get audio URL for a specific verse with selected reciter"""
    reciter_info = QURAN_RECITERS.get(reciter, QURAN_RECITERS["alafasy"])
    quality = reciter_info["quality"]
    reciter_id = reciter_info["id"]
    # Calculate verse number (global ayah number)
    verse_num = ayah
    if surah > 1:
        # Add previous surah verse counts
        verse_counts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]
        verse_num = sum(verse_counts[:surah-1]) + ayah
    return f"https://cdn.islamic.network/quran/audio/{quality}/{reciter_id}/{verse_num}.mp3"

def get_surah_audio_url(surah: int, reciter: str = "alafasy") -> str:
    """Get full surah audio URL"""
    reciter_info = QURAN_RECITERS.get(reciter, QURAN_RECITERS["alafasy"])
    quality = reciter_info["quality"]
    reciter_id = reciter_info["id"]
    return f"https://cdn.islamic.network/quran/audio-surah/{quality}/{reciter_id}/{surah}.mp3"

# ===================== LOAD QURAN DATA =====================
QURAN_ARABIC = None
QURAN_TURKISH = None
QURAN_ENGLISH = None

def load_quran_data():
    global QURAN_ARABIC, QURAN_TURKISH, QURAN_ENGLISH
    try:
        arabic_path = ROOT_DIR / 'data' / 'quran_arabic.json'
        turkish_path = ROOT_DIR / 'data' / 'quran_turkish.json'
        english_path = ROOT_DIR / 'data' / 'quran_english.json'
        
        if arabic_path.exists():
            with open(arabic_path, 'r', encoding='utf-8') as f:
                QURAN_ARABIC = json.load(f)['data']['surahs']
        
        if turkish_path.exists():
            with open(turkish_path, 'r', encoding='utf-8') as f:
                QURAN_TURKISH = json.load(f)['data']['surahs']
        
        if english_path.exists():
            with open(english_path, 'r', encoding='utf-8') as f:
                QURAN_ENGLISH = json.load(f)['data']['surahs']
        
        print(f"Loaded Quran data: {len(QURAN_ARABIC) if QURAN_ARABIC else 0} surahs (AR), {len(QURAN_TURKISH) if QURAN_TURKISH else 0} (TR), {len(QURAN_ENGLISH) if QURAN_ENGLISH else 0} (EN)")
    except Exception as e:
        print(f"Error loading Quran data: {e}")

load_quran_data()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Auth Config
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
SESSION_EXPIRY_DAYS = 7

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

# Auth Models
class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_guest: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    language: str = "tr"
    theme: str = "dark"
    total_points: int = 0
    quizzes_played: int = 0
    streak_days: int = 0

class UserSession(BaseModel):
    session_id: str
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# City Model
class City(BaseModel):
    id: str
    name: str
    country: str
    latitude: float
    longitude: float
    timezone: str
    qibla_direction: float

# Prayer Times
class PrayerTimes(BaseModel):
    city_id: str
    date: str
    fajr: str
    sunrise: str
    dhuhr: str
    asr: str
    maghrib: str
    isha: str

# AI Chat
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    session_id: str

# Hocaların Görüşü - Scholar Persona Request
class ScholarRequest(BaseModel):
    session_id: str
    question: str
    scholar_id: str

class ScholarResponse(BaseModel):
    response: str
    scholar_name: str
    sources: List[str]

# Pomodoro Session
class PomodoroSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    topic: str
    duration_minutes: int
    completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PomodoroCreate(BaseModel):
    user_id: str
    topic: str
    duration_minutes: int

class PomodoroUpdate(BaseModel):
    completed: bool

# User Preferences
class UserPreferences(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    city_id: str = "istanbul"
    madhab: str = "hanafi"
    language: str = "tr"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserPreferencesCreate(BaseModel):
    user_id: str
    city_id: str = "istanbul"
    madhab: str = "hanafi"
    language: str = "tr"

# Gamification Models
class UserStats(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    total_points: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    quran_pages_read: int = 0
    hadith_read: int = 0
    pomodoro_minutes: int = 0
    last_activity_date: str = ""
    badges: List[str] = []
    level: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    activity_type: str  # "quran_read", "hadith_read", "pomodoro", "prayer", "chat"
    points_earned: int
    details: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityCreate(BaseModel):
    user_id: str
    activity_type: str
    details: str = ""

# ===================== ALL CITIES DATA (81 Turkish Provinces + International) =====================

TURKISH_CITIES = [
    {"id": "istanbul", "name": "İstanbul", "country": "TR", "latitude": 41.0082, "longitude": 28.9784, "timezone": "Europe/Istanbul", "qibla_direction": 149.67},
    {"id": "ankara", "name": "Ankara", "country": "TR", "latitude": 39.9334, "longitude": 32.8597, "timezone": "Europe/Istanbul", "qibla_direction": 152.47},
    {"id": "izmir", "name": "İzmir", "country": "TR", "latitude": 38.4192, "longitude": 27.1287, "timezone": "Europe/Istanbul", "qibla_direction": 145.23},
    {"id": "bursa", "name": "Bursa", "country": "TR", "latitude": 40.1885, "longitude": 29.0610, "timezone": "Europe/Istanbul", "qibla_direction": 148.87},
    {"id": "antalya", "name": "Antalya", "country": "TR", "latitude": 36.8841, "longitude": 30.7056, "timezone": "Europe/Istanbul", "qibla_direction": 150.65},
    {"id": "adana", "name": "Adana", "country": "TR", "latitude": 37.0000, "longitude": 35.3213, "timezone": "Europe/Istanbul", "qibla_direction": 159.21},
    {"id": "konya", "name": "Konya", "country": "TR", "latitude": 37.8746, "longitude": 32.4932, "timezone": "Europe/Istanbul", "qibla_direction": 154.87},
    {"id": "gaziantep", "name": "Gaziantep", "country": "TR", "latitude": 37.0662, "longitude": 37.3833, "timezone": "Europe/Istanbul", "qibla_direction": 165.32},
    {"id": "kayseri", "name": "Kayseri", "country": "TR", "latitude": 38.7312, "longitude": 35.4787, "timezone": "Europe/Istanbul", "qibla_direction": 159.78},
    {"id": "samsun", "name": "Samsun", "country": "TR", "latitude": 41.2867, "longitude": 36.3300, "timezone": "Europe/Istanbul", "qibla_direction": 161.45},
    {"id": "trabzon", "name": "Trabzon", "country": "TR", "latitude": 41.0027, "longitude": 39.7168, "timezone": "Europe/Istanbul", "qibla_direction": 168.92},
    {"id": "eskisehir", "name": "Eskişehir", "country": "TR", "latitude": 39.7767, "longitude": 30.5206, "timezone": "Europe/Istanbul", "qibla_direction": 150.34},
    {"id": "diyarbakir", "name": "Diyarbakır", "country": "TR", "latitude": 37.9144, "longitude": 40.2306, "timezone": "Europe/Istanbul", "qibla_direction": 171.56},
    {"id": "erzurum", "name": "Erzurum", "country": "TR", "latitude": 39.9055, "longitude": 41.2658, "timezone": "Europe/Istanbul", "qibla_direction": 175.23},
    {"id": "mersin", "name": "Mersin", "country": "TR", "latitude": 36.8121, "longitude": 34.6415, "timezone": "Europe/Istanbul", "qibla_direction": 156.87},
    {"id": "adiyaman", "name": "Adıyaman", "country": "TR", "latitude": 37.7648, "longitude": 38.2786, "timezone": "Europe/Istanbul", "qibla_direction": 167.1},
    {"id": "afyonkarahisar", "name": "Afyonkarahisar", "country": "TR", "latitude": 38.7507, "longitude": 30.5567, "timezone": "Europe/Istanbul", "qibla_direction": 149.5},
    {"id": "agri", "name": "Ağrı", "country": "TR", "latitude": 39.7191, "longitude": 43.0503, "timezone": "Europe/Istanbul", "qibla_direction": 179.8},
    {"id": "aksaray", "name": "Aksaray", "country": "TR", "latitude": 38.3687, "longitude": 34.0370, "timezone": "Europe/Istanbul", "qibla_direction": 156.3},
    {"id": "amasya", "name": "Amasya", "country": "TR", "latitude": 40.6499, "longitude": 35.8353, "timezone": "Europe/Istanbul", "qibla_direction": 160.2},
    {"id": "ardahan", "name": "Ardahan", "country": "TR", "latitude": 41.1105, "longitude": 42.7022, "timezone": "Europe/Istanbul", "qibla_direction": 179.1},
    {"id": "artvin", "name": "Artvin", "country": "TR", "latitude": 41.1828, "longitude": 41.8183, "timezone": "Europe/Istanbul", "qibla_direction": 175.6},
    {"id": "aydin", "name": "Aydın", "country": "TR", "latitude": 37.8560, "longitude": 27.8416, "timezone": "Europe/Istanbul", "qibla_direction": 145.1},
    {"id": "balikesir", "name": "Balıkesir", "country": "TR", "latitude": 39.6484, "longitude": 27.8826, "timezone": "Europe/Istanbul", "qibla_direction": 145.7},
    {"id": "bartin", "name": "Bartın", "country": "TR", "latitude": 41.6344, "longitude": 32.3375, "timezone": "Europe/Istanbul", "qibla_direction": 155.4},
    {"id": "batman", "name": "Batman", "country": "TR", "latitude": 37.8812, "longitude": 41.1351, "timezone": "Europe/Istanbul", "qibla_direction": 173.6},
    {"id": "bayburt", "name": "Bayburt", "country": "TR", "latitude": 40.2552, "longitude": 40.2249, "timezone": "Europe/Istanbul", "qibla_direction": 172.3},
    {"id": "bilecik", "name": "Bilecik", "country": "TR", "latitude": 40.0567, "longitude": 30.0165, "timezone": "Europe/Istanbul", "qibla_direction": 149.1},
    {"id": "bingol", "name": "Bingöl", "country": "TR", "latitude": 38.8854, "longitude": 40.4966, "timezone": "Europe/Istanbul", "qibla_direction": 173.8},
    {"id": "bitlis", "name": "Bitlis", "country": "TR", "latitude": 38.4010, "longitude": 42.1095, "timezone": "Europe/Istanbul", "qibla_direction": 176.9},
    {"id": "bolu", "name": "Bolu", "country": "TR", "latitude": 40.7360, "longitude": 31.6061, "timezone": "Europe/Istanbul", "qibla_direction": 152.8},
    {"id": "burdur", "name": "Burdur", "country": "TR", "latitude": 37.7203, "longitude": 30.2908, "timezone": "Europe/Istanbul", "qibla_direction": 149.3},
    {"id": "canakkale", "name": "Çanakkale", "country": "TR", "latitude": 40.1553, "longitude": 26.4142, "timezone": "Europe/Istanbul", "qibla_direction": 142.7},
    {"id": "cankiri", "name": "Çankırı", "country": "TR", "latitude": 40.6013, "longitude": 33.6134, "timezone": "Europe/Istanbul", "qibla_direction": 157.1},
    {"id": "corum", "name": "Çorum", "country": "TR", "latitude": 40.5506, "longitude": 34.9556, "timezone": "Europe/Istanbul", "qibla_direction": 159.5},
    {"id": "denizli", "name": "Denizli", "country": "TR", "latitude": 37.7765, "longitude": 29.0864, "timezone": "Europe/Istanbul", "qibla_direction": 147.2},
    {"id": "duzce", "name": "Düzce", "country": "TR", "latitude": 40.8438, "longitude": 31.1565, "timezone": "Europe/Istanbul", "qibla_direction": 152.9},
    {"id": "edirne", "name": "Edirne", "country": "TR", "latitude": 41.6818, "longitude": 26.5623, "timezone": "Europe/Istanbul", "qibla_direction": 144.3},
    {"id": "elazig", "name": "Elazığ", "country": "TR", "latitude": 38.6810, "longitude": 39.2264, "timezone": "Europe/Istanbul", "qibla_direction": 169.2},
    {"id": "erzincan", "name": "Erzincan", "country": "TR", "latitude": 39.7500, "longitude": 39.4880, "timezone": "Europe/Istanbul", "qibla_direction": 170.1},
    {"id": "giresun", "name": "Giresun", "country": "TR", "latitude": 40.9128, "longitude": 38.3895, "timezone": "Europe/Istanbul", "qibla_direction": 166.8},
    {"id": "gumushane", "name": "Gümüşhane", "country": "TR", "latitude": 40.4386, "longitude": 39.5086, "timezone": "Europe/Istanbul", "qibla_direction": 169.7},
    {"id": "hakkari", "name": "Hakkari", "country": "TR", "latitude": 37.5833, "longitude": 43.7408, "timezone": "Europe/Istanbul", "qibla_direction": 182.1},
    {"id": "hatay", "name": "Hatay", "country": "TR", "latitude": 36.2021, "longitude": 36.1602, "timezone": "Europe/Istanbul", "qibla_direction": 161.5},
    {"id": "igdir", "name": "Iğdır", "country": "TR", "latitude": 39.9167, "longitude": 44.0500, "timezone": "Europe/Istanbul", "qibla_direction": 182.3},
    {"id": "isparta", "name": "Isparta", "country": "TR", "latitude": 37.7648, "longitude": 30.5566, "timezone": "Europe/Istanbul", "qibla_direction": 149.7},
    {"id": "kahramanmaras", "name": "Kahramanmaraş", "country": "TR", "latitude": 37.5858, "longitude": 36.9371, "timezone": "Europe/Istanbul", "qibla_direction": 163.4},
    {"id": "karabuk", "name": "Karabük", "country": "TR", "latitude": 41.2061, "longitude": 32.6204, "timezone": "Europe/Istanbul", "qibla_direction": 155.7},
    {"id": "karaman", "name": "Karaman", "country": "TR", "latitude": 37.1759, "longitude": 33.2287, "timezone": "Europe/Istanbul", "qibla_direction": 154.8},
    {"id": "kars", "name": "Kars", "country": "TR", "latitude": 40.6167, "longitude": 43.0975, "timezone": "Europe/Istanbul", "qibla_direction": 180.2},
    {"id": "kastamonu", "name": "Kastamonu", "country": "TR", "latitude": 41.3887, "longitude": 33.7827, "timezone": "Europe/Istanbul", "qibla_direction": 157.8},
    {"id": "kilis", "name": "Kilis", "country": "TR", "latitude": 36.7184, "longitude": 37.1212, "timezone": "Europe/Istanbul", "qibla_direction": 164.1},
    {"id": "kirikkale", "name": "Kırıkkale", "country": "TR", "latitude": 39.8468, "longitude": 33.5153, "timezone": "Europe/Istanbul", "qibla_direction": 155.9},
    {"id": "kirklareli", "name": "Kırklareli", "country": "TR", "latitude": 41.7353, "longitude": 27.2253, "timezone": "Europe/Istanbul", "qibla_direction": 144.9},
    {"id": "kirsehir", "name": "Kırşehir", "country": "TR", "latitude": 39.1425, "longitude": 34.1709, "timezone": "Europe/Istanbul", "qibla_direction": 157.2},
    {"id": "kocaeli", "name": "Kocaeli", "country": "TR", "latitude": 40.7654, "longitude": 29.9408, "timezone": "Europe/Istanbul", "qibla_direction": 149.3},
    {"id": "kutahya", "name": "Kütahya", "country": "TR", "latitude": 39.4167, "longitude": 29.9833, "timezone": "Europe/Istanbul", "qibla_direction": 148.5},
    {"id": "malatya", "name": "Malatya", "country": "TR", "latitude": 38.3552, "longitude": 38.3095, "timezone": "Europe/Istanbul", "qibla_direction": 166.7},
    {"id": "manisa", "name": "Manisa", "country": "TR", "latitude": 38.6191, "longitude": 27.4289, "timezone": "Europe/Istanbul", "qibla_direction": 144.8},
    {"id": "mardin", "name": "Mardin", "country": "TR", "latitude": 37.3212, "longitude": 40.7245, "timezone": "Europe/Istanbul", "qibla_direction": 172.8},
    {"id": "mugla", "name": "Muğla", "country": "TR", "latitude": 37.2153, "longitude": 28.3636, "timezone": "Europe/Istanbul", "qibla_direction": 145.8},
    {"id": "mus", "name": "Muş", "country": "TR", "latitude": 38.7432, "longitude": 41.5064, "timezone": "Europe/Istanbul", "qibla_direction": 175.3},
    {"id": "nevsehir", "name": "Nevşehir", "country": "TR", "latitude": 38.6939, "longitude": 34.6857, "timezone": "Europe/Istanbul", "qibla_direction": 158.1},
    {"id": "nigde", "name": "Niğde", "country": "TR", "latitude": 37.9667, "longitude": 34.6833, "timezone": "Europe/Istanbul", "qibla_direction": 157.4},
    {"id": "ordu", "name": "Ordu", "country": "TR", "latitude": 40.9839, "longitude": 37.8764, "timezone": "Europe/Istanbul", "qibla_direction": 165.4},
    {"id": "osmaniye", "name": "Osmaniye", "country": "TR", "latitude": 37.0746, "longitude": 36.2464, "timezone": "Europe/Istanbul", "qibla_direction": 161.2},
    {"id": "rize", "name": "Rize", "country": "TR", "latitude": 41.0201, "longitude": 40.5234, "timezone": "Europe/Istanbul", "qibla_direction": 170.8},
    {"id": "sakarya", "name": "Sakarya", "country": "TR", "latitude": 40.6940, "longitude": 30.4358, "timezone": "Europe/Istanbul", "qibla_direction": 150.8},
    {"id": "sanliurfa", "name": "Şanlıurfa", "country": "TR", "latitude": 37.1591, "longitude": 38.7969, "timezone": "Europe/Istanbul", "qibla_direction": 168.4},
    {"id": "siirt", "name": "Siirt", "country": "TR", "latitude": 37.9333, "longitude": 41.9500, "timezone": "Europe/Istanbul", "qibla_direction": 175.9},
    {"id": "sinop", "name": "Sinop", "country": "TR", "latitude": 42.0231, "longitude": 35.1531, "timezone": "Europe/Istanbul", "qibla_direction": 159.1},
    {"id": "sirnak", "name": "Şırnak", "country": "TR", "latitude": 37.4187, "longitude": 42.4918, "timezone": "Europe/Istanbul", "qibla_direction": 177.4},
    {"id": "sivas", "name": "Sivas", "country": "TR", "latitude": 39.7477, "longitude": 37.0179, "timezone": "Europe/Istanbul", "qibla_direction": 164.1},
    {"id": "tekirdag", "name": "Tekirdağ", "country": "TR", "latitude": 41.0027, "longitude": 27.5127, "timezone": "Europe/Istanbul", "qibla_direction": 144.1},
    {"id": "tokat", "name": "Tokat", "country": "TR", "latitude": 40.3167, "longitude": 36.5544, "timezone": "Europe/Istanbul", "qibla_direction": 162.7},
    {"id": "tunceli", "name": "Tunceli", "country": "TR", "latitude": 39.1079, "longitude": 39.5401, "timezone": "Europe/Istanbul", "qibla_direction": 170.4},
    {"id": "usak", "name": "Uşak", "country": "TR", "latitude": 38.6823, "longitude": 29.4082, "timezone": "Europe/Istanbul", "qibla_direction": 147.3},
    {"id": "van", "name": "Van", "country": "TR", "latitude": 38.4891, "longitude": 43.3832, "timezone": "Europe/Istanbul", "qibla_direction": 180.6},
    {"id": "yalova", "name": "Yalova", "country": "TR", "latitude": 40.6500, "longitude": 29.2667, "timezone": "Europe/Istanbul", "qibla_direction": 148.7},
    {"id": "yozgat", "name": "Yozgat", "country": "TR", "latitude": 39.8181, "longitude": 34.8147, "timezone": "Europe/Istanbul", "qibla_direction": 158.5},
    {"id": "zonguldak", "name": "Zonguldak", "country": "TR", "latitude": 41.4564, "longitude": 31.7987, "timezone": "Europe/Istanbul", "qibla_direction": 154.2},
]

INTERNATIONAL_CITIES = [
    # USA
    {"id": "new_york", "name": "New York", "country": "US", "latitude": 40.7128, "longitude": -74.0060, "timezone": "America/New_York", "qibla_direction": 58.48},
    {"id": "los_angeles", "name": "Los Angeles", "country": "US", "latitude": 34.0522, "longitude": -118.2437, "timezone": "America/Los_Angeles", "qibla_direction": 23.35},
    {"id": "chicago", "name": "Chicago", "country": "US", "latitude": 41.8781, "longitude": -87.6298, "timezone": "America/Chicago", "qibla_direction": 48.98},
    {"id": "houston", "name": "Houston", "country": "US", "latitude": 29.7604, "longitude": -95.3698, "timezone": "America/Chicago", "qibla_direction": 38.52},
    {"id": "washington_dc", "name": "Washington D.C.", "country": "US", "latitude": 38.9072, "longitude": -77.0369, "timezone": "America/New_York", "qibla_direction": 56.56},
    # UK
    {"id": "london", "name": "London", "country": "GB", "latitude": 51.5074, "longitude": -0.1278, "timezone": "Europe/London", "qibla_direction": 118.99},
    {"id": "birmingham", "name": "Birmingham", "country": "GB", "latitude": 52.4862, "longitude": -1.8904, "timezone": "Europe/London", "qibla_direction": 117.82},
    {"id": "manchester", "name": "Manchester", "country": "GB", "latitude": 53.4808, "longitude": -2.2426, "timezone": "Europe/London", "qibla_direction": 117.15},
    # Germany
    {"id": "berlin", "name": "Berlin", "country": "DE", "latitude": 52.5200, "longitude": 13.4050, "timezone": "Europe/Berlin", "qibla_direction": 136.56},
    {"id": "frankfurt", "name": "Frankfurt", "country": "DE", "latitude": 50.1109, "longitude": 8.6821, "timezone": "Europe/Berlin", "qibla_direction": 132.45},
    {"id": "cologne", "name": "Köln", "country": "DE", "latitude": 50.9375, "longitude": 6.9603, "timezone": "Europe/Berlin", "qibla_direction": 130.83},
    # France
    {"id": "paris", "name": "Paris", "country": "FR", "latitude": 48.8566, "longitude": 2.3522, "timezone": "Europe/Paris", "qibla_direction": 119.16},
    # Netherlands
    {"id": "amsterdam", "name": "Amsterdam", "country": "NL", "latitude": 52.3676, "longitude": 4.9041, "timezone": "Europe/Amsterdam", "qibla_direction": 127.06},
    # Spain
    {"id": "madrid", "name": "Madrid", "country": "ES", "latitude": 40.4168, "longitude": -3.7038, "timezone": "Europe/Madrid", "qibla_direction": 100.59},
    {"id": "barcelona", "name": "Barcelona", "country": "ES", "latitude": 41.3851, "longitude": 2.1734, "timezone": "Europe/Madrid", "qibla_direction": 111.79},
    # Saudi Arabia
    {"id": "mecca", "name": "Mekke", "country": "SA", "latitude": 21.3891, "longitude": 39.8579, "timezone": "Asia/Riyadh", "qibla_direction": 0.0},
    {"id": "medina", "name": "Medine", "country": "SA", "latitude": 24.5247, "longitude": 39.5692, "timezone": "Asia/Riyadh", "qibla_direction": 177.0},
    {"id": "riyadh", "name": "Riyad", "country": "SA", "latitude": 24.7136, "longitude": 46.6753, "timezone": "Asia/Riyadh", "qibla_direction": 245.32},
    {"id": "jeddah", "name": "Cidde", "country": "SA", "latitude": 21.4858, "longitude": 39.1925, "timezone": "Asia/Riyadh", "qibla_direction": 135.0},
    # UAE
    {"id": "dubai", "name": "Dubai", "country": "AE", "latitude": 25.2048, "longitude": 55.2708, "timezone": "Asia/Dubai", "qibla_direction": 258.72},
    # Egypt
    {"id": "cairo", "name": "Kahire", "country": "EG", "latitude": 30.0444, "longitude": 31.2357, "timezone": "Africa/Cairo", "qibla_direction": 136.46},
    # Malaysia
    {"id": "kuala_lumpur", "name": "Kuala Lumpur", "country": "MY", "latitude": 3.1390, "longitude": 101.6869, "timezone": "Asia/Kuala_Lumpur", "qibla_direction": 292.63},
    # Indonesia
    {"id": "jakarta", "name": "Jakarta", "country": "ID", "latitude": -6.2088, "longitude": 106.8456, "timezone": "Asia/Jakarta", "qibla_direction": 295.15},
    # Canada
    {"id": "toronto", "name": "Toronto", "country": "CA", "latitude": 43.6532, "longitude": -79.3832, "timezone": "America/Toronto", "qibla_direction": 54.56},
    # Australia
    {"id": "sydney", "name": "Sydney", "country": "AU", "latitude": -33.8688, "longitude": 151.2093, "timezone": "Australia/Sydney", "qibla_direction": 277.50},
]

ALL_CITIES = TURKISH_CITIES + INTERNATIONAL_CITIES

# Country labels per language
COUNTRY_LABELS = {
    "TR": {"tr": "Türkiye", "en": "Turkey", "ar": "تركيا", "es": "Turquía"},
    "US": {"tr": "ABD", "en": "USA", "ar": "الولايات المتحدة", "es": "EE.UU."},
    "GB": {"tr": "İngiltere", "en": "United Kingdom", "ar": "المملكة المتحدة", "es": "Reino Unido"},
    "DE": {"tr": "Almanya", "en": "Germany", "ar": "ألمانيا", "es": "Alemania"},
    "FR": {"tr": "Fransa", "en": "France", "ar": "فرنسا", "es": "Francia"},
    "NL": {"tr": "Hollanda", "en": "Netherlands", "ar": "هولندا", "es": "Países Bajos"},
    "ES": {"tr": "İspanya", "en": "Spain", "ar": "إسبانيا", "es": "España"},
    "SA": {"tr": "Suudi Arabistan", "en": "Saudi Arabia", "ar": "المملكة العربية السعودية", "es": "Arabia Saudita"},
    "AE": {"tr": "BAE", "en": "UAE", "ar": "الإمارات", "es": "EAU"},
    "EG": {"tr": "Mısır", "en": "Egypt", "ar": "مصر", "es": "Egipto"},
    "MY": {"tr": "Malezya", "en": "Malaysia", "ar": "ماليزيا", "es": "Malasia"},
    "ID": {"tr": "Endonezya", "en": "Indonesia", "ar": "إندونيسيا", "es": "Indonesia"},
    "CA": {"tr": "Kanada", "en": "Canada", "ar": "كندا", "es": "Canadá"},
    "AU": {"tr": "Avustralya", "en": "Australia", "ar": "أستراليا", "es": "Australia"},
}

# Default country for each language
LANG_DEFAULT_COUNTRY = {"tr": "TR", "en": "US", "ar": "SA", "es": "ES"}

# ===================== SCHOLARS DATA (HOCALAR) =====================

SCHOLARS = [
    {
        "id": "nihat_hatipoglu",
        "name": "Prof. Dr. Nihat Hatipoğlu",
        "title": "İlahiyatçı, TV Programcısı",
        "style": "Halka yakın, duygusal, hikayeli anlatım, güncel örneklerle açıklama",
        "specialty": "Siyer, Hadis, Güncel Meseleler",
        "image": "nihat_hatipoglu.jpg",
        "sources": ["Diyanet İşleri Başkanlığı", "Sahih Hadis Kaynakları", "Siyer Kitapları"]
    },
    {
        "id": "hayrettin_karaman",
        "name": "Prof. Dr. Hayrettin Karaman",
        "title": "İslam Hukuku Profesörü",
        "style": "Akademik, detaylı, mezhep karşılaştırmalı, fıkhi derinlik",
        "specialty": "Fıkıh, İslam Hukuku, Güncel Fetvalar",
        "image": "hayrettin_karaman.jpg",
        "sources": ["hayrettinkaraman.net", "İslam Hukuku Kaynakları", "Klasik Fıkıh Kitapları"]
    },
    {
        "id": "mustafa_islamoglu",
        "name": "Mustafa İslamoğlu",
        "title": "Tefsir Uzmanı, Yazar",
        "style": "Analitik, Kur'an merkezli, linguistik yaklaşım, modern yorumlama",
        "specialty": "Tefsir, Kur'an Dili, Meal",
        "image": "mustafa_islamoglu.jpg",
        "sources": ["Hayat Kitabı Kur'an", "Meal ve Tefsir Çalışmaları"]
    },
    {
        "id": "diyanet",
        "name": "Diyanet İşleri Başkanlığı",
        "title": "Resmi Dini Kurum",
        "style": "Resmi, dengeli, genel kabul görmüş görüşler, Hanefi ağırlıklı",
        "specialty": "Fetvalar, İbadet, Günlük Dini Meseleler",
        "image": "diyanet.jpg",
        "sources": ["diyanet.gov.tr", "Din İşleri Yüksek Kurulu Kararları"]
    },
    {
        "id": "omer_nasuhi",
        "name": "Ömer Nasuhi Bilmen",
        "title": "Eski Diyanet İşleri Başkanı",
        "style": "Klasik, detaylı, Osmanlı ilim geleneği, kapsamlı",
        "specialty": "Fıkıh, İlmihal, Tefsir",
        "image": "omer_nasuhi.jpg",
        "sources": ["Büyük İslam İlmihali", "Kur'an-ı Kerim'in Türkçe Meal-i Âlisi ve Tefsiri"]
    },
    {
        "id": "elmalili",
        "name": "Elmalılı Muhammed Hamdi Yazır",
        "title": "Müfessir, Alim",
        "style": "Derin tefsir, Arapça/Osmanlıca terminoloji, ilmi derinlik",
        "specialty": "Tefsir, Felsefe, Kelam",
        "image": "elmalili.jpg",
        "sources": ["Hak Dini Kur'an Dili Tefsiri"]
    },
    {
        "id": "said_nursi",
        "name": "Bediüzzaman Said Nursi",
        "title": "İslam Alimi, Müellif",
        "style": "Felsefi, iman esaslı, modern sorulara cevap, derin tefekkür",
        "specialty": "İman, Felsefe, Modern Çağ Sorunları",
        "image": "said_nursi.jpg",
        "sources": ["Risale-i Nur Külliyatı", "erisale.com"]
    }
]

# ===================== QURAN DATA (SURELER) =====================

SURAHS = [
    {"number": 1, "name": "Fatiha", "arabic": "الفاتحة", "meaning": "Açılış", "verses": 7, "revelation": "Mekke", "juz": 1},
    {"number": 2, "name": "Bakara", "arabic": "البقرة", "meaning": "Sığır", "verses": 286, "revelation": "Medine", "juz": 1},
    {"number": 3, "name": "Al-i İmran", "arabic": "آل عمران", "meaning": "İmran Ailesi", "verses": 200, "revelation": "Medine", "juz": 3},
    {"number": 4, "name": "Nisa", "arabic": "النساء", "meaning": "Kadınlar", "verses": 176, "revelation": "Medine", "juz": 4},
    {"number": 5, "name": "Maide", "arabic": "المائدة", "meaning": "Sofra", "verses": 120, "revelation": "Medine", "juz": 6},
    {"number": 6, "name": "En'am", "arabic": "الأنعام", "meaning": "Hayvanlar", "verses": 165, "revelation": "Mekke", "juz": 7},
    {"number": 7, "name": "A'raf", "arabic": "الأعراف", "meaning": "Yüksekler", "verses": 206, "revelation": "Mekke", "juz": 8},
    {"number": 8, "name": "Enfal", "arabic": "الأنفال", "meaning": "Ganimetler", "verses": 75, "revelation": "Medine", "juz": 9},
    {"number": 9, "name": "Tevbe", "arabic": "التوبة", "meaning": "Tövbe", "verses": 129, "revelation": "Medine", "juz": 10},
    {"number": 10, "name": "Yunus", "arabic": "يونس", "meaning": "Yunus", "verses": 109, "revelation": "Mekke", "juz": 11},
    {"number": 36, "name": "Yasin", "arabic": "يس", "meaning": "Yasin", "verses": 83, "revelation": "Mekke", "juz": 22},
    {"number": 55, "name": "Rahman", "arabic": "الرحمن", "meaning": "Esirgeyen", "verses": 78, "revelation": "Medine", "juz": 27},
    {"number": 56, "name": "Vakıa", "arabic": "الواقعة", "meaning": "Kıyamet", "verses": 96, "revelation": "Mekke", "juz": 27},
    {"number": 67, "name": "Mülk", "arabic": "الملك", "meaning": "Egemenlik", "verses": 30, "revelation": "Mekke", "juz": 29},
    {"number": 78, "name": "Nebe", "arabic": "النبأ", "meaning": "Haber", "verses": 40, "revelation": "Mekke", "juz": 30},
    {"number": 112, "name": "İhlas", "arabic": "الإخلاص", "meaning": "Samimiyet", "verses": 4, "revelation": "Mekke", "juz": 30},
    {"number": 113, "name": "Felak", "arabic": "الفلق", "meaning": "Şafak", "verses": 5, "revelation": "Mekke", "juz": 30},
    {"number": 114, "name": "Nas", "arabic": "الناس", "meaning": "İnsanlar", "verses": 6, "revelation": "Mekke", "juz": 30},
]

# Sample verses for popular surahs
SAMPLE_VERSES = {
    "fatiha": [
        {"verse": 1, "arabic": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "turkish": "Rahman ve Rahim olan Allah'ın adıyla", "transliteration": "Bismillahirrahmanirrahim"},
        {"verse": 2, "arabic": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", "turkish": "Hamd, âlemlerin Rabbi Allah'a mahsustur", "transliteration": "Elhamdulillahi rabbil alemin"},
        {"verse": 3, "arabic": "الرَّحْمَٰنِ الرَّحِيمِ", "turkish": "O, Rahman'dır, Rahim'dir", "transliteration": "Er-rahmanir-rahim"},
        {"verse": 4, "arabic": "مَالِكِ يَوْمِ الدِّينِ", "turkish": "Din gününün sahibidir", "transliteration": "Maliki yevmiddin"},
        {"verse": 5, "arabic": "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", "turkish": "Yalnız sana ibadet eder, yalnız senden yardım dileriz", "transliteration": "İyyake na'budu ve iyyake nesta'in"},
        {"verse": 6, "arabic": "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", "turkish": "Bizi doğru yola ilet", "transliteration": "İhdinas-sıratal mustakim"},
        {"verse": 7, "arabic": "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", "turkish": "Nimet verdiklerinin yoluna; gazaba uğrayanların ve sapkınların yoluna değil", "transliteration": "Sıratal-ledhine en'amte aleyhim, ğayril mağdubi aleyhim ve led-dallin"},
    ],
    "ihlas": [
        {"verse": 1, "arabic": "قُلْ هُوَ اللَّهُ أَحَدٌ", "turkish": "De ki: O Allah birdir", "transliteration": "Kul huvallahu ehad"},
        {"verse": 2, "arabic": "اللَّهُ الصَّمَدُ", "turkish": "Allah Samed'dir (her şey O'na muhtaç, O hiçbir şeye muhtaç değil)", "transliteration": "Allahus-samed"},
        {"verse": 3, "arabic": "لَمْ يَلِدْ وَلَمْ يُولَدْ", "turkish": "Doğurmamıştır, doğurulmamıştır", "transliteration": "Lem yelid ve lem yuled"},
        {"verse": 4, "arabic": "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", "turkish": "Hiçbir şey O'nun dengi değildir", "transliteration": "Ve lem yekun lehu kufuven ehad"},
    ],
    "nas": [
        {"verse": 1, "arabic": "قُلْ أَعُوذُ بِرَبِّ النَّاسِ", "turkish": "De ki: İnsanların Rabbine sığınırım", "transliteration": "Kul e'uzu bi rabbin-nas"},
        {"verse": 2, "arabic": "مَلِكِ النَّاسِ", "turkish": "İnsanların melikine (hükümdarına)", "transliteration": "Melikin-nas"},
        {"verse": 3, "arabic": "إِلَٰهِ النَّاسِ", "turkish": "İnsanların ilahına", "transliteration": "İlahin-nas"},
        {"verse": 4, "arabic": "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", "turkish": "Sinsi vesvesecinin şerrinden", "transliteration": "Min şerril-vesvasil-hannas"},
        {"verse": 5, "arabic": "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ", "turkish": "O ki insanların göğüslerine vesvese verir", "transliteration": "Ellezi yuvesvisu fi sudurin-nas"},
        {"verse": 6, "arabic": "مِنَ الْجِنَّةِ وَالنَّاسِ", "turkish": "Cinlerden ve insanlardan", "transliteration": "Minel-cinneti ven-nas"},
    ]
}

# ===================== HADITH DATA =====================

HADITH_CATEGORIES = [
    {"id": "iman", "name": "İman", "description": "İman esasları ve inanç konuları"},
    {"id": "namaz", "name": "Namaz", "description": "Namaz ile ilgili hadisler"},
    {"id": "oruc", "name": "Oruç", "description": "Oruç ve Ramazan"},
    {"id": "zekat", "name": "Zekat", "description": "Zekat ve sadaka"},
    {"id": "hac", "name": "Hac", "description": "Hac ve umre"},
    {"id": "ahlak", "name": "Ahlak", "description": "Güzel ahlak ve davranışlar"},
    {"id": "aile", "name": "Aile", "description": "Aile hayatı ve evlilik"},
    {"id": "ilim", "name": "İlim", "description": "İlim öğrenme ve öğretme"},
    {"id": "dua", "name": "Dua", "description": "Dualar ve zikirler"},
]

SAMPLE_HADITHS = [
    {
        "id": "h1",
        "arabic": "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
        "turkish": "Ameller niyetlere göredir.",
        "source": "Buhari, Müslim",
        "narrator": "Hz. Ömer (r.a.)",
        "category": "iman",
        "explanation": "Bu hadis-i şerif, İslam'ın temel prensiplerinden birini açıklar. Her amelin değeri, arkasındaki niyete bağlıdır.",
        "authenticity": "Sahih"
    },
    {
        "id": "h2",
        "arabic": "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
        "turkish": "Müslüman, dilinden ve elinden diğer Müslümanların güvende olduğu kimsedir.",
        "source": "Buhari, Müslim",
        "narrator": "Hz. Abdullah bin Amr (r.a.)",
        "category": "ahlak",
        "explanation": "Gerçek Müslümanlık, başkalarına zarar vermemek ve toplum içinde güvenilir olmakla ölçülür.",
        "authenticity": "Sahih"
    },
    {
        "id": "h3",
        "arabic": "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
        "turkish": "Sizden biriniz, kendisi için sevdiğini kardeşi için de sevmedikçe gerçek mümin olamaz.",
        "source": "Buhari, Müslim",
        "narrator": "Hz. Enes (r.a.)",
        "category": "iman",
        "explanation": "İmanın kemali, kardeşlik duygusunun samimiyetiyle ölçülür.",
        "authenticity": "Sahih"
    },
    {
        "id": "h4",
        "arabic": "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
        "turkish": "Allah'a ve ahiret gününe iman eden kimse ya hayır söylesin ya da sussun.",
        "source": "Buhari, Müslim",
        "narrator": "Hz. Ebu Hureyre (r.a.)",
        "category": "ahlak",
        "explanation": "Dilin korunması ve söz söylemede dikkatli olunması gerektiğini vurgular.",
        "authenticity": "Sahih"
    },
    {
        "id": "h5",
        "arabic": "الطُّهُورُ شَطْرُ الْإِيمَانِ",
        "turkish": "Temizlik imanın yarısıdır.",
        "source": "Müslim",
        "narrator": "Hz. Ebu Malik el-Eş'ari (r.a.)",
        "category": "iman",
        "explanation": "İslam'da temizliğin önemi ve imanla olan bağlantısı vurgulanır.",
        "authenticity": "Sahih"
    },
    {
        "id": "h6",
        "arabic": "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
        "turkish": "En hayırlınız Kur'an'ı öğrenen ve öğretendir.",
        "source": "Buhari",
        "narrator": "Hz. Osman (r.a.)",
        "category": "ilim",
        "explanation": "Kur'an eğitiminin fazileti ve önemi anlatılır.",
        "authenticity": "Sahih"
    },
    {
        "id": "h7",
        "arabic": "الصَّلَوَاتُ الْخَمْسُ كَفَّارَاتٌ لِمَا بَيْنَهُنَّ",
        "turkish": "Beş vakit namaz, aralarındaki günahlara kefarettir.",
        "source": "Müslim",
        "narrator": "Hz. Ebu Hureyre (r.a.)",
        "category": "namaz",
        "explanation": "Beş vakit namazın günahları temizlediği müjdelenir.",
        "authenticity": "Sahih"
    },
    {
        "id": "h8",
        "arabic": "مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ",
        "turkish": "Kim inanarak ve sevabını Allah'tan bekleyerek Ramazan orucunu tutarsa, geçmiş günahları bağışlanır.",
        "source": "Buhari, Müslim",
        "narrator": "Hz. Ebu Hureyre (r.a.)",
        "category": "oruc",
        "explanation": "Ramazan orucunun faziletleri ve mükafatı açıklanır.",
        "authenticity": "Sahih"
    },
    {
        "id": "h9",
        "arabic": "الدُّعَاءُ هُوَ الْعِبَادَةُ",
        "turkish": "Dua ibadetin özüdür.",
        "source": "Tirmizi, Ebu Davud",
        "narrator": "Hz. Nu'man bin Beşir (r.a.)",
        "category": "dua",
        "explanation": "Duanın ibadet içindeki merkezi konumu vurgulanır.",
        "authenticity": "Sahih"
    },
    {
        "id": "h10",
        "arabic": "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
        "turkish": "İlim öğrenmek her Müslümana farzdır.",
        "source": "İbn Mace",
        "narrator": "Hz. Enes (r.a.)",
        "category": "ilim",
        "explanation": "İlim öğrenmenin dini bir vecibe olduğu belirtilir.",
        "authenticity": "Hasen"
    }
]

# ===================== BADGES DATA =====================

BADGES = [
    {"id": "first_step", "name": "İlk Adım", "description": "İlk aktiviteni tamamladın", "icon": "footsteps", "points_required": 0},
    {"id": "quran_starter", "name": "Kur'an Yolcusu", "description": "İlk surenizi okudunuz", "icon": "book", "points_required": 10},
    {"id": "hadith_learner", "name": "Hadis Öğrencisi", "description": "10 hadis okudunuz", "icon": "school", "points_required": 50},
    {"id": "streak_3", "name": "Kararlı", "description": "3 gün üst üste aktif oldunuz", "icon": "flame", "points_required": 0},
    {"id": "streak_7", "name": "Azimli", "description": "7 gün üst üste aktif oldunuz", "icon": "flame", "points_required": 0},
    {"id": "streak_30", "name": "Sebatkâr", "description": "30 gün üst üste aktif oldunuz", "icon": "trophy", "points_required": 0},
    {"id": "pomodoro_master", "name": "İlim Ustası", "description": "100 dakika odaklanma tamamladınız", "icon": "timer", "points_required": 100},
    {"id": "scholar_seeker", "name": "Alim Araştırmacısı", "description": "5 hocadan görüş aldınız", "icon": "people", "points_required": 75},
    {"id": "level_5", "name": "Seviye 5", "description": "5. seviyeye ulaştınız", "icon": "star", "points_required": 500},
    {"id": "level_10", "name": "Seviye 10", "description": "10. seviyeye ulaştınız", "icon": "star", "points_required": 1000},
]

# ===================== PRAYER TIME CALCULATION =====================

def calculate_prayer_times(latitude: float, longitude: float, date_obj: date, madhab: str = "hanafi") -> dict:
    """Calculate prayer times using Diyanet method for Turkey"""
    import math
    
    day_of_year = date_obj.timetuple().tm_yday
    B = 2 * math.pi * (day_of_year - 81) / 365
    equation_of_time = 9.87 * math.sin(2 * B) - 7.53 * math.cos(B) - 1.5 * math.sin(B)
    declination = 23.45 * math.sin(2 * math.pi * (day_of_year - 81) / 365)
    
    timezone_offset = 3
    solar_noon = 12 - equation_of_time / 60 - longitude / 15 + timezone_offset
    
    lat_rad = math.radians(latitude)
    dec_rad = math.radians(declination)
    
    def time_for_angle(angle):
        angle_rad = math.radians(angle)
        cos_hour_angle = (math.sin(angle_rad) - math.sin(lat_rad) * math.sin(dec_rad)) / (math.cos(lat_rad) * math.cos(dec_rad))
        if cos_hour_angle > 1 or cos_hour_angle < -1:
            return None
        hour_angle = math.degrees(math.acos(cos_hour_angle)) / 15
        return hour_angle
    
    fajr_angle = time_for_angle(-18)
    fajr = solar_noon - fajr_angle if fajr_angle else solar_noon - 1.5
    
    sunrise_angle = time_for_angle(-0.833)
    sunrise = solar_noon - sunrise_angle if sunrise_angle else solar_noon - 0.5
    
    dhuhr = solar_noon + 0.083
    
    if madhab == "hanafi":
        asr_shadow_ratio = 2
    else:
        asr_shadow_ratio = 1
    
    asr_altitude = math.degrees(math.atan(1 / (asr_shadow_ratio + math.tan(lat_rad - dec_rad))))
    asr_angle = time_for_angle(asr_altitude)
    asr = solar_noon + asr_angle if asr_angle else solar_noon + 3
    
    maghrib_angle = time_for_angle(-0.833)
    maghrib = solar_noon + maghrib_angle + 0.05 if maghrib_angle else solar_noon + 6
    
    isha_angle = time_for_angle(-17)
    isha = solar_noon + isha_angle if isha_angle else maghrib + 1.5
    
    def format_time(hours):
        hours = hours % 24
        h = int(hours)
        m = int((hours - h) * 60)
        return f"{h:02d}:{m:02d}"
    
    return {
        "fajr": format_time(fajr),
        "sunrise": format_time(sunrise),
        "dhuhr": format_time(dhuhr),
        "asr": format_time(asr),
        "maghrib": format_time(maghrib),
        "isha": format_time(isha)
    }

# ===================== GAMIFICATION HELPERS =====================

POINTS_CONFIG = {
    "quran_read": 10,
    "hadith_read": 5,
    "pomodoro": 15,
    "scholar_question": 8,
    "chat": 3,
    "daily_login": 5,
}

def calculate_level(points: int) -> int:
    """Calculate level based on points"""
    if points < 50:
        return 1
    elif points < 150:
        return 2
    elif points < 300:
        return 3
    elif points < 500:
        return 4
    elif points < 750:
        return 5
    elif points < 1000:
        return 6
    elif points < 1500:
        return 7
    elif points < 2000:
        return 8
    elif points < 3000:
        return 9
    else:
        return 10

def get_earned_badges(stats: dict) -> List[str]:
    """Check which badges user has earned"""
    badges = []
    
    if stats.get("total_points", 0) > 0:
        badges.append("first_step")
    if stats.get("quran_pages_read", 0) >= 1:
        badges.append("quran_starter")
    if stats.get("hadith_read", 0) >= 10:
        badges.append("hadith_learner")
    if stats.get("current_streak", 0) >= 3:
        badges.append("streak_3")
    if stats.get("current_streak", 0) >= 7:
        badges.append("streak_7")
    if stats.get("current_streak", 0) >= 30:
        badges.append("streak_30")
    if stats.get("pomodoro_minutes", 0) >= 100:
        badges.append("pomodoro_master")
    if stats.get("level", 1) >= 5:
        badges.append("level_5")
    if stats.get("level", 1) >= 10:
        badges.append("level_10")
    
    return badges

# ===================== ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "İslami Yaşam Asistanı API", "version": "2.0"}

# ===================== AUTHENTICATION API =====================

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> Optional[User]:
    """Get current authenticated user from cookie or header"""
    token = session_token
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user:
        return User(**user)
    return None

@api_router.post("/auth/session")
async def exchange_session(session_id: str, response: Response):
    """Exchange session_id from OAuth callback for session token"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = resp.json()
            email = auth_data.get("email")
            name = auth_data.get("name")
            picture = auth_data.get("picture")
            session_token = auth_data.get("session_token")
            
            # Check if user exists
            existing_user = await db.users.find_one({"email": email}, {"_id": 0})
            
            if existing_user:
                user_id = existing_user["user_id"]
                # Update user info
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"name": name, "picture": picture}}
                )
            else:
                # Create new user
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                new_user = {
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "is_guest": False,
                    "created_at": datetime.now(timezone.utc),
                    "language": "tr",
                    "theme": "dark",
                    "total_points": 0,
                    "quizzes_played": 0,
                    "streak_days": 0
                }
                await db.users.insert_one(new_user)
            
            # Create session
            expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
            session_doc = {
                "session_id": str(uuid.uuid4()),
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc)
            }
            await db.user_sessions.insert_one(session_doc)
            
            # Set cookie
            response.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
                secure=True,
                samesite="none",
                path="/",
                max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
            )
            
            # Get user data
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            return user
            
    except httpx.RequestError as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error")

@api_router.post("/auth/guest")
async def create_guest_user(response: Response):
    """Create a guest user for quick access"""
    user_id = f"guest_{uuid.uuid4().hex[:12]}"
    session_token = f"guest_session_{uuid.uuid4().hex}"
    
    new_user = {
        "user_id": user_id,
        "email": f"{user_id}@guest.local",
        "name": "Misafir Kullanıcı",
        "picture": None,
        "is_guest": True,
        "created_at": datetime.now(timezone.utc),
        "language": "tr",
        "theme": "dark",
        "total_points": 0,
        "quizzes_played": 0,
        "streak_days": 0
    }
    await db.users.insert_one(new_user)
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    # Remove MongoDB _id before returning
    new_user.pop("_id", None)
    return new_user

@api_router.get("/auth/me")
async def get_current_user_info(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current authenticated user info"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.dict()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout and clear session"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.put("/auth/profile")
async def update_profile(
    request: Request,
    language: Optional[str] = None,
    theme: Optional[str] = None,
    name: Optional[str] = None,
    session_token: Optional[str] = Cookie(None)
):
    """Update user profile settings"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    update_data = {}
    if language:
        update_data["language"] = language
    if theme:
        update_data["theme"] = theme
    if name:
        update_data["name"] = name
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user

# ===================== STATUS CHECK API =====================

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Cities
@api_router.get("/cities")
async def get_cities(country: str = None, lang: str = "tr"):
    """Get cities, optionally filtered by country code"""
    cities = ALL_CITIES
    if country:
        cities = [c for c in ALL_CITIES if c["country"] == country.upper()]
    result = []
    for c in cities:
        country_label = COUNTRY_LABELS.get(c["country"], {}).get(lang, c["country"])
        result.append({**c, "country_name": country_label})
    return result

@api_router.get("/cities/{city_id}")
async def get_city(city_id: str):
    for city in ALL_CITIES:
        if city["id"] == city_id:
            return city
    raise HTTPException(status_code=404, detail="City not found")

# Prayer Times
@api_router.get("/prayer-times/{city_id}")
async def get_prayer_times(city_id: str, madhab: str = "hanafi"):
    city = None
    for c in ALL_CITIES:
        if c["id"] == city_id:
            city = c
            break
    
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    
    today = date.today()
    times = calculate_prayer_times(city["latitude"], city["longitude"], today, madhab)
    
    return {
        "city_id": city_id,
        "city_name": city["name"],
        "country": city["country"],
        "date": today.isoformat(),
        "qibla_direction": city["qibla_direction"],
        **times
    }


# ===================== TAFSIR (TEFSİR) SYSTEM =====================

TAFSIR_SCHOLARS = {
    "ibn_kesir": {"id": "ibn_kesir", "name": "İbn Kesir", "name_ar": "ابن كثير", "name_en": "Ibn Kathir", "era": "1300-1373", "school": "Hanbeli"},
    "taberi": {"id": "taberi", "name": "Taberi", "name_ar": "الطبري", "name_en": "Al-Tabari", "era": "839-923", "school": "Şafii"},
    "elmalili": {"id": "elmalili", "name": "Elmalılı Hamdi Yazır", "name_ar": "الملالي حمدي يازر", "name_en": "Elmalılı Hamdi Yazır", "era": "1878-1942", "school": "Hanefi"},
    "razi": {"id": "razi", "name": "Fahreddin Razi", "name_ar": "فخر الدين الرازي", "name_en": "Fakhr al-Din al-Razi", "era": "1149-1209", "school": "Şafii"},
}

@api_router.get("/tafsir/scholars")
async def get_tafsir_scholars():
    return list(TAFSIR_SCHOLARS.values())

@api_router.get("/tafsir/{surah_number}/{verse_number}")
async def get_tafsir(surah_number: int, verse_number: int, scholar: str = None, lang: str = "tr"):
    """Get tafsir for a specific verse from MongoDB or generate via AI"""
    query = {"surah_number": surah_number, "verse_number": verse_number, "language": lang}
    if scholar:
        query["scholar_name"] = scholar
    
    # Check cache in MongoDB
    cached = await db.tafsir.find(query, {"_id": 0}).to_list(length=10)
    if cached:
        return cached
    
    # Generate via AI if not cached
    if not EMERGENT_LLM_KEY:
        return []
    
    scholars_to_gen = [scholar] if scholar else list(TAFSIR_SCHOLARS.keys())
    results = []
    
    for s_id in scholars_to_gen:
        s_info = TAFSIR_SCHOLARS.get(s_id)
        if not s_info:
            continue
        
        # Get verse text for context
        verse_text = ""
        if QURAN_ARABIC and surah_number <= len(QURAN_ARABIC):
            surah = QURAN_ARABIC[surah_number - 1]
            for ayah in surah.get('ayahs', []):
                if ayah.get('numberInSurah') == verse_number:
                    verse_text = ayah.get('text', '')
                    break
        
        turkish_text = ""
        if QURAN_TURKISH and surah_number <= len(QURAN_TURKISH):
            surah_tr = QURAN_TURKISH[surah_number - 1]
            for ayah in surah_tr.get('ayahs', []):
                if ayah.get('numberInSurah') == verse_number:
                    turkish_text = ayah.get('text', '')
                    break
        
        tr_name, _ = TURKISH_SURAH_NAMES.get(surah_number, ("", ""))
        
        lang_instruction = {
            "tr": "Türkçe olarak yaz.",
            "en": "Write in English.",
            "ar": "اكتب باللغة العربية.",
            "es": "Escribe en español."
        }.get(lang, "Türkçe olarak yaz.")
        
        prompt = f"""{s_info['name']} ({s_info['era']}) tefsir ekolünden, {tr_name} suresi {verse_number}. ayetinin tefsirini yaz.
Ayet (Arapça): {verse_text}
Ayet (Türkçe): {turkish_text}

Bu alimin bakış açısını, ilmi tarzını ve tefsir metodolojisini yansıt.
Tefsiri 3-5 paragraf olarak, kapsamlı ve öğretici bir şekilde yaz.
{lang_instruction}"""
        
        try:
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, model="claude-sonnet-4-20250514")
            response = await asyncio.to_thread(chat.send_message, UserMessage(content=prompt))
            tafsir_text = response.content
            
            tafsir_doc = {
                "surah_number": surah_number,
                "verse_number": verse_number,
                "scholar_name": s_id,
                "scholar_display_name": s_info["name"],
                "tafsir_text": tafsir_text,
                "language": lang,
            }
            # Cache in MongoDB
            await db.tafsir.insert_one({**tafsir_doc, "created_at": datetime.now(timezone.utc)})
            tafsir_doc.pop("_id", None)
            results.append(tafsir_doc)
        except Exception as e:
            logger.error(f"Tafsir generation error for {s_id}: {e}")
    
    return results

# ===================== LANGUAGE / i18n =====================

UI_TRANSLATIONS = {
    "tr": {
        "app_title": "İslami Yaşam Asistanı",
        "greeting": "Hayırlı günler",
        "bismillah": "Bismillahirrahmanirrahim",
        "explore": "Keşfet",
        "quran": "Kur'an-ı Kerim",
        "quran_desc": "114 Sure - Arapça & Türkçe Meal",
        "hadith": "Hadis-i Şerif",
        "hadith_desc": "Sahih Hadisler & Açıklamaları",
        "advisor": "İslami Danışman",
        "advisor_desc": "AI Destekli Sohbet",
        "scholars": "Hocaların Görüşü",
        "scholars_desc": "Alimlerin bakış açısı",
        "quiz": "İslam Quiz",
        "quiz_desc": "Bilgini Test Et",
        "daily_verse": "Günün Ayeti",
        "search_surah": "Sure ara...",
        "listen_meal": "Türkçe Meal Dinle",
        "back": "Geri",
        "surahs": "Sureler",
        "verses": "ayet",
        "juz": "Cüz",
        "settings": "Ayarlar",
        "city": "Şehir",
        "language": "Dil",
        "logout": "Çıkış Yap",
        "guest": "Misafir",
        "loading": "Yükleniyor...",
        "tafsir": "Tefsir",
        "select_scholar": "Alim Seçin",
        "open_tafsir": "Tefsir Oku",
        "prayer_fajr": "İmsak", "prayer_sunrise": "Güneş", "prayer_dhuhr": "Öğle",
        "prayer_asr": "İkindi", "prayer_maghrib": "Akşam", "prayer_isha": "Yatsı",
        "home": "Ana Sayfa", "chat": "Sohbet",
        "send": "Gönder", "ask_question": "Sorunuzu yazın...",
        "all": "Tümü", "correct": "Doğru!", "wrong": "Yanlış!",
        "quiz_complete": "Quiz Tamamlandı!", "new_quiz": "Yeni Quiz",
        "total_score": "Toplam Puan", "success": "Başarı",
        "next_question": "Sonraki Soru", "see_results": "Sonuçları Gör",
        "qibla": "Kıble Yönü", "select": "Seçiniz",
        "country": "Ülke", "all_turkey": "Tüm Türkiye",
        "international": "Uluslararası",
        "reciter": "Okuyucu", "full_surah_play": "Tüm Sureyi Dinle",
        "playing": "Çalınıyor...",
        "narrator": "Seslendiren",
    },
    "en": {
        "app_title": "Islamic Life Assistant",
        "greeting": "Peace be upon you",
        "bismillah": "In the name of God, the Most Gracious, the Most Merciful",
        "explore": "Explore",
        "quran": "Holy Quran",
        "quran_desc": "114 Surahs - Arabic & Translation",
        "hadith": "Hadith",
        "hadith_desc": "Authentic Hadiths & Explanations",
        "advisor": "Islamic Advisor",
        "advisor_desc": "AI Powered Chat",
        "scholars": "Scholar Views",
        "scholars_desc": "Perspectives of Islamic Scholars",
        "quiz": "Islam Quiz",
        "quiz_desc": "Test Your Knowledge",
        "daily_verse": "Verse of the Day",
        "search_surah": "Search surah...",
        "listen_meal": "Listen Translation",
        "back": "Back",
        "surahs": "Surahs",
        "verses": "verses",
        "juz": "Juz",
        "settings": "Settings",
        "city": "City",
        "language": "Language",
        "logout": "Logout",
        "guest": "Guest",
        "loading": "Loading...",
        "tafsir": "Tafsir",
        "select_scholar": "Select Scholar",
        "open_tafsir": "Read Tafsir",
        "prayer_fajr": "Fajr", "prayer_sunrise": "Sunrise", "prayer_dhuhr": "Dhuhr",
        "prayer_asr": "Asr", "prayer_maghrib": "Maghrib", "prayer_isha": "Isha",
        "home": "Home", "chat": "Chat",
        "send": "Send", "ask_question": "Ask your question...",
        "all": "All", "correct": "Correct!", "wrong": "Wrong!",
        "quiz_complete": "Quiz Complete!", "new_quiz": "New Quiz",
        "total_score": "Total Score", "success": "Success",
        "next_question": "Next Question", "see_results": "See Results",
        "qibla": "Qibla Direction", "select": "Select",
        "country": "Country", "all_turkey": "All Turkey",
        "international": "International",
        "reciter": "Reciter", "full_surah_play": "Play Full Surah",
        "playing": "Playing...",
        "narrator": "Narrator",
    },
    "ar": {
        "app_title": "مساعد الحياة الإسلامية",
        "greeting": "السلام عليكم",
        "bismillah": "بسم الله الرحمن الرحيم",
        "explore": "اكتشف",
        "quran": "القرآن الكريم",
        "quran_desc": "١١٤ سورة - عربي وترجمة",
        "hadith": "الحديث الشريف",
        "hadith_desc": "أحاديث صحيحة وشروحها",
        "advisor": "مستشار إسلامي",
        "advisor_desc": "محادثة بالذكاء الاصطناعي",
        "scholars": "آراء العلماء",
        "scholars_desc": "وجهات نظر العلماء",
        "quiz": "اختبار إسلامي",
        "quiz_desc": "اختبر معرفتك",
        "daily_verse": "آية اليوم",
        "search_surah": "ابحث عن سورة...",
        "listen_meal": "استمع للترجمة",
        "back": "رجوع",
        "surahs": "السور",
        "verses": "آية",
        "juz": "جزء",
        "settings": "الإعدادات",
        "city": "المدينة",
        "language": "اللغة",
        "logout": "تسجيل الخروج",
        "guest": "ضيف",
        "loading": "جاري التحميل...",
        "tafsir": "التفسير",
        "select_scholar": "اختر العالم",
        "open_tafsir": "اقرأ التفسير",
        "prayer_fajr": "الفجر", "prayer_sunrise": "الشروق", "prayer_dhuhr": "الظهر",
        "prayer_asr": "العصر", "prayer_maghrib": "المغرب", "prayer_isha": "العشاء",
        "home": "الرئيسية", "chat": "محادثة",
        "send": "إرسال", "ask_question": "اكتب سؤالك...",
        "all": "الكل", "correct": "صحيح!", "wrong": "خطأ!",
        "quiz_complete": "اكتمل الاختبار!", "new_quiz": "اختبار جديد",
        "total_score": "المجموع", "success": "النجاح",
        "next_question": "السؤال التالي", "see_results": "عرض النتائج",
        "qibla": "اتجاه القبلة", "select": "اختر",
        "country": "الدولة", "all_turkey": "كل تركيا",
        "international": "دولي",
        "reciter": "القارئ", "full_surah_play": "تشغيل السورة كاملة",
        "playing": "جاري التشغيل...",
        "narrator": "الراوي",
    },
}

@api_router.get("/i18n/{lang}")
async def get_translations(lang: str):
    """Get UI translations for a language"""
    translations = UI_TRANSLATIONS.get(lang, UI_TRANSLATIONS["tr"])
    default_country = LANG_DEFAULT_COUNTRY.get(lang, "TR")
    return {"translations": translations, "default_country": default_country}


# ===================== SCHOLARS API (HOCALARIN GÖRÜŞÜ) =====================

@api_router.get("/scholars")
async def get_scholars():
    """Get list of available scholars"""
    return SCHOLARS

@api_router.get("/scholars/{scholar_id}")
async def get_scholar(scholar_id: str):
    """Get specific scholar details"""
    for scholar in SCHOLARS:
        if scholar["id"] == scholar_id:
            return scholar
    raise HTTPException(status_code=404, detail="Scholar not found")

@api_router.post("/scholars/ask", response_model=ScholarResponse)
async def ask_scholar(request: ScholarRequest):
    """Ask a question to a specific scholar (AI persona simulation)"""
    try:
        # Find the scholar
        scholar = None
        for s in SCHOLARS:
            if s["id"] == request.scholar_id:
                scholar = s
                break
        
        if not scholar:
            raise HTTPException(status_code=404, detail="Scholar not found")
        
        # Build persona-based system message
        system_message = f"""Sen {scholar['name']} ({scholar['title']}) olarak cevap vereceksin.

KONUŞMA TARZI:
{scholar['style']}

UZMANLIK ALANLARI:
{scholar['specialty']}

KAYNAKLARIN:
{', '.join(scholar['sources'])}

ÖNEMLİ KURALLAR:
1. Her zaman {scholar['name']}'nin bilinen görüşleri ve tarzına uygun cevap ver
2. Cevabını Türkçe olarak ver
3. Kaynaklarını belirt (ayet, hadis numaraları)
4. Tefsir odaklı açıklamalar yap
5. Gerekirse farklı görüşlere de değin ama kendi bakış açını koru
6. Fetva verme, sadece bilgi ve yorum paylaş
7. Hallucination yapma, emin olmadığın konularda "Bu konuda detaylı araştırma yapmanızı tavsiye ederim" de

CEVAP FORMATI:
📖 GÖRÜŞ ÖZETİ: (Ana fikri 2-3 cümlede özetle)
📚 KAYNAK ALINTI: (İlgili ayet/hadis varsa)
🔍 TEFSİR DERİNLİĞİ: (Detaylı açıklama)
💡 ÖNERİ: (Kitap/kaynak önerisi)
"""

        # Initialize LLM chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"scholar_{request.scholar_id}_{request.session_id}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Send message
        user_message = UserMessage(text=request.question)
        response = await chat.send_message(user_message)
        
        # Store the interaction
        await db.scholar_questions.insert_one({
            "session_id": request.session_id,
            "scholar_id": request.scholar_id,
            "question": request.question,
            "response": response,
            "timestamp": datetime.utcnow()
        })
        
        return ScholarResponse(
            response=response,
            scholar_name=scholar["name"],
            sources=scholar["sources"]
        )
        
    except Exception as e:
        logger.error(f"Scholar API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# ===================== QURAN API (FULL DATA) =====================

@api_router.get("/quran/reciters")
async def get_reciters():
    """Get list of available Quran reciters"""
    reciters = []
    for key, reciter in QURAN_RECITERS.items():
        reciters.append({
            "id": key,
            "name": reciter["name"],
            "name_ar": reciter["name_ar"],
            "style": reciter["style"],
            "quality": reciter["quality"]
        })
    return reciters

TURKISH_SURAH_NAMES = {
    1: ("Fatiha", "Açılış"), 2: ("Bakara", "İnek"), 3: ("Al-i İmran", "İmran Ailesi"), 4: ("Nisa", "Kadınlar"),
    5: ("Maide", "Sofra"), 6: ("En'am", "Hayvanlar"), 7: ("A'raf", "Yükseklikler"), 8: ("Enfal", "Ganimetler"),
    9: ("Tevbe", "Tövbe"), 10: ("Yunus", "Yunus"), 11: ("Hud", "Hud"), 12: ("Yusuf", "Yusuf"),
    13: ("Ra'd", "Gök Gürültüsü"), 14: ("İbrahim", "İbrahim"), 15: ("Hicr", "Hicr"), 16: ("Nahl", "Arı"),
    17: ("İsra", "Gece Yolculuğu"), 18: ("Kehf", "Mağara"), 19: ("Meryem", "Meryem"), 20: ("Taha", "Taha"),
    21: ("Enbiya", "Peygamberler"), 22: ("Hac", "Hac"), 23: ("Mü'minun", "Müminler"), 24: ("Nur", "Işık"),
    25: ("Furkan", "Ayırt Edici"), 26: ("Şuara", "Şairler"), 27: ("Neml", "Karınca"), 28: ("Kasas", "Kıssalar"),
    29: ("Ankebut", "Örümcek"), 30: ("Rum", "Romalılar"), 31: ("Lokman", "Lokman"), 32: ("Secde", "Secde"),
    33: ("Ahzab", "Gruplar"), 34: ("Sebe", "Sebe"), 35: ("Fatır", "Yaratıcı"), 36: ("Yasin", "Yasin"),
    37: ("Saffat", "Saf Tutanlar"), 38: ("Sad", "Sad"), 39: ("Zümer", "Gruplar"), 40: ("Mü'min", "Mümin"),
    41: ("Fussilet", "Açıklanmış"), 42: ("Şura", "Danışma"), 43: ("Zuhruf", "Altın Süsler"), 44: ("Duhan", "Duman"),
    45: ("Casiye", "Diz Çöken"), 46: ("Ahkaf", "Kum Tepeleri"), 47: ("Muhammed", "Muhammed"), 48: ("Fetih", "Fetih"),
    49: ("Hucurat", "Odalar"), 50: ("Kaf", "Kaf"), 51: ("Zariyat", "Savuranlar"), 52: ("Tur", "Dağ"),
    53: ("Necm", "Yıldız"), 54: ("Kamer", "Ay"), 55: ("Rahman", "Rahman"), 56: ("Vakıa", "Olay"),
    57: ("Hadid", "Demir"), 58: ("Mücadele", "Mücadele"), 59: ("Haşr", "Toplanma"), 60: ("Mümtehine", "Sınanan Kadın"),
    61: ("Saff", "Saf"), 62: ("Cuma", "Cuma"), 63: ("Münafikun", "Münafıklar"), 64: ("Teğabun", "Aldanma"),
    65: ("Talak", "Boşanma"), 66: ("Tahrim", "Yasaklama"), 67: ("Mülk", "Mülk"), 68: ("Kalem", "Kalem"),
    69: ("Hakka", "Gerçekleşen"), 70: ("Mearic", "Yükseliş Yolları"), 71: ("Nuh", "Nuh"), 72: ("Cin", "Cinler"),
    73: ("Müzzemmil", "Örtünen"), 74: ("Müddessir", "Bürünen"), 75: ("Kıyame", "Kıyamet"), 76: ("İnsan", "İnsan"),
    77: ("Mürselat", "Gönderilenler"), 78: ("Nebe", "Haber"), 79: ("Naziat", "Çekip Çıkaranlar"),
    80: ("Abese", "Yüz Çevirdi"), 81: ("Tekvir", "Dürülme"), 82: ("İnfitar", "Yarılma"),
    83: ("Mutaffifin", "Eksik Ölçenler"), 84: ("İnşikak", "Yarılma"), 85: ("Büruc", "Burçlar"),
    86: ("Tarık", "Gece Yıldızı"), 87: ("A'la", "En Yüce"), 88: ("Gaşiye", "Kaplayacak Olan"),
    89: ("Fecr", "Şafak"), 90: ("Beled", "Şehir"), 91: ("Şems", "Güneş"), 92: ("Leyl", "Gece"),
    93: ("Duha", "Kuşluk Vakti"), 94: ("İnşirah", "Göğüs Açma"), 95: ("Tin", "İncir"),
    96: ("Alak", "Asılan/Okuyan"), 97: ("Kadir", "Kadir Gecesi"), 98: ("Beyyine", "Açık Delil"),
    99: ("Zilzal", "Deprem"), 100: ("Adiyat", "Koşanlar"), 101: ("Karia", "Çarpıcı Felaket"),
    102: ("Tekasür", "Çoğaltma Yarışı"), 103: ("Asr", "Zaman"), 104: ("Hümeze", "Dedikoducu"),
    105: ("Fil", "Fil"), 106: ("Kureyş", "Kureyş"), 107: ("Maun", "Yardım"),
    108: ("Kevser", "Bolluk"), 109: ("Kafirun", "Kafirler"), 110: ("Nasr", "Yardım"),
    111: ("Tebbet", "Alev"), 112: ("İhlas", "İhlas"), 113: ("Felak", "Şafak"), 114: ("Nas", "İnsanlar"),
}

@api_router.get("/quran/surahs")
async def get_surahs():
    """Get list of all 114 surahs with metadata"""
    if not QURAN_ARABIC:
        return SURAHS
    
    surahs = []
    for i, surah in enumerate(QURAN_ARABIC):
        num = surah['number']
        tr_name, tr_meaning = TURKISH_SURAH_NAMES.get(num, (surah.get('englishName', ''), surah.get('englishNameTranslation', '')))
        verse_count = len(surah.get('ayahs', []))
        surahs.append({
            "number": num,
            "name": surah.get('englishName', ''),
            "arabic": surah.get('name', ''),
            "turkish_name": tr_name,
            "meaning": tr_meaning,
            "verses": verse_count,
            "revelation": "Mekke" if surah.get('revelationType') == 'Meccan' else "Medine"
        })
    return surahs

@api_router.get("/quran/surah/{surah_number}")
async def get_surah(surah_number: int, lang: str = "tr", reciter: str = "alafasy"):
    """Get surah details with all verses and audio URLs for selected reciter"""
    if not QURAN_ARABIC or surah_number < 1 or surah_number > 114:
        raise HTTPException(status_code=404, detail="Surah not found")
    
    arabic_surah = QURAN_ARABIC[surah_number - 1]
    turkish_surah = QURAN_TURKISH[surah_number - 1] if QURAN_TURKISH else None
    english_surah = QURAN_ENGLISH[surah_number - 1] if QURAN_ENGLISH else None
    
    reciter_info = QURAN_RECITERS.get(reciter, QURAN_RECITERS["alafasy"])
    
    verses = []
    for i, ayah in enumerate(arabic_surah['ayahs']):
        verse = {
            "number": ayah['numberInSurah'],
            "global_number": ayah.get('number', 0),
            "arabic": ayah['text'],
            "turkish": turkish_surah['ayahs'][i]['text'] if turkish_surah and i < len(turkish_surah['ayahs']) else "",
            "english": english_surah['ayahs'][i]['text'] if english_surah and i < len(english_surah['ayahs']) else "",
            "page": ayah.get('page', 0),
            "juz": ayah.get('juz', 0),
            "hizbQuarter": ayah.get('hizbQuarter', 0),
            "audio_url": get_audio_url(surah_number, ayah['numberInSurah'], reciter),
            "sajda": ayah.get('sajda', False)
        }
        verses.append(verse)
    
    tr_name, tr_meaning = TURKISH_SURAH_NAMES.get(arabic_surah['number'], (arabic_surah.get('englishName', ''), arabic_surah.get('englishNameTranslation', '')))
    
    return {
        "number": arabic_surah['number'],
        "name": tr_name,
        "arabic_name": arabic_surah.get('name', ''),
        "meaning": tr_meaning,
        "revelation": "Mekke" if arabic_surah.get('revelationType') == 'Meccan' else "Medine",
        "total_verses": len(verses),
        "verses": verses,
        "reciter": reciter_info,
        "full_audio_url": get_surah_audio_url(surah_number, reciter)
    }


MAZLUM_KIPER_CUZ_VIDEOS = {
    1: "2me0jJCXs4I", 2: "LqIk2tXTNDc", 3: "ir4_OEJQhqc", 4: "6tMSXcKUqB4",
    5: "c1WOlKHFiP8", 6: "DDFycbdvUSI", 7: "7PXwysHDnx0", 8: "m4ezfP2lvX8",
    9: "RqXJGaXcyb0", 10: "lVO-Tzr3zlI", 11: "PxUHhJpd1qI", 12: "56em9VKpOaU",
    13: "EDi_mRV9AeI", 14: "08QRPPl8SJs", 15: "m2sZOrHy3c4", 16: "Q8ni4RLK0I8",
    17: "vRwVk1_g3H4", 18: "ECk42BdIxhU", 19: "iTU9TB46-PY", 20: "JSR6vrn8Mzo",
    21: "0gQcucCIGP8", 22: "XakXpqMYsas", 23: "tq5blJAUiuU", 24: "99J35-a29LQ",
    25: "-bCZxGY0KrY", 26: "W1OP1xdIkBA", 27: "tS_1CLXN4lE", 28: "dmG2SkkJSy0",
    29: "fy3k-Icw8NY", 30: "KELxg7sy6IA",
}

@api_router.get("/quran/meal-audio")
async def get_meal_audio():
    """Get Mazlum Kiper Turkish meal audio for all 30 juz"""
    return [
        {
            "juz": juz,
            "video_id": vid,
            "title": f"Kur'an-ı Kerim Meali - {juz}. Cüz",
            "narrator": "Mazlum Kiper",
            "url": f"https://www.youtube.com/watch?v={vid}",
            "embed_url": f"https://www.youtube.com/embed/{vid}",
        }
        for juz, vid in MAZLUM_KIPER_CUZ_VIDEOS.items()
    ]

@api_router.get("/quran/surah/{surah_number}/meal-video")
async def get_surah_meal_video(surah_number: int):
    """Get the Turkish meal YouTube video for a specific surah's juz"""
    if not QURAN_ARABIC or surah_number < 1 or surah_number > 114:
        raise HTTPException(status_code=404, detail="Surah not found")
    arabic_surah = QURAN_ARABIC[surah_number - 1]
    juz = arabic_surah['ayahs'][0].get('juz', 1)
    video_id = MAZLUM_KIPER_CUZ_VIDEOS.get(juz, MAZLUM_KIPER_CUZ_VIDEOS[1])
    tr_name, _ = TURKISH_SURAH_NAMES.get(surah_number, ("", ""))
    return {
        "surah_number": surah_number,
        "surah_name": tr_name,
        "juz": juz,
        "video_id": video_id,
        "narrator": "Mazlum Kiper",
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "embed_url": f"https://www.youtube.com/embed/{video_id}",
    }


@api_router.get("/quran/verse/{surah_number}/{verse_number}")
async def get_verse(surah_number: int, verse_number: int):
    """Get specific verse with Arabic and Turkish"""
    if not QURAN_ARABIC or surah_number < 1 or surah_number > 114:
        raise HTTPException(status_code=404, detail="Surah not found")
    
    arabic_surah = QURAN_ARABIC[surah_number - 1]
    turkish_surah = QURAN_TURKISH[surah_number - 1] if QURAN_TURKISH else None
    
    if verse_number < 1 or verse_number > len(arabic_surah['ayahs']):
        raise HTTPException(status_code=404, detail="Verse not found")
    
    ayah = arabic_surah['ayahs'][verse_number - 1]
    
    return {
        "surah_number": surah_number,
        "surah_name": arabic_surah.get('englishName', ''),
        "surah_arabic": arabic_surah.get('name', ''),
        "verse_number": verse_number,
        "arabic": ayah['text'],
        "turkish": turkish_surah['ayahs'][verse_number - 1]['text'] if turkish_surah else "",
        "page": ayah.get('page', 0),
        "juz": ayah.get('juz', 0)
    }

@api_router.get("/quran/search")
async def search_quran(query: str = Query(..., min_length=2)):
    """Search in Quran verses (Turkish translation)"""
    if not QURAN_TURKISH:
        raise HTTPException(status_code=500, detail="Quran data not loaded")
    
    results = []
    query_lower = query.lower()
    
    for surah in QURAN_TURKISH:
        for ayah in surah['ayahs']:
            if query_lower in ayah['text'].lower():
                arabic_text = ""
                if QURAN_ARABIC:
                    arabic_surah = QURAN_ARABIC[surah['number'] - 1]
                    arabic_text = arabic_surah['ayahs'][ayah['numberInSurah'] - 1]['text']
                
                results.append({
                    "surah_number": surah['number'],
                    "surah_name": surah.get('englishName', ''),
                    "verse_number": ayah['numberInSurah'],
                    "arabic": arabic_text,
                    "turkish": ayah['text']
                })
                
                if len(results) >= 50:  # Limit results
                    break
        if len(results) >= 50:
            break
    
    return {"query": query, "count": len(results), "results": results}

@api_router.get("/quran/juz/{juz_number}")
async def get_juz(juz_number: int):
    """Get all verses in a specific Juz (1-30)"""
    if not QURAN_ARABIC or juz_number < 1 or juz_number > 30:
        raise HTTPException(status_code=404, detail="Juz not found")
    
    verses = []
    for i, surah in enumerate(QURAN_ARABIC):
        for j, ayah in enumerate(surah['ayahs']):
            if ayah.get('juz') == juz_number:
                turkish_text = ""
                if QURAN_TURKISH:
                    turkish_text = QURAN_TURKISH[i]['ayahs'][j]['text']
                
                verses.append({
                    "surah_number": surah['number'],
                    "surah_name": surah.get('englishName', ''),
                    "verse_number": ayah['numberInSurah'],
                    "arabic": ayah['text'],
                    "turkish": turkish_text
                })
    
    return {"juz": juz_number, "total_verses": len(verses), "verses": verses}

@api_router.get("/quran/page/{page_number}")
async def get_page(page_number: int):
    """Get all verses in a specific page (1-604)"""
    if not QURAN_ARABIC or page_number < 1 or page_number > 604:
        raise HTTPException(status_code=404, detail="Page not found")
    
    verses = []
    for i, surah in enumerate(QURAN_ARABIC):
        for j, ayah in enumerate(surah['ayahs']):
            if ayah.get('page') == page_number:
                turkish_text = ""
                if QURAN_TURKISH:
                    turkish_text = QURAN_TURKISH[i]['ayahs'][j]['text']
                
                verses.append({
                    "surah_number": surah['number'],
                    "surah_name": surah.get('englishName', ''),
                    "surah_arabic": surah.get('name', ''),
                    "verse_number": ayah['numberInSurah'],
                    "arabic": ayah['text'],
                    "turkish": turkish_text
                })
    
    return {"page": page_number, "total_verses": len(verses), "verses": verses}

@api_router.get("/quran/random")
async def get_random_verse():
    """Get a random verse"""
    import random
    if not QURAN_ARABIC:
        raise HTTPException(status_code=500, detail="Quran data not loaded")
    
    surah_idx = random.randint(0, 113)
    surah = QURAN_ARABIC[surah_idx]
    verse_idx = random.randint(0, len(surah['ayahs']) - 1)
    ayah = surah['ayahs'][verse_idx]
    
    turkish_text = ""
    if QURAN_TURKISH:
        turkish_text = QURAN_TURKISH[surah_idx]['ayahs'][verse_idx]['text']
    
    return {
        "surah_number": surah['number'],
        "surah_name": surah.get('englishName', ''),
        "surah_arabic": surah.get('name', ''),
        "verse_number": ayah['numberInSurah'],
        "arabic": ayah['text'],
        "turkish": turkish_text
    }

@api_router.post("/quran/bookmark")
async def add_bookmark(user_id: str, surah: int, verse: int):
    """Bookmark a verse"""
    bookmark = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "surah": surah,
        "verse": verse,
        "created_at": datetime.utcnow()
    }
    await db.quran_bookmarks.insert_one(bookmark)
    bookmark.pop("_id", None)
    return bookmark

@api_router.get("/quran/bookmarks/{user_id}")
async def get_bookmarks(user_id: str):
    """Get user's bookmarks"""
    bookmarks = await db.quran_bookmarks.find({"user_id": user_id}).to_list(100)
    return [{"id": str(b.get("_id", b.get("id", ""))), "surah": b["surah"], "verse": b["verse"]} for b in bookmarks]

# ===================== HADITH API =====================

@api_router.get("/hadith/categories")
async def get_hadith_categories():
    """Get hadith categories"""
    return HADITH_CATEGORIES

@api_router.get("/hadith/all")
async def get_all_hadiths():
    """Get all hadiths"""
    return SAMPLE_HADITHS

@api_router.get("/hadith/category/{category_id}")
async def get_hadiths_by_category(category_id: str):
    """Get hadiths by category"""
    filtered = [h for h in SAMPLE_HADITHS if h["category"] == category_id]
    return filtered

@api_router.get("/hadith/{hadith_id}")
async def get_hadith(hadith_id: str):
    """Get specific hadith"""
    for hadith in SAMPLE_HADITHS:
        if hadith["id"] == hadith_id:
            return hadith
    raise HTTPException(status_code=404, detail="Hadith not found")

@api_router.get("/hadith/search/{query}")
async def search_hadiths(query: str):
    """Search hadiths"""
    query_lower = query.lower()
    results = [h for h in SAMPLE_HADITHS if query_lower in h["turkish"].lower() or query_lower in h["explanation"].lower()]
    return results

# ===================== GAMIFICATION API =====================

@api_router.get("/gamification/stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get user's gamification stats"""
    stats = await db.user_stats.find_one({"user_id": user_id})
    
    if not stats:
        # Create new stats
        stats = UserStats(user_id=user_id).dict()
        await db.user_stats.insert_one(stats)
    
    # Calculate earned badges
    stats["badges"] = get_earned_badges(stats)
    stats["level"] = calculate_level(stats.get("total_points", 0))
    
    return stats

@api_router.post("/gamification/activity")
async def log_activity(activity: ActivityCreate):
    """Log an activity and award points"""
    points = POINTS_CONFIG.get(activity.activity_type, 0)
    
    # Get or create user stats
    stats = await db.user_stats.find_one({"user_id": activity.user_id})
    
    if not stats:
        stats = UserStats(user_id=activity.user_id).dict()
        await db.user_stats.insert_one(stats)
    
    # Update stats
    today = date.today().isoformat()
    update_data = {
        "total_points": stats.get("total_points", 0) + points,
        "updated_at": datetime.utcnow()
    }
    
    # Update streak
    last_activity = stats.get("last_activity_date", "")
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    
    if last_activity == yesterday:
        update_data["current_streak"] = stats.get("current_streak", 0) + 1
    elif last_activity != today:
        update_data["current_streak"] = 1
    
    update_data["last_activity_date"] = today
    
    if update_data.get("current_streak", 0) > stats.get("longest_streak", 0):
        update_data["longest_streak"] = update_data["current_streak"]
    
    # Update activity-specific counters
    if activity.activity_type == "quran_read":
        update_data["quran_pages_read"] = stats.get("quran_pages_read", 0) + 1
    elif activity.activity_type == "hadith_read":
        update_data["hadith_read"] = stats.get("hadith_read", 0) + 1
    elif activity.activity_type == "pomodoro":
        update_data["pomodoro_minutes"] = stats.get("pomodoro_minutes", 0) + 25
    
    # Calculate new level
    update_data["level"] = calculate_level(update_data["total_points"])
    
    await db.user_stats.update_one(
        {"user_id": activity.user_id},
        {"$set": update_data}
    )
    
    # Log the activity
    activity_log = ActivityLog(
        user_id=activity.user_id,
        activity_type=activity.activity_type,
        points_earned=points,
        details=activity.details
    )
    await db.activity_logs.insert_one(activity_log.dict())
    
    return {
        "points_earned": points,
        "total_points": update_data["total_points"],
        "level": update_data["level"],
        "current_streak": update_data.get("current_streak", 1)
    }

@api_router.get("/gamification/badges")
async def get_all_badges():
    """Get all available badges"""
    return BADGES

@api_router.get("/gamification/leaderboard")
async def get_leaderboard():
    """Get top users leaderboard"""
    users = await db.user_stats.find().sort("total_points", -1).limit(20).to_list(20)
    
    leaderboard = []
    for i, user in enumerate(users):
        leaderboard.append({
            "rank": i + 1,
            "user_id": user["user_id"][:8] + "...",  # Anonymize
            "points": user.get("total_points", 0),
            "level": calculate_level(user.get("total_points", 0)),
            "streak": user.get("current_streak", 0)
        })
    
    return leaderboard

# ===================== AI CHAT (İSLAMİ DANIŞMAN) =====================

ISLAMIC_ADVISOR_SYSTEM_PROMPT = """Sen bir İslami danışman AI'sın. Kullanıcıların İslami, hayati veya gündelik yaşamla ilgili sorunlarını, sorularını öncelikle Kur'an-ı Kerim ayetlerine dayalı olarak yanıtla, ardından Kur'an'a uygun ve sahih hadis kaynaklarından (Buhârî, Müslim gibi muteber kaynaklar) destekleyici sözlerle güçlendir.

## CEVAP FORMATI (Bu formatı her zaman kullan):

### 📋 SORU ÖZETİ
Kullanıcının sorusunu kısaca özetle.

### 📖 KUR'AN-I KERİM'DEN
Soruya doğrudan ilgili Kur'an ayetlerini (sure adı ve ayet numarasıyla) bul ve alıntıla.
- Ayetleri orijinal Arapça metinle birlikte ver
- Türkçe mealini ekle
- Ayetin bağlamını açıkla

### 📚 HADİS-İ ŞERİFLER
Konuya uygun sahih hadisleri kaynak belirterek ekle.
Format: "Peygamber Efendimiz (s.a.v.) şöyle buyurmuştur: '...' (Buhârî/Müslim, Kitap Adı)"

### 🙏 DUA ÖNERİSİ
Soruna göre uygun dua öner:
- Arapça metin
- Türkçe okunuşu (transliterasyon)
- Türkçe meali
- Referans (Hisnü'l-Müslim veya benzeri kaynaklardan)

### 📜 İLGİLİ KISSA/HİKAYE
Sorunla ilgili İslami kıssalar veya hikayeler ekle:
- Peygamber Efendimiz'in (s.a.v.) hayatından
- Sahabe kıssaları
- Din alimlerinin özlü sözleri
Muteber kaynak belirt (Siyer kitapları, Tabakat vb.)

### 💡 TAVSİYE VE SONUÇ
- Kullanıcıya ne yapması gerektiğini net ve adım adım açıkla
- Kişisel yorum ekleme, ayetlerin ve hadislerin öğretisine sadık kal
- Teşvik edici ve umut verici bir kapanış yap

## ÖNEMLİ KURALLAR:
1. Her zaman Türkçe yanıt ver
2. Ayet ve hadis numaralarını doğru ver
3. Fetva verme, sadece bilgi ve yönlendirme yap
4. Kaynakları mutlaka belirt
5. Saygılı ve nazik ol
6. Emin olmadığın konularda "Bu konuda bir ilim ehline danışmanızı tavsiye ederim" de
7. Ayetleri Arapça + Türkçe ver
8. Hadislerin sahihlik derecesini belirt (Sahih, Hasen, Zayıf)

## ÖRNEK KAYNAK KULLANIMI:
- Kur'an: "(Bakara Suresi, 2:286)"
- Hadis: "(Buhârî, Kitâbü'l-Îmân, No: 8)" 
- Dua: "(Hisnü'l-Müslim, Sabah-Akşam Duaları)"
- Siyer: "(İbn Hişâm, es-Sîretü'n-Nebeviyye)"
"""

@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    try:
        user_msg = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.dict())
        
        history = await db.chat_messages.find(
            {"session_id": request.session_id}
        ).sort("timestamp", 1).to_list(20)
        
        context = ""
        for msg in history[-10:]:
            role = "Kullanıcı" if msg["role"] == "user" else "Asistan"
            context += f"{role}: {msg['content']}\n"
        
        system_message = ISLAMIC_ADVISOR_SYSTEM_PROMPT + f"\n\nMevcut sohbet geçmişi:\n{context}"
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"islamic_advisor_{request.session_id}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response
        )
        await db.chat_messages.insert_one(assistant_msg.dict())
        
        return ChatResponse(response=response, session_id=request.session_id)
        
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.get("/ai/history/{session_id}")
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find(
        {"session_id": session_id}
    ).sort("timestamp", 1).to_list(100)
    
    return [{"role": msg["role"], "content": msg["content"], "timestamp": msg["timestamp"]} for msg in messages]

@api_router.delete("/ai/history/{session_id}")
async def clear_chat_history(session_id: str):
    result = await db.chat_messages.delete_many({"session_id": session_id})
    return {"deleted_count": result.deleted_count}

# ===================== POMODORO (EXISTING) =====================

@api_router.post("/pomodoro", response_model=PomodoroSession)
async def create_pomodoro_session(session: PomodoroCreate):
    session_obj = PomodoroSession(**session.dict())
    await db.pomodoro_sessions.insert_one(session_obj.dict())
    return session_obj

@api_router.get("/pomodoro/{user_id}")
async def get_pomodoro_sessions(user_id: str):
    sessions = await db.pomodoro_sessions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(50)
    return [PomodoroSession(**s) for s in sessions]

@api_router.patch("/pomodoro/{session_id}")
async def update_pomodoro_session(session_id: str, update: PomodoroUpdate):
    result = await db.pomodoro_sessions.update_one(
        {"id": session_id},
        {"$set": update.dict()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}

@api_router.get("/pomodoro/stats/{user_id}")
async def get_pomodoro_stats(user_id: str):
    sessions = await db.pomodoro_sessions.find({"user_id": user_id}).to_list(1000)
    
    total_sessions = len(sessions)
    completed_sessions = sum(1 for s in sessions if s.get("completed", False))
    total_minutes = sum(s.get("duration_minutes", 0) for s in sessions if s.get("completed", False))
    
    topics = {}
    for s in sessions:
        topic = s.get("topic", "Diğer")
        if topic not in topics:
            topics[topic] = {"count": 0, "minutes": 0}
        topics[topic]["count"] += 1
        if s.get("completed", False):
            topics[topic]["minutes"] += s.get("duration_minutes", 0)
    
    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_minutes": total_minutes,
        "topics": topics
    }

# ===================== USER PREFERENCES (EXISTING) =====================

@api_router.post("/preferences", response_model=UserPreferences)
async def create_or_update_preferences(prefs: UserPreferencesCreate):
    existing = await db.user_preferences.find_one({"user_id": prefs.user_id})
    
    if existing:
        await db.user_preferences.update_one(
            {"user_id": prefs.user_id},
            {"$set": {**prefs.dict(), "updated_at": datetime.utcnow()}}
        )
        updated = await db.user_preferences.find_one({"user_id": prefs.user_id})
        return UserPreferences(**updated)
    else:
        prefs_obj = UserPreferences(**prefs.dict())
        await db.user_preferences.insert_one(prefs_obj.dict())
        return prefs_obj

@api_router.get("/preferences/{user_id}", response_model=UserPreferences)
async def get_preferences(user_id: str):
    prefs = await db.user_preferences.find_one({"user_id": user_id})
    if not prefs:
        return UserPreferences(user_id=user_id)
    return UserPreferences(**prefs)

# ===================== COMPARATIVE RELIGIONS API =====================

@api_router.get("/comparative/topics")
async def get_comparative_topics():
    """Get all available comparative religion topics"""
    return get_all_topics()

@api_router.get("/comparative/topic/{topic_id}")
async def get_comparative_topic(topic_id: str):
    """Get comparative texts for a specific topic"""
    data = get_comparative_data(topic_id)
    if not data:
        raise HTTPException(status_code=404, detail="Topic not found")
    return data

@api_router.get("/comparative/search")
async def search_comparative_texts(query: str = Query(..., min_length=2)):
    """Search across all comparative religious texts"""
    results = search_comparative(query)
    return {"query": query, "count": len(results), "results": results}

@api_router.post("/comparative/ai-compare")
async def ai_compare_religions(topic: str, question: str = None):
    """AI-powered comparative analysis using Claude"""
    topic_data = get_comparative_data(topic)
    
    if not EMERGENT_LLM_KEY:
        # Return static comparison if no API key
        if topic_data:
            return {
                "topic": topic,
                "comparison": topic_data,
                "ai_analysis": "AI analizi için EMERGENT_LLM_KEY gereklidir."
            }
        raise HTTPException(status_code=400, detail="Topic not found")
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            model="claude-sonnet-4-20250514"
        )
        
        prompt = f"""Sen bir karşılaştırmalı dinler uzmanısın. Aşağıdaki konu hakkında farklı dinlerin görüşlerini karşılaştır:

Konu: {topic_data.get('topic', topic) if topic_data else topic}

{'Soru: ' + question if question else ''}

Lütfen şu formatı kullan:
1. Kuran'ın Görüşü: (ayet referansı ile)
2. İncil'in Görüşü: (kitap ve bölüm referansı ile)
3. Tevrat'ın Görüşü: (kitap ve bölüm referansı ile)
4. Hadis'in Görüşü: (kaynak ile)
5. Ortak Noktalar
6. Farklılıklar

Cevaplarını Türkçe ver ve kaynaklara dikkat et."""

        response = await chat.send_async(UserMessage(text=prompt))
        
        return {
            "topic": topic,
            "question": question,
            "static_data": topic_data,
            "ai_analysis": response.text
        }
    except Exception as e:
        logger.error(f"AI comparison error: {e}")
        return {
            "topic": topic,
            "comparison": topic_data,
            "ai_analysis": f"AI analizi sırasında hata oluştu: {str(e)}"
        }

# ===================== QUIZ SYSTEM API =====================
from quiz_data import QUIZ_CATEGORIES, QUIZ_QUESTIONS, get_questions_for_category
import random

# Quiz Models
class CreateQuizRoomRequest(BaseModel):
    user_id: str
    username: str
    category: str
    room_name: str
    question_count: int = 10
    time_per_question: int = 20

class JoinQuizRoomRequest(BaseModel):
    user_id: str
    username: str

class SubmitQuizAnswerRequest(BaseModel):
    user_id: str
    question_index: int
    answer: int
    time_taken: float

class StartQuizRequest(BaseModel):
    user_id: str

# Quiz Endpoints
@api_router.get("/quiz/categories")
async def get_quiz_categories():
    """Get all quiz categories"""
    return QUIZ_CATEGORIES

@api_router.get("/quiz/questions/{category}")
async def get_quiz_questions(category: str, count: int = 10):
    """Get random questions for a category"""
    questions = get_questions_for_category(category)
    if not questions:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Randomly select questions
    selected = random.sample(questions, min(count, len(questions)))
    
    # Remove correct_answer for client (they'll get it after answering)
    client_questions = []
    for q in selected:
        client_q = {**q}
        del client_q["correct_answer"]
        del client_q["explanation"]
        del client_q["source"]
        client_questions.append(client_q)
    
    return client_questions

@api_router.post("/quiz/rooms/create")
async def create_quiz_room(request: CreateQuizRoomRequest):
    """Create a new quiz room"""
    # Get questions for this category
    all_questions = get_questions_for_category(request.category)
    if not all_questions:
        raise HTTPException(status_code=404, detail="Category not found")
    
    selected_questions = random.sample(all_questions, min(request.question_count, len(all_questions)))
    
    room = {
        "id": str(uuid.uuid4()),
        "name": request.room_name,
        "category": request.category,
        "host_id": request.user_id,
        "host_name": request.username,
        "players": [{
            "user_id": request.user_id,
            "username": request.username,
            "score": 0,
            "answers": [],
            "correct_count": 0
        }],
        "status": "waiting",
        "current_question": 0,
        "questions": selected_questions,
        "max_players": 4,
        "question_count": len(selected_questions),
        "time_per_question": request.time_per_question,
        "created_at": datetime.utcnow(),
        "started_at": None,
        "finished_at": None
    }
    
    await db.quiz_rooms.insert_one(room)
    
    # Return room without answers
    safe_room = {
        "id": room["id"],
        "name": room["name"],
        "category": room["category"],
        "host_id": room["host_id"],
        "host_name": room["host_name"],
        "players": room["players"],
        "status": room["status"],
        "current_question": room["current_question"],
        "max_players": room["max_players"],
        "question_count": room["question_count"],
        "time_per_question": room["time_per_question"],
        "created_at": room["created_at"].isoformat(),
        "started_at": room["started_at"].isoformat() if room["started_at"] else None,
        "finished_at": room["finished_at"].isoformat() if room["finished_at"] else None,
        "questions": [{
            "id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "difficulty": q["difficulty"],
            "points": q["points"]
        } for q in room["questions"]]
    }
    
    return safe_room

@api_router.get("/quiz/rooms")
async def get_quiz_rooms(category: Optional[str] = None, status: str = "waiting"):
    """Get available quiz rooms"""
    query = {"status": status}
    if category:
        query["category"] = category
    
    rooms = await db.quiz_rooms.find(query).sort("created_at", -1).limit(20).to_list(20)
    
    # Return rooms without question answers
    safe_rooms = []
    for room in rooms:
        safe_room = {
            "id": room["id"],
            "name": room["name"],
            "category": room["category"],
            "host_name": room["host_name"],
            "player_count": len(room.get("players", [])),
            "max_players": room.get("max_players", 4),
            "question_count": room.get("question_count", 10),
            "status": room["status"],
            "created_at": room["created_at"]
        }
        safe_rooms.append(safe_room)
    
    return safe_rooms

@api_router.get("/quiz/rooms/{room_id}")
async def get_quiz_room(room_id: str):
    """Get a specific quiz room"""
    room = await db.quiz_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Return room without correct answers unless game is finished
    safe_room = {
        "id": room["id"],
        "name": room["name"],
        "category": room["category"],
        "host_id": room["host_id"],
        "host_name": room["host_name"],
        "players": room.get("players", []),
        "status": room["status"],
        "current_question": room.get("current_question", 0),
        "question_count": room.get("question_count", 10),
        "time_per_question": room.get("time_per_question", 20),
        "max_players": room.get("max_players", 4),
        "created_at": room["created_at"],
        "started_at": room.get("started_at"),
        "finished_at": room.get("finished_at")
    }
    
    # Include questions based on game state
    if room["status"] == "finished":
        safe_room["questions"] = room.get("questions", [])
    else:
        safe_room["questions"] = [{
            "id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "difficulty": q.get("difficulty", "medium"),
            "points": q.get("points", 10)
        } for q in room.get("questions", [])]
    
    return safe_room

@api_router.post("/quiz/rooms/{room_id}/join")
async def join_quiz_room(room_id: str, request: JoinQuizRoomRequest):
    """Join a quiz room"""
    room = await db.quiz_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    
    if len(room.get("players", [])) >= room.get("max_players", 4):
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Check if already joined
    for player in room.get("players", []):
        if player["user_id"] == request.user_id:
            return {"message": "Already in room", "room": room}
    
    # Add player
    new_player = {
        "user_id": request.user_id,
        "username": request.username,
        "score": 0,
        "answers": [],
        "correct_count": 0
    }
    
    await db.quiz_rooms.update_one(
        {"id": room_id},
        {"$push": {"players": new_player}}
    )
    
    return {"message": "Joined successfully"}

@api_router.post("/quiz/rooms/{room_id}/start")
async def start_quiz_game(room_id: str, request: StartQuizRequest):
    """Start the quiz game"""
    room = await db.quiz_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["host_id"] != request.user_id:
        raise HTTPException(status_code=403, detail="Only host can start the game")
    
    if room["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    
    await db.quiz_rooms.update_one(
        {"id": room_id},
        {"$set": {
            "status": "playing",
            "started_at": datetime.utcnow(),
            "current_question": 0
        }}
    )
    
    return {"message": "Game started"}

@api_router.post("/quiz/rooms/{room_id}/answer")
async def submit_quiz_answer(room_id: str, request: SubmitQuizAnswerRequest):
    """Submit an answer for a question"""
    room = await db.quiz_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["status"] != "playing":
        raise HTTPException(status_code=400, detail="Game not in progress")
    
    questions = room.get("questions", [])
    if request.question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
    
    question = questions[request.question_index]
    is_correct = request.answer == question["correct_answer"]
    
    # Calculate points based on correctness and time
    points = 0
    if is_correct:
        base_points = question.get("points", 10)
        time_bonus = max(0, (room.get("time_per_question", 20) - request.time_taken) / room.get("time_per_question", 20))
        points = int(base_points * (1 + time_bonus * 0.5))
    
    # Update player's score and answers
    players = room.get("players", [])
    for i, player in enumerate(players):
        if player["user_id"] == request.user_id:
            players[i]["score"] += points
            players[i]["answers"].append({
                "question_index": request.question_index,
                "answer": request.answer,
                "correct": is_correct,
                "points": points,
                "time_taken": request.time_taken
            })
            if is_correct:
                players[i]["correct_count"] = players[i].get("correct_count", 0) + 1
            break
    
    await db.quiz_rooms.update_one(
        {"id": room_id},
        {"$set": {"players": players}}
    )
    
    return {
        "correct": is_correct,
        "points_earned": points,
        "correct_answer": question["correct_answer"],
        "explanation": question.get("explanation", ""),
        "source": question.get("source", "")
    }

@api_router.post("/quiz/rooms/{room_id}/next")
async def next_question(room_id: str):
    """Move to next question"""
    room = await db.quiz_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    current = room.get("current_question", 0)
    total = len(room.get("questions", []))
    
    if current + 1 >= total:
        # Game finished
        await db.quiz_rooms.update_one(
            {"id": room_id},
            {"$set": {
                "status": "finished",
                "finished_at": datetime.utcnow()
            }}
        )
        
        # Update player stats
        for player in room.get("players", []):
            await update_player_quiz_stats(player["user_id"], room)
        
        return {"status": "finished", "current_question": current}
    else:
        await db.quiz_rooms.update_one(
            {"id": room_id},
            {"$set": {"current_question": current + 1}}
        )
        return {"status": "playing", "current_question": current + 1}

@api_router.post("/quiz/rooms/{room_id}/finish")
async def finish_quiz_game(room_id: str):
    """Finish the quiz game"""
    room = await db.quiz_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    await db.quiz_rooms.update_one(
        {"id": room_id},
        {"$set": {
            "status": "finished",
            "finished_at": datetime.utcnow()
        }}
    )
    
    # Update player stats
    for player in room.get("players", []):
        await update_player_quiz_stats(player["user_id"], room)
    
    # Get updated room
    room = await db.quiz_rooms.find_one({"id": room_id})
    
    return room

async def update_player_quiz_stats(user_id: str, room: dict):
    """Update player's overall quiz statistics"""
    stats = await db.quiz_stats.find_one({"user_id": user_id})
    
    player_data = None
    for p in room.get("players", []):
        if p["user_id"] == user_id:
            player_data = p
            break
    
    if not player_data:
        return
    
    # Determine if player won
    max_score = max(p["score"] for p in room.get("players", []))
    won = player_data["score"] == max_score
    
    if stats:
        update_data = {
            "total_games": stats.get("total_games", 0) + 1,
            "total_points": stats.get("total_points", 0) + player_data["score"],
            "correct_answers": stats.get("correct_answers", 0) + player_data.get("correct_count", 0),
            "total_answers": stats.get("total_answers", 0) + len(player_data.get("answers", [])),
            "last_played": datetime.utcnow()
        }
        if won:
            update_data["games_won"] = stats.get("games_won", 0) + 1
        
        # Update category stats
        categories = stats.get("categories_played", {})
        cat = room.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1
        update_data["categories_played"] = categories
        
        await db.quiz_stats.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
    else:
        new_stats = {
            "user_id": user_id,
            "total_games": 1,
            "games_won": 1 if won else 0,
            "total_points": player_data["score"],
            "correct_answers": player_data.get("correct_count", 0),
            "total_answers": len(player_data.get("answers", [])),
            "best_streak": 0,
            "current_streak": 0,
            "categories_played": {room.get("category", "other"): 1},
            "last_played": datetime.utcnow()
        }
        await db.quiz_stats.insert_one(new_stats)

@api_router.get("/quiz/stats/{user_id}")
async def get_quiz_stats(user_id: str):
    """Get user's quiz statistics"""
    stats = await db.quiz_stats.find_one({"user_id": user_id})
    if not stats:
        return {
            "user_id": user_id,
            "total_games": 0,
            "games_won": 0,
            "total_points": 0,
            "correct_answers": 0,
            "total_answers": 0,
            "accuracy": 0,
            "categories_played": {},
            "last_played": None
        }
    
    accuracy = 0
    if stats.get("total_answers", 0) > 0:
        accuracy = round(stats.get("correct_answers", 0) / stats["total_answers"] * 100, 1)
    
    return {
        "user_id": user_id,
        "total_games": stats.get("total_games", 0),
        "games_won": stats.get("games_won", 0),
        "total_points": stats.get("total_points", 0),
        "correct_answers": stats.get("correct_answers", 0),
        "total_answers": stats.get("total_answers", 0),
        "accuracy": accuracy,
        "categories_played": stats.get("categories_played", {}),
        "last_played": stats.get("last_played")
    }

@api_router.get("/quiz/leaderboard")
async def get_quiz_leaderboard(limit: int = 20):
    """Get global quiz leaderboard"""
    stats = await db.quiz_stats.find().sort("total_points", -1).limit(limit).to_list(limit)
    
    leaderboard = []
    for i, s in enumerate(stats):
        accuracy = 0
        if s.get("total_answers", 0) > 0:
            accuracy = round(s.get("correct_answers", 0) / s["total_answers"] * 100, 1)
        
        leaderboard.append({
            "rank": i + 1,
            "user_id": s["user_id"],
            "total_points": s.get("total_points", 0),
            "games_won": s.get("games_won", 0),
            "total_games": s.get("total_games", 0),
            "accuracy": accuracy
        })
    
    return leaderboard

@api_router.get("/quiz/leaderboard/category/{category}")
async def get_category_leaderboard(category: str, limit: int = 20):
    """Get leaderboard for a specific category"""
    # This would need more complex aggregation, simplified version:
    all_stats = await db.quiz_stats.find().to_list(1000)
    
    # Filter and sort by category
    category_stats = []
    for s in all_stats:
        cat_games = s.get("categories_played", {}).get(category, 0)
        if cat_games > 0:
            category_stats.append({
                "user_id": s["user_id"],
                "games": cat_games,
                "total_points": s.get("total_points", 0)
            })
    
    category_stats.sort(key=lambda x: x["total_points"], reverse=True)
    
    return category_stats[:limit]

# ===================== SOLO QUIZ MODE =====================

@api_router.post("/quiz/solo/start")
async def start_solo_quiz(user_id: str, category: str, question_count: int = 10):
    """Start a solo quiz session"""
    questions = get_questions_for_category(category)
    if not questions:
        raise HTTPException(status_code=404, detail="Category not found")
    
    selected = random.sample(questions, min(question_count, len(questions)))
    
    session = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "category": category,
        "questions": selected,
        "current_question": 0,
        "score": 0,
        "correct_count": 0,
        "answers": [],
        "status": "playing",
        "created_at": datetime.utcnow()
    }
    
    await db.quiz_solo_sessions.insert_one(session)
    
    # Return without answers
    return {
        "session_id": session["id"],
        "category": category,
        "question_count": len(selected),
        "questions": [{
            "id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "difficulty": q.get("difficulty", "medium"),
            "points": q.get("points", 10)
        } for q in selected]
    }

@api_router.post("/quiz/solo/{session_id}/answer")
async def submit_solo_answer(session_id: str, question_index: int, answer: int, time_taken: float):
    """Submit answer for solo quiz"""
    session = await db.quiz_solo_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    questions = session.get("questions", [])
    if question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
    
    question = questions[question_index]
    is_correct = answer == question["correct_answer"]
    
    points = 0
    if is_correct:
        base_points = question.get("points", 10)
        time_bonus = max(0, (20 - time_taken) / 20)
        points = int(base_points * (1 + time_bonus * 0.5))
    
    # Update session
    await db.quiz_solo_sessions.update_one(
        {"id": session_id},
        {
            "$inc": {"score": points, "correct_count": 1 if is_correct else 0},
            "$push": {"answers": {
                "question_index": question_index,
                "answer": answer,
                "correct": is_correct,
                "points": points,
                "time_taken": time_taken
            }}
        }
    )
    
    return {
        "correct": is_correct,
        "points_earned": points,
        "correct_answer": question["correct_answer"],
        "explanation": question.get("explanation", ""),
        "source": question.get("source", "")
    }

@api_router.post("/quiz/solo/{session_id}/finish")
async def finish_solo_quiz(session_id: str):
    """Finish solo quiz and update stats"""
    session = await db.quiz_solo_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.quiz_solo_sessions.update_one(
        {"id": session_id},
        {"$set": {"status": "finished", "finished_at": datetime.utcnow()}}
    )
    
    # Update user stats
    user_id = session["user_id"]
    stats = await db.quiz_stats.find_one({"user_id": user_id})
    
    if stats:
        categories = stats.get("categories_played", {})
        cat = session.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1
        
        await db.quiz_stats.update_one(
            {"user_id": user_id},
            {"$set": {
                "total_games": stats.get("total_games", 0) + 1,
                "total_points": stats.get("total_points", 0) + session.get("score", 0),
                "correct_answers": stats.get("correct_answers", 0) + session.get("correct_count", 0),
                "total_answers": stats.get("total_answers", 0) + len(session.get("answers", [])),
                "categories_played": categories,
                "last_played": datetime.utcnow()
            }}
        )
    else:
        await db.quiz_stats.insert_one({
            "user_id": user_id,
            "total_games": 1,
            "games_won": 0,
            "total_points": session.get("score", 0),
            "correct_answers": session.get("correct_count", 0),
            "total_answers": len(session.get("answers", [])),
            "categories_played": {session.get("category", "other"): 1},
            "last_played": datetime.utcnow()
        })
    
    return {
        "session_id": session_id,
        "score": session.get("score", 0),
        "correct_count": session.get("correct_count", 0),
        "total_questions": len(session.get("questions", [])),
        "questions": session.get("questions", [])
    }

# ===================== WEBSOCKET QUIZ MANAGER =====================

class QuizWebSocketManager:
    def __init__(self):
        # room_id -> {user_id: websocket}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # room_id -> room_data
        self.rooms: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket
        logger.info(f"User {user_id} connected to room {room_id}")
    
    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections:
            if user_id in self.active_connections[room_id]:
                del self.active_connections[room_id][user_id]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        logger.info(f"User {user_id} disconnected from room {room_id}")
    
    async def send_to_user(self, room_id: str, user_id: str, message: dict):
        if room_id in self.active_connections:
            if user_id in self.active_connections[room_id]:
                try:
                    await self.active_connections[room_id][user_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        if room_id in self.active_connections:
            for user_id, websocket in self.active_connections[room_id].items():
                if exclude_user and user_id == exclude_user:
                    continue
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
    
    def get_room_users(self, room_id: str) -> List[str]:
        if room_id in self.active_connections:
            return list(self.active_connections[room_id].keys())
        return []

quiz_ws_manager = QuizWebSocketManager()

@app.websocket("/api/quiz/ws/{room_id}/{user_id}")
async def quiz_websocket(websocket: WebSocket, room_id: str, user_id: str):
    """WebSocket endpoint for real-time quiz"""
    await quiz_ws_manager.connect(websocket, room_id, user_id)
    
    try:
        # Notify room about new player
        room = await db.quiz_rooms.find_one({"id": room_id})
        if room:
            await quiz_ws_manager.broadcast_to_room(room_id, {
                "type": "player_joined",
                "user_id": user_id,
                "players": room.get("players", []),
                "player_count": len(room.get("players", []))
            })
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif message_type == "start_game":
                # Host starts the game
                room = await db.quiz_rooms.find_one({"id": room_id})
                if room and room.get("host_id") == user_id:
                    await db.quiz_rooms.update_one(
                        {"id": room_id},
                        {"$set": {
                            "status": "playing",
                            "started_at": datetime.utcnow(),
                            "current_question": 0
                        }}
                    )
                    
                    # Get first question (without answer)
                    questions = room.get("questions", [])
                    first_q = None
                    if questions:
                        q = questions[0]
                        first_q = {
                            "index": 0,
                            "question": q["question"],
                            "options": q["options"],
                            "difficulty": q.get("difficulty", "medium"),
                            "points": q.get("points", 10)
                        }
                    
                    await quiz_ws_manager.broadcast_to_room(room_id, {
                        "type": "game_started",
                        "current_question": 0,
                        "total_questions": len(questions),
                        "question": first_q,
                        "time_per_question": room.get("time_per_question", 20)
                    })
            
            elif message_type == "submit_answer":
                question_index = data.get("question_index", 0)
                answer = data.get("answer", -1)
                time_taken = data.get("time_taken", 20)
                
                room = await db.quiz_rooms.find_one({"id": room_id})
                if room and room.get("status") == "playing":
                    questions = room.get("questions", [])
                    if question_index < len(questions):
                        question = questions[question_index]
                        is_correct = answer == question["correct_answer"]
                        
                        # Calculate points
                        points = 0
                        if is_correct:
                            base_points = question.get("points", 10)
                            time_bonus = max(0, (room.get("time_per_question", 20) - time_taken) / room.get("time_per_question", 20))
                            points = int(base_points * (1 + time_bonus * 0.5))
                        
                        # Update player score
                        players = room.get("players", [])
                        for i, player in enumerate(players):
                            if player["user_id"] == user_id:
                                players[i]["score"] += points
                                players[i]["answers"].append({
                                    "question_index": question_index,
                                    "answer": answer,
                                    "correct": is_correct,
                                    "points": points,
                                    "time_taken": time_taken
                                })
                                if is_correct:
                                    players[i]["correct_count"] = players[i].get("correct_count", 0) + 1
                                break
                        
                        await db.quiz_rooms.update_one(
                            {"id": room_id},
                            {"$set": {"players": players}}
                        )
                        
                        # Send result to the user
                        await quiz_ws_manager.send_to_user(room_id, user_id, {
                            "type": "answer_result",
                            "correct": is_correct,
                            "points_earned": points,
                            "correct_answer": question["correct_answer"],
                            "explanation": question.get("explanation", ""),
                            "source": question.get("source", "")
                        })
                        
                        # Broadcast updated scores
                        await quiz_ws_manager.broadcast_to_room(room_id, {
                            "type": "scores_updated",
                            "players": [{
                                "user_id": p["user_id"],
                                "username": p["username"],
                                "score": p["score"],
                                "correct_count": p.get("correct_count", 0)
                            } for p in players]
                        })
            
            elif message_type == "next_question":
                # Only host can move to next question
                room = await db.quiz_rooms.find_one({"id": room_id})
                if room and room.get("host_id") == user_id:
                    current = room.get("current_question", 0)
                    questions = room.get("questions", [])
                    
                    if current + 1 >= len(questions):
                        # Game finished
                        await db.quiz_rooms.update_one(
                            {"id": room_id},
                            {"$set": {
                                "status": "finished",
                                "finished_at": datetime.utcnow()
                            }}
                        )
                        
                        # Update player stats
                        for player in room.get("players", []):
                            await update_player_quiz_stats(player["user_id"], room)
                        
                        # Get final standings
                        players = sorted(room.get("players", []), key=lambda p: p["score"], reverse=True)
                        
                        await quiz_ws_manager.broadcast_to_room(room_id, {
                            "type": "game_finished",
                            "players": players,
                            "winner": players[0] if players else None
                        })
                    else:
                        # Move to next question
                        new_index = current + 1
                        await db.quiz_rooms.update_one(
                            {"id": room_id},
                            {"$set": {"current_question": new_index}}
                        )
                        
                        q = questions[new_index]
                        next_q = {
                            "index": new_index,
                            "question": q["question"],
                            "options": q["options"],
                            "difficulty": q.get("difficulty", "medium"),
                            "points": q.get("points", 10)
                        }
                        
                        await quiz_ws_manager.broadcast_to_room(room_id, {
                            "type": "next_question",
                            "current_question": new_index,
                            "total_questions": len(questions),
                            "question": next_q
                        })
            
            elif message_type == "leave_room":
                # Player leaves the room
                room = await db.quiz_rooms.find_one({"id": room_id})
                if room:
                    players = [p for p in room.get("players", []) if p["user_id"] != user_id]
                    await db.quiz_rooms.update_one(
                        {"id": room_id},
                        {"$set": {"players": players}}
                    )
                    
                    await quiz_ws_manager.broadcast_to_room(room_id, {
                        "type": "player_left",
                        "user_id": user_id,
                        "players": players
                    }, exclude_user=user_id)
                
                break
            
            elif message_type == "chat":
                # Simple chat in room
                await quiz_ws_manager.broadcast_to_room(room_id, {
                    "type": "chat",
                    "user_id": user_id,
                    "message": data.get("message", "")
                })
    
    except WebSocketDisconnect:
        quiz_ws_manager.disconnect(room_id, user_id)
        
        # Notify others about disconnect
        room = await db.quiz_rooms.find_one({"id": room_id})
        if room:
            await quiz_ws_manager.broadcast_to_room(room_id, {
                "type": "player_disconnected",
                "user_id": user_id
            })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        quiz_ws_manager.disconnect(room_id, user_id)

# =====================================================================
# KKA — AI HOCA ASISTAN  (Google Gemini)
# =====================================================================
import google.generativeai as genai

# Key is loaded from .env above via load_dotenv()
_GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if _GEMINI_KEY:
    genai.configure(api_key=_GEMINI_KEY)
else:
    logger.warning("GEMINI_API_KEY not set — /api/ai-assistant will return 503")

# ── System prompt ────────────────────────────────────────────────────
KKA_SYSTEM_PROMPT = """Sen 'Kültür Koruma Akademisi' platformunun uzman AI hoca asistanısın.

## Uzmanlık Alanların
- Türkiye'deki UNESCO Dünya Mirası alanları (Göbekli Tepe, Efes, Çatalhöyük, Hattuşa, Nemrut Dağı, Troya, Kapadokya vb.)
- Arkeolojik kazı yöntemleri ve stratigrafik analiz
- Kültürel miras koruma teknikleri (konsolidasyon, restorasyon, dijital arşivleme)
- Osmanlı, Selçuklu, Bizans, Hitit ve diğer Anadolu uygarlıkları
- Müze yönetimi ve koleksiyon koruma
- ICOMOS ve UNESCO koruma standartları
- Malzeme bilimi: Paraloid akrilikler, kireç harçlar, konsolidasyon reçineleri
- Türk sanat tarihi, el sanatları ve somut olmayan kültürel miras

## Yanıt Kuralları
1. DAIMA Türkçe yanıt ver — kullanıcı başka dil kullanmadıkça
2. Kısa, net ve akademik bir dil kullan — ama öğrenciye uygun sıcaklıkta
3. Mümkünse somut örnekler ver (alan adı, dönem, teknik)
4. Bilimsel terimleri açıkla (parantez içinde)
5. Yanıtın sonunda ilgili olduğunda kısa bir "💡 Daha fazla araştır:" önerisi ekle
6. Uydurma bilgi verme; emin olmadığında "Bu konuyu kaynaklardan teyit etmenizi öneririm" de

## Karakter
- İsmin: Prof. Kültür
- Sıcak, meraklı, öğretmeyi seven bir akademisyen
- Emoji kullanımı: Az ama etkili (💡🏛️📜⚗️🔍)
"""

# ── Pydantic models ──────────────────────────────────────────────────
class AIAssistantRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # ileride sohbet geçmişi için

class AIAssistantResponse(BaseModel):
    response: str
    session_id: str

# ── Endpoint ─────────────────────────────────────────────────────────
@api_router.post("/ai-assistant", response_model=AIAssistantResponse)
async def kka_ai_assistant(req: AIAssistantRequest):
    """
    KKA Gemini AI endpoint.
    Kullanıcı mesajını alır, Gemini'ye gönderir, Türkçe yanıt döner.
    """
    if not _GEMINI_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API anahtarı yapılandırılmamış. Lütfen .env dosyasını kontrol edin."
        )

    session_id = req.session_id or str(uuid.uuid4())

    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=KKA_SYSTEM_PROMPT,
        )
        result = await asyncio.to_thread(
            model.generate_content,
            req.message,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )
        answer = result.text.strip() if result.text else "Üzgünüm, bu soruya şu an yanıt üretemiyorum."
        return AIAssistantResponse(response=answer, session_id=session_id)

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI servis hatası: {str(e)}")

# ── Health check for the AI endpoint ────────────────────────────────
@api_router.get("/ai-assistant/health")
async def kka_ai_health():
    return {
        "status": "ok" if _GEMINI_KEY else "no_key",
        "model": "gemini-1.5-flash",
        "endpoint": "/api/ai-assistant",
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
