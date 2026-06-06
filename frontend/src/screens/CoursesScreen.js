import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useXP } from '../contexts/XPContext';
import { COURSES_META, getQuestionsForCourse } from '../data/quizData';
import { SINIFLAR } from '../data/v10Data';

/* ─── Tokens ──────────────────────────────────────────── */
const C = {
  parchment: 'var(--bg-1)',
  charcoal:  'var(--txt-1)',
  gold:      '#B8944A',
  goldLight: '#D4AA6A',
  muted:     'var(--txt-3)',
  faint:     'var(--border)',
  surface:   'var(--bg-2)',
  terracotta:'#C0533A',
  green:     '#34C759',
  red:       '#FF3B30',
  sandstone: '#D4C4A8',
  cream:     'var(--card-bg)',
};
const dm  = "'DM Sans', sans-serif";
const pf  = "'Playfair Display', serif";

/* ─── XP CONFIG ──────────────────────────────────────── */
const XP_CORRECT   = 25;
const XP_STREAK_3  = 10;
const XP_STREAK_5  = 25;
const XP_FLASHCARD = 5;

/* ─── SINIFLAR haritası (kod → ders detayı) ───────────── */
const DERS_DETAY_MAP = {};
SINIFLAR.forEach(sinif => {
  sinif.dersler.forEach(ders => {
    DERS_DETAY_MAP[ders.kod] = ders;
  });
});

/* ─── DATA — resmi 2025-2026 müfredatı ───────────────── */
const COURSES = COURSES_META.map((c, i) => {
  const detay = DERS_DETAY_MAP[c.code] || {};
  return {
    id: i + 1,
    year: c.year,
    code: c.code,
    name: c.name,
    instructor: c.instructor,
    examDate: c.examDate,
    examTime: c.examTime,
    completion: 0,
    color: c.color,
    lessons: getQuestionsForCourse(c.code).length || 5,
    done: 0,
    hasQuiz: getQuestionsForCourse(c.code).length > 0,
    // v11 — İçerik Merkezi için:
    kavramlar: detay.kavramlar || [],
    flashcards: detay.flashcards || [],
    description: detay.aciklama || '',
  };
});

/* ─── ESKİ KURS VERİSİ KALDI (UNUSED — geriye dönük compat) ── */
const _OLD_COURSES_PLACEHOLDER = [
  {
    id: 99, year: 2, code: 'FEL202',
    name: 'Antik Türk Felsefesi',
    instructor: 'Dr. Hasan Yıldız',
    examDate: '2025-06-25',
    completion: 30,
    color: '#4A6A8C',
    lessons: 22, done: 7,
  },
];

/* ─── QUIZ veri adaptörü — quizData.js formatını QuizModule formatına çevirir ── */
function adaptQuestions(courseCode) {
  return getQuestionsForCourse(courseCode).map((q, i) => ({
    id: i + 1,
    q: q.soru,
    options: q.sec,
    correct: q.dogru,
    explanation: q.aciklama,
  }));
}

const QUIZ_QUESTIONS = adaptQuestions('KDB 122'); // default global quiz (Koruma İlkeleri)


const FLASHCARDS = [
  {
    id: 1,
    front: 'UNESCO nedir?',
    back: 'Birleşmiş Milletler Eğitim, Bilim ve Kültür Örgütü. 1945\'te kurulmuş, 193 üye devleti bulunmaktadır.',
    tag: 'Temel Kavram',
  },
  {
    id: 2,
    front: 'Kültürel Miras nedir?',
    back: 'Geçmiş kuşaklardan devralınan ve geleceğe aktarılacak olan somut ve somut olmayan tüm kültürel varlıkların bütünüdür.',
    tag: 'Temel Kavram',
  },
  {
    id: 3,
    front: 'Stratigrafik Kazı Yöntemi',
    back: 'Arkeolojik alandaki toprak tabakalarını (stratigrafik katmanları) sırasıyla kazarak geçmiş dönemlere ait buluntuları ortaya çıkarma yöntemidir.',
    tag: 'Arkeoloji',
  },
  {
    id: 4,
    front: 'Nemrut Dağı UNESCO Tescil Yılı',
    back: '1987. Kommagene Krallığı\'na ait I. Antiokhos\'un mezar anıtı olarak bilinmekte, 2150 metre yükseklikte yer almaktadır.',
    tag: 'UNESCO',
  },
  {
    id: 5,
    front: 'Somut Olmayan Kültürel Miras',
    back: 'Toplulukların kuşaktan kuşağa aktardığı gelenekler, sözlü ifadeler, gösteri sanatları, toplumsal uygulamalar ve el sanatları.',
    tag: 'Kültür',
  },
];

/* ─── HELPERS ─────────────────────────────────────────── */
function daysUntil(dateStr) {
  const now    = new Date();
  const target = new Date(dateStr);
  const diff   = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function nextExam(courses) {
  return [...courses].sort((a, b) => new Date(a.examDate) - new Date(b.examDate))[0];
}

/* ─── COUNTDOWN URGENCY CARD ─────────────────────────── */
function UrgencyCard({ xp, level, levelPct }) {
  const nearest  = nextExam(COURSES);
  const days     = daysUntil(nearest.examDate);
  const urgency  = days <= 3 ? C.terracotta : days <= 7 ? '#D4862A' : C.gold;

  return (
    <div style={{
      margin: '10px 14px 0',
      borderRadius: '18px',
      background: C.charcoal,
      padding: '13px 14px',
      border: `0.5px solid rgba(184,148,74,0.25)`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow blob */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: `radial-gradient(circle, ${urgency}33 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* Countdown */}
        <div>
          <p style={{ fontFamily: dm, fontSize: '9px', color: 'rgba(250,247,242,0.5)', marginBottom: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Yaklaşan Sınav
          </p>
          <p style={{ fontFamily: pf, fontSize: '12px', fontWeight: 600, color: C.parchment, lineHeight: 1.3 }}>
            {nearest.code} · {nearest.name.split(' ').slice(0, 3).join(' ')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
            <span style={{
              fontFamily: dm, fontSize: '22px', fontWeight: 800, color: urgency,
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {days}
            </span>
            <span style={{ fontFamily: dm, fontSize: '11px', fontWeight: 600, color: urgency }}>
              GÜN
            </span>
          </div>
        </div>

        {/* XP badge */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(250,247,242,0.06)', borderRadius: '14px',
          padding: '8px 10px', border: '0.5px solid rgba(184,148,74,0.2)',
          minWidth: '58px',
        }}>
          <span style={{ fontFamily: dm, fontSize: '8px', color: 'rgba(250,247,242,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Seviye
          </span>
          <span style={{ fontFamily: dm, fontSize: '20px', fontWeight: 800, color: C.goldLight, lineHeight: 1.1 }}>
            {level}
          </span>
          <span style={{ fontFamily: dm, fontSize: '8px', color: C.goldLight }}>
            {xp} XP
          </span>
        </div>
      </div>

      {/* XP progress bar */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontFamily: dm, fontSize: '9px', color: 'rgba(250,247,242,0.45)' }}>
            Hazırlık İlerlemesi
          </span>
          <span style={{ fontFamily: dm, fontSize: '9px', color: C.goldLight, fontWeight: 600 }}>
            {levelPct}%
          </span>
        </div>
        <div style={{ height: '5px', borderRadius: '999px', background: 'rgba(250,247,242,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            width: `${levelPct}%`,
            background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
            transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>
    </div>
  );
}

/* ─── YEAR FILTER ─────────────────────────────────────── */
function YearFilter({ active, onChange }) {
  const years = [0, 1, 2, 3, 4]; // 0 = Tümü
  return (
    <div style={{ overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}
      className="scrollbar-hide">
      <div style={{ display: 'flex', gap: '6px', padding: '10px 14px 8px' }}>
        {years.map(y => {
          const isActive = active === y;
          return (
            <button key={y} onClick={() => onChange(y)}
              style={{
                fontFamily: dm, fontSize: '11px', fontWeight: isActive ? 700 : 400,
                color: isActive ? C.parchment : C.charcoal,
                background: isActive ? C.charcoal : 'transparent',
                border: `0.5px solid ${isActive ? C.charcoal : C.faint}`,
                borderRadius: '999px', padding: '5px 12px',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.15s ease',
              }}>
              {y === 0 ? 'Tümü' : `${y}. Sınıf`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── COURSE CARD ─────────────────────────────────────── */
function CourseCard({ course, onIcerikAc, studyTopics }) {
  const courseXP = studyTopics?.[course.code] || 0;
  // Varsayılan olarak bir derste kazanılan her 200 XP %100 ilerleme saysın (örneğin)
  const realCompletion = Math.min(100, Math.floor((courseXP / 200) * 100));

  return (
    <div style={{
      margin: '0 14px 10px',
      borderRadius: '18px',
      background: C.parchment,
      border: `0.5px solid ${C.faint}`,
      overflow: 'hidden',
    }}>
      {/* Top accent bar */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${course.color}, ${course.color}66)` }} />

      <div style={{ padding: '11px 13px 12px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{
                fontFamily: dm, fontSize: '9px', fontWeight: 700,
                color: course.color, letterSpacing: '0.06em',
                background: `${course.color}18`, borderRadius: '4px', padding: '1px 5px',
              }}>
                {course.code}
              </span>
              <span style={{ fontFamily: dm, fontSize: '9px', color: C.muted, fontWeight: 600 }}>
                {courseXP > 0 ? `${courseXP} XP Kazanıldı` : 'Henüz başlanmadı'}
              </span>
            </div>
            <p style={{
              fontFamily: pf, fontSize: '12.5px', fontWeight: 600, color: C.charcoal,
              lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '170px',
            }}>
              {course.name}
            </p>
          </div>
          {/* Completion ring */}
          <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
            <svg width="38" height="38" viewBox="0 0 38 38">
              <circle cx="19" cy="19" r="15" fill="none" stroke={C.faint} strokeWidth="3"/>
              <circle cx="19" cy="19" r="15" fill="none" stroke={course.color} strokeWidth="3"
                strokeDasharray={`${2*Math.PI*15}`}
                strokeDashoffset={`${2*Math.PI*15*(1-realCompletion/100)}`}
                strokeLinecap="round" transform="rotate(-90 19 19)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}/>
            </svg>
            <span style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              fontFamily: dm, fontSize: '8px', fontWeight: 700, color: course.color,
            }}>
              {realCompletion}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', borderRadius: '999px', background: C.faint, overflow: 'hidden', marginTop: '4px' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            width: `${realCompletion}%`,
            background: `linear-gradient(90deg, ${course.color}99, ${course.color})`,
            transition: 'width 1s ease',
          }} />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontFamily: dm, fontSize: '9.5px', color: C.muted }}>
            {course.done}/{course.lessons} ders tamamlandı
          </span>
          <button onClick={() => onIcerikAc && onIcerikAc(course)} style={{
            fontFamily: dm, fontSize: '10px', fontWeight: 600,
            color: course.color, background: 'none', border: 'none', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            İçerik Merkezi →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DERS İÇERİK MODALİ ────────────────────── */
function DersKonuOzeti({ ders, sinifRenk }) {
  const [aiOzet, setAiOzet] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const aiOzetUret = async () => {
    setYukleniyor(true);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) throw new Error('API key eksik');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const prompt = `Bu dersin sınav odaklı konu özetini çıkar. Ders adı: ${ders.name}. Ders kodu: ${ders.code}. Açıklama: ${ders.description || ''}. Madde madde, kısa, Türkçe. En önemli 5-7 nokta.`;
      const result = await model.generateContent(prompt);
      setAiOzet(result.response.text());
    } catch (err) {
      setAiOzet('⚠️ AI özeti yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  };

  const kavramlar = ders.kavramlar || [];

  return (
    <div>
      {/* Kavramlar chips */}
      {kavramlar.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {kavramlar.map((k, i) => (
            <span key={i} style={{ fontFamily: dm, fontSize: 10, background: sinifRenk + '18', border: `1px solid ${sinifRenk}33`, borderRadius: 20, padding: '4px 10px', color: sinifRenk, fontWeight: 600 }}>{k}</span>
          ))}
        </div>
      )}

      {/* Ders açıklaması */}
      <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--txt-2)', lineHeight: 1.65, marginBottom: 14 }}>
        {ders.description || 'Bu ders için açıklama bulunmuyor.'}
      </p>

      {/* Flashcard özet */}
      {(ders.flashcards || []).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 8, fontFamily: dm, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Temel Kavramlar</div>
          {ders.flashcards.slice(0, 3).map((fc, i) => (
            <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 12, fontWeight: 700, color: 'var(--txt-1)', marginBottom: 4 }}>{fc.on}</div>
              <div style={{ fontFamily: dm, fontSize: 11, color: 'var(--txt-4)', lineHeight: 1.5 }}>{fc.arka}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI Ozet */}
      {!aiOzet ? (
        <button onClick={aiOzetUret} disabled={yukleniyor}
          style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${sinifRenk}22, ${sinifRenk}11)`, border: `1px solid ${sinifRenk}44`, borderRadius: 12, fontFamily: 'Georgia,serif', fontSize: 12, color: sinifRenk, fontWeight: 700, cursor: 'pointer' }}>
          {yukleniyor ? '⏳ Özet üretiliyor...' : '🤖 AI ile Derin Özet Üret'}
        </button>
      ) : (
        <div style={{ background: sinifRenk + '0D', border: `1px solid ${sinifRenk}33`, borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: sinifRenk, marginBottom: 8, fontFamily: dm }}>AI Konu Özeti</div>
          <pre style={{ fontFamily: dm, fontSize: 11, color: 'var(--txt-1)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{aiOzet}</pre>
        </div>
      )}
    </div>
  );
}

/* ─── DERS NOTEBOOKLM (AI Chat) ────────────────────── */
function DersNotebookChat({ ders, sinifRenk }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(false);

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kka-backend.onrender.com';

  // Wake up the backend when the tab opens (Render free tier spins down after inactivity)
  useEffect(() => {
    let cancelled = false;
    const wakeUp = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
          if (res.ok && !cancelled) { setBackendReady(true); return; }
        } catch (e) { /* retry */ }
        if (!cancelled) await new Promise(r => setTimeout(r, 3000));
      }
      if (!cancelled) setBackendReady(true); // proceed anyway after retries
    };
    wakeUp();
    return () => { cancelled = true; };
  }, [API_BASE]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/api/course-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course_code: ders.code, message: userMsg })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Sunucu hatası (${res.status})`);
        }
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
        setLoading(false);
        return; // success — exit
      } catch (error) {
        if (attempt < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        setMessages(prev => [...prev, { role: 'ai', content: `⚠️ Sunucuya bağlanılamadı. Render ücretsiz plan kullanıldığı için sunucu uykuda olabilir. Lütfen 30 saniye bekleyip tekrar deneyin.\n\nHata: ${error.message}` }]);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ background: sinifRenk + '11', padding: '10px 14px', borderRadius: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 24 }}>📚</div>
        <div>
          <div style={{ fontFamily: pf, fontSize: 13, fontWeight: 700, color: 'var(--txt-1)' }}>Akademi Notebook (AI)</div>
          <div style={{ fontFamily: dm, fontSize: 10, color: 'var(--txt-3)' }}>Bu dersin PDF arşivinden saniyeler içinde cevap alın.</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '5px 0' }} className="scrollbar-hide">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <div style={{ fontSize: 32, opacity: 0.5 }}>🔎</div>
            <p style={{ fontFamily: dm, fontSize: 12, color: 'var(--txt-3)', marginTop: 10 }}>Ders arşivi yüklendi.<br/>Ne öğrenmek istersiniz?</p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap', padding: '0 10px' }}>
              <button onClick={() => setInput("Bana bu PDF'in detaylı bir özetini çıkarır mısın?")} style={{ padding: '6px 12px', borderRadius: 12, border: `1px solid ${sinifRenk}55`, background: 'transparent', color: sinifRenk, fontFamily: dm, fontSize: 11, cursor: 'pointer' }}>📝 Özet Çıkar</button>
              <button onClick={() => setInput("Sınavda çıkabilecek en önemli 5 kavram nedir?")} style={{ padding: '6px 12px', borderRadius: 12, border: `1px solid ${sinifRenk}55`, background: 'transparent', color: sinifRenk, fontFamily: dm, fontSize: 11, cursor: 'pointer' }}>⭐ Önemli Kavramlar</button>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.role === 'user' ? sinifRenk : 'var(--bg-2)', color: m.role === 'user' ? '#FFF' : 'var(--txt-1)', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0', fontFamily: dm, fontSize: 12, lineHeight: 1.5 }}>
              {m.content}
            </div>
          ))
        )}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-2)', padding: '10px 14px', borderRadius: '14px 14px 14px 0', fontSize: 12, color: 'var(--txt-3)' }}>
            Arşiv taranıyor...
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Derse dair bir şey sorun..."
          style={{ flex: 1, padding: '12px 14px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card-bg)', outline: 'none', fontFamily: dm, fontSize: 12, color: 'var(--txt-1)' }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ background: sinifRenk, border: 'none', width: 42, height: 42, borderRadius: '50%', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  );
}

function DersPodcast({ ders, sinifRenk }) {
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const bolumler = [
    { baslik: `${ders.code} — Bölüm 1: Temel Kavramlara Giriş`, sure: '18 dk', ep: 'E01' },
    { baslik: `${ders.code} — Bölüm 2: Yöntem ve Uygulamalar`, sure: '22 dk', ep: 'E02' },
    { baslik: `${ders.code} — Bölüm 3: Sınav Hazırlık`, sure: '15 dk', ep: 'E03' },
  ];
  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--txt-1)', color: 'var(--bg-0)', borderRadius: 20, padding: '8px 16px', fontSize: 12, fontFamily: dm, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
      {bolumler.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, background: `linear-gradient(135deg, ${sinifRenk}12, ${sinifRenk}06)`, border: `1px solid ${sinifRenk}22`, borderRadius: 12, padding: '12px', marginBottom: 10, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${sinifRenk}, ${sinifRenk}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#FFF', fontFamily: dm }}>{b.ep}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 11, fontWeight: 700, color: 'var(--txt-1)', lineHeight: 1.35 }}>{b.baslik}</div>
            <div style={{ fontSize: 9, color: 'var(--txt-3)', marginTop: 3, fontFamily: dm }}>🎧 {b.sure}</div>
          </div>
          <button onClick={() => showToast('🎧 Podcast yakında eklenecek')} style={{ width: 34, height: 34, borderRadius: '50%', background: sinifRenk, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#FFF', fontSize: 12 }}>▶</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function DersVideo({ ders, sinifRenk }) {
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const videolar = [
    { baslik: 'Terminoloji Hizlı Genel Bakış', sure: '8:22', emoji: '📚' },
    { baslik: 'Lab Uygulaması Demo', sure: '12:45', emoji: '🔬' },
    { baslik: 'Gerçek Alan: Saha Gezi', sure: '18:03', emoji: '🏕️' },
    { baslik: 'Sınav Öncesi Tekrar', sure: '6:50', emoji: '📝' },
  ];
  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--txt-1)', color: 'var(--bg-0)', borderRadius: 20, padding: '8px 16px', fontSize: 12, fontFamily: dm, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {videolar.map((v, i) => (
          <div key={i} onClick={() => showToast('🎥 İçerik yakında')} style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: `1px solid ${sinifRenk}22` }}>
            <div style={{ height: 72, background: `linear-gradient(135deg, ${sinifRenk}, ${sinifRenk}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span style={{ fontSize: 28 }}>{v.emoji}</span>
              <div style={{ position: 'absolute', bottom: 5, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: '#FFF', fontFamily: dm, fontWeight: 600 }}>{v.sure}</div>
            </div>
            <div style={{ padding: '8px 9px', background: 'var(--card-bg)' }}>
              <div style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: 'var(--txt-1)', lineHeight: 1.35 }}>{v.baslik}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DersPdf({ ders, sinifRenk }) {
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const dosyalar = [
    { ad: `${ders.code} Hafta 1-4 Ders Notları.pdf`, boyut: '2.4 MB' },
    { ad: `${ders.code} Terminoloji Sözlüğü.pdf`, boyut: '1.1 MB' },
    { ad: `${ders.code} Sınav Çalışma Kılavuzu.pdf`, boyut: '890 KB' },
  ];
  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--txt-1)', color: 'var(--bg-0)', borderRadius: 20, padding: '8px 16px', fontSize: 12, fontFamily: dm, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
      {dosyalar.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: sinifRenk + '18', border: `1px solid ${sinifRenk}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: dm, fontSize: 11, fontWeight: 600, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.ad}</div>
            <div style={{ fontSize: 9, color: 'var(--txt-3)', marginTop: 4, fontFamily: dm }}>{f.boyut}</div>
          </div>
          <button onClick={() => showToast('📅 PDF bu cihazda mevcut değil')} style={{ width: 30, height: 30, borderRadius: 8, background: sinifRenk + '18', border: `1px solid ${sinifRenk}33`, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📥</button>
        </div>
      ))}
    </div>
  );
}

function DersIcerikModal({ ders, sinifRenk, onKapat, onQuizAc }) {
  const [sekme, setSekme] = useState('ozet');
  const ICERIK_SEKME = [
    { id: 'ozet',    emoji: '📝', label: 'Özet'        },
    { id: 'notebook',emoji: '🤖', label: 'Notebook'    },
    { id: 'podcast', emoji: '📻', label: 'Podcast'     },
    { id: 'video',   emoji: '🎦', label: 'Video'       },
    { id: 'pdf',     emoji: '📄', label: 'PDF'         },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, maxHeight: '88vh', background: 'var(--bg-1)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        {/* Modal Header */}
        <div style={{ padding: '14px 16px 10px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onKapat} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-2)', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--txt-1)' }}>✕</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 9, color: sinifRenk, fontWeight: 700, fontFamily: dm, letterSpacing: '0.06em' }}>{ders.code}</span>
              <h3 style={{ margin: 0, fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ders.name}</h3>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => { onKapat(); onQuizAc && onQuizAc(ders); }}
                style={{ fontSize: 10, background: sinifRenk + '22', color: sinifRenk, border: `1px solid ${sinifRenk}44`, borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontWeight: 700, fontFamily: dm }}>Quiz →</button>
            </div>
          </div>
        </div>
        {/* Sekme Bar */}
        <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 10, padding: 3, gap: 2, margin: '10px 16px 0', flexShrink: 0 }}>
          {ICERIK_SEKME.map(s => (
            <button key={s.id} onClick={() => setSekme(s.id)}
              style={{ flex: 1, padding: '7px 2px', borderRadius: 8, border: 'none', cursor: 'pointer', background: sekme === s.id ? 'var(--card-bg)' : 'transparent', boxShadow: sekme === s.id ? '0 1px 4px var(--shadow)' : 'none', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 14 }}>{s.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: sekme === s.id ? 700 : 400, color: sekme === s.id ? 'var(--txt-1)' : 'var(--txt-3)', fontFamily: 'Georgia,serif' }}>{s.label}</span>
            </button>
          ))}
        </div>
        {/* İçerik Alanı */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }} className="scrollbar-hide">
          {sekme === 'ozet'     && <DersKonuOzeti ders={ders} sinifRenk={sinifRenk}/>}
          {sekme === 'notebook' && <DersNotebookChat ders={ders} sinifRenk={sinifRenk}/>}
          {sekme === 'podcast'  && <DersPodcast   ders={ders} sinifRenk={sinifRenk}/>}
          {sekme === 'video'    && <DersVideo     ders={ders} sinifRenk={sinifRenk}/>}
          {sekme === 'pdf'      && <DersPdf       ders={ders} sinifRenk={sinifRenk}/>}
        </div>
      </div>
    </div>
  );
}

/* ─── QUIZ MODULE ─────────────────────────────────────── */
function QuizModule({ onClose }) {
  const { addXP } = useXP();
  const [qIndex,   setQIndex]   = useState(0);
  const [selected, setSelected] = useState(null); // seçilen şık index
  const [answered, setAnswered] = useState(false);
  const [streak,   setStreak]   = useState(0);
  const [score,    setScore]    = useState(0);
  const [finished, setFinished] = useState(false);
  const [flashClass, setFlashClass] = useState('');
  const containerRef = useRef(null);

  const q = QUIZ_QUESTIONS[qIndex];

  const handleSelect = useCallback((idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);

    const isCorrect = idx === q.correct;

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore(s => s + 1);
      setFlashClass('flash-correct');

      let xpEarned = XP_CORRECT;
      let label    = `+${XP_CORRECT} XP`;
      if (newStreak === 3) { xpEarned += XP_STREAK_3; label = `🔥 Seri! +${xpEarned} XP`; }
      if (newStreak >= 5)  { xpEarned += XP_STREAK_5; label = `⚡ Unstoppable! +${xpEarned} XP`; }
      addXP(xpEarned, label);
    } else {
      setStreak(0);
      setFlashClass('flash-wrong');
    }

    setTimeout(() => setFlashClass(''), 600);

    // 1.8s sonra sonraki soruya geç
    setTimeout(() => {
      if (qIndex + 1 >= QUIZ_QUESTIONS.length) {
        setFinished(true);
      } else {
        setQIndex(i => i + 1);
        setSelected(null);
        setAnswered(false);
      }
    }, 1800);
  }, [answered, q, streak, addXP, qIndex]);

  if (finished) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(28,20,16,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '240px', borderRadius: '24px',
          background: C.parchment, padding: '28px 22px',
          textAlign: 'center',
          border: `0.5px solid rgba(184,148,74,0.3)`,
        }}>
          <div style={{ fontSize: '44px', marginBottom: '10px' }}>
            {score >= 4 ? '🏆' : score >= 2 ? '⭐' : '💪'}
          </div>
          <h3 style={{ fontFamily: pf, fontSize: '18px', fontWeight: 700, color: C.charcoal, marginBottom: '6px' }}>
            {score >= 4 ? 'Mükemmel!' : score >= 2 ? 'İyi İş!' : 'Daha Fazla Çalış!'}
          </h3>
          <p style={{ fontFamily: dm, fontSize: '12px', color: C.muted, marginBottom: '16px' }}>
            {QUIZ_QUESTIONS.length} sorudan {score} doğru
          </p>
          <div style={{
            background: `${C.gold}15`, borderRadius: '12px', padding: '10px',
            marginBottom: '18px',
            border: `0.5px solid rgba(184,148,74,0.2)`,
          }}>
            <p style={{ fontFamily: dm, fontSize: '13px', fontWeight: 700, color: C.gold }}>
              +{score * XP_CORRECT} XP Kazandın
            </p>
          </div>
          <button onClick={onClose} style={{
            width: '100%', padding: '11px',
            background: C.charcoal, border: 'none', borderRadius: '12px',
            fontFamily: dm, fontSize: '12px', fontWeight: 600,
            color: C.parchment, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(28,20,16,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 16px',
    }}>
      <div ref={containerRef} className={flashClass} style={{
        width: '100%', maxWidth: '260px',
        borderRadius: '24px', background: C.parchment,
        overflow: 'hidden', border: `0.5px solid ${C.faint}`,
        transition: 'background 0.1s',
      }}>
        {/* Header */}
        <div style={{
          background: C.charcoal, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: dm, fontSize: '10px', color: 'rgba(250,247,242,0.5)' }}>
              {qIndex + 1}/{QUIZ_QUESTIONS.length}
            </span>
            {streak >= 2 && (
              <span style={{ fontFamily: dm, fontSize: '10px', color: '#FF9500', fontWeight: 700 }}>
                🔥 {streak}× Seri
              </span>
            )}
          </div>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {QUIZ_QUESTIONS.map((_, i) => (
              <div key={i} style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: i < qIndex ? C.green : i === qIndex ? C.goldLight : 'rgba(250,247,242,0.2)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(250,247,242,0.5)', fontSize: '16px',
            WebkitTapHighlightColor: 'transparent',
          }}>✕</button>
        </div>

        {/* Question */}
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{
            background: `${C.gold}10`, borderRadius: '10px',
            padding: '6px 8px', marginBottom: '12px',
            border: `0.5px solid rgba(184,148,74,0.2)`,
            display: 'inline-block',
          }}>
            <span style={{ fontFamily: dm, fontSize: '9px', fontWeight: 700, color: C.gold, letterSpacing: '0.06em' }}>
              BİL BAKALIM
            </span>
          </div>
          <p style={{
            fontFamily: pf, fontSize: '13.5px', fontWeight: 600,
            color: C.charcoal, lineHeight: 1.5,
          }}>
            {q.q}
          </p>
        </div>

        {/* Options */}
        <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {q.options.map((opt, idx) => {
            let bgColor = C.surface;
            let borderColor = C.faint;
            let textColor = C.charcoal;
            let icon = null;

            if (answered) {
              if (idx === q.correct) {
                bgColor = 'rgba(52,199,89,0.12)';
                borderColor = C.green;
                textColor = '#1A7A35';
                icon = '✓';
              } else if (idx === selected && idx !== q.correct) {
                bgColor = 'rgba(255,59,48,0.10)';
                borderColor = C.red;
                textColor = '#A0281E';
                icon = '✗';
              }
            }

            return (
              <button key={idx} onClick={() => handleSelect(idx)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  background: bgColor,
                  border: `0.5px solid ${borderColor}`,
                  cursor: answered ? 'default' : 'pointer',
                  fontFamily: dm, fontSize: '11.5px', fontWeight: 500,
                  color: textColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: answered && idx === q.correct ? C.green
                      : answered && idx === selected ? C.red : C.faint,
                    color: answered && (idx === q.correct || idx === selected) ? '#fff' : C.muted,
                    fontSize: '9px', fontWeight: 700,
                    marginRight: '8px', flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}>
                    {answered ? (icon || String.fromCharCode(65 + idx)) : String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation (shown after answer) */}
        {answered && (
          <div style={{
            margin: '0 12px 12px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: `${C.gold}0D`,
            border: `0.5px solid rgba(184,148,74,0.25)`,
            animation: 'slideInUp 0.3s ease',
          }}>
            <p style={{ fontFamily: dm, fontSize: '10.5px', color: C.muted, lineHeight: 1.5 }}>
              💡 {q.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FLASHCARD MODULE ────────────────────────────────── */
function FlashcardModule({ onClose }) {
  const { addXP } = useXP();
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [revealed,  setRevealed]  = useState({});

  const card = FLASHCARDS[cardIndex];

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true);
      if (!revealed[card.id]) {
        setRevealed(p => ({ ...p, [card.id]: true }));
        addXP(XP_FLASHCARD, `+${XP_FLASHCARD} XP`);
      }
    } else {
      setFlipped(false);
    }
  };

  const handleNext = () => {
    setFlipped(false);
    setTimeout(() => setCardIndex(i => (i + 1) % FLASHCARDS.length), 200);
  };

  const handlePrev = () => {
    setFlipped(false);
    setTimeout(() => setCardIndex(i => (i - 1 + FLASHCARDS.length) % FLASHCARDS.length), 200);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(28,20,16,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      {/* Close */}
      <div style={{
        width: '100%', maxWidth: '260px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '14px',
      }}>
        <span style={{ fontFamily: dm, fontSize: '10px', color: 'rgba(250,247,242,0.5)' }}>
          {cardIndex + 1} / {FLASHCARDS.length} kart
        </span>
        <button onClick={onClose} style={{
          background: 'rgba(250,247,242,0.1)', border: 'none',
          borderRadius: '999px', padding: '5px 12px',
          fontFamily: dm, fontSize: '10px', fontWeight: 600,
          color: 'rgba(250,247,242,0.7)', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
          Kapat
        </button>
      </div>

      {/* Hint */}
      {!flipped && (
        <p style={{
          fontFamily: dm, fontSize: '10px', color: 'rgba(250,247,242,0.4)',
          marginBottom: '10px', textAlign: 'center',
        }}>
          Kartı çevirmek için dokun
        </p>
      )}

      {/* 3D Card */}
      <div
        onClick={handleFlip}
        style={{
          width: '100%', maxWidth: '260px', height: '160px',
          perspective: '1000px', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{
          width: '100%', height: '100%', position: 'relative',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.55s cubic-bezier(.4,0,.2,1)',
        }}>
          {/* Front face */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            borderRadius: '20px',
            background: C.sandstone,
            border: `0.5px solid rgba(28,20,16,0.12)`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}>
            {/* Fold corner */}
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '24px', height: '24px',
              background: `linear-gradient(225deg, rgba(28,20,16,0.15) 50%, transparent 50%)`,
              borderTopRightRadius: '20px',
            }} />
            <span style={{
              fontFamily: dm, fontSize: '9px', fontWeight: 700,
              color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '10px',
              background: `${C.gold}15`, padding: '2px 8px', borderRadius: '999px',
              border: `0.5px solid rgba(184,148,74,0.3)`,
            }}>
              {card.tag}
            </span>
            <p style={{
              fontFamily: pf, fontSize: '14px', fontWeight: 600,
              color: C.charcoal, textAlign: 'center', lineHeight: 1.45,
            }}>
              {card.front}
            </p>
          </div>

          {/* Back face */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '20px',
            background: C.cream,
            border: `0.5px solid rgba(184,148,74,0.25)`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}>
            {/* Gold left accent */}
            <div style={{
              position: 'absolute', left: 0, top: '20%', bottom: '20%',
              width: '3px', borderRadius: '999px',
              background: `linear-gradient(180deg, ${C.goldLight}, ${C.gold})`,
            }} />
            <p style={{
              fontFamily: dm, fontSize: '11.5px', color: C.charcoal,
              textAlign: 'center', lineHeight: 1.6,
            }}>
              {card.back}
            </p>
            {!revealed[card.id] && (
              <span style={{
                marginTop: '10px', fontFamily: dm, fontSize: '9px',
                color: C.gold, fontWeight: 600,
              }}>
                +{XP_FLASHCARD} XP kazandın ✨
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center',
      }}>
        <button onClick={handlePrev} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(250,247,242,0.1)', border: '0.5px solid rgba(250,247,242,0.2)',
          color: 'rgba(250,247,242,0.7)', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>
          ←
        </button>

        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {FLASHCARDS.map((fc, i) => (
            <div key={i} onClick={() => { setFlipped(false); setTimeout(() => setCardIndex(i), 200); }}
              style={{
                width: '6px', height: '6px', borderRadius: '50%', cursor: 'pointer',
                background: i === cardIndex ? C.goldLight : 'rgba(250,247,242,0.25)',
                transition: 'background 0.2s',
              }} />
          ))}
        </div>

        <button onClick={handleNext} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(250,247,242,0.1)', border: '0.5px solid rgba(250,247,242,0.2)',
          color: 'rgba(250,247,242,0.7)', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>
          →
        </button>
      </div>
    </div>
  );
}

/* ─── GAMIFICATION SECTION ────────────────────────────── */
function GamificationSection() {
  const { xp, level, levelPct, addXP } = useXP();
  const [mode, setMode] = useState(null); // null | 'quiz' | 'flashcard'

  return (
    <>
      {/* Quiz modal */}
      {mode === 'quiz' && <QuizModule onClose={() => setMode(null)} />}

      {/* Flashcard modal */}
      {mode === 'flashcard' && <FlashcardModule onClose={() => setMode(null)} />}

      <div style={{ margin: '0 14px 10px' }}>
        {/* Section header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <h2 style={{ fontFamily: pf, fontSize: '14px', fontWeight: 700, color: C.charcoal }}>
            Bil Bakalım & Kartlar
          </h2>
          {/* Streak/XP mini badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: `${C.gold}12`,
            border: `0.5px solid rgba(184,148,74,0.25)`,
            borderRadius: '999px', padding: '3px 8px',
          }}>
            <span style={{ fontSize: '10px' }}>⚡</span>
            <span style={{ fontFamily: dm, fontSize: '10px', fontWeight: 700, color: C.gold }}>
              Seviye {level}
            </span>
          </div>
        </div>

        {/* Two action cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>

          {/* Quiz card */}
          <button onClick={() => setMode('quiz')}
            style={{
              borderRadius: '18px', padding: '14px 12px',
              background: C.charcoal,
              border: `0.5px solid rgba(184,148,74,0.2)`,
              cursor: 'pointer', textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.15s ease',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{
              position: 'absolute', top: '-10px', right: '-10px',
              width: '50px', height: '50px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(184,148,74,0.15) 0%, transparent 70%)',
            }} />
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>🧠</div>
            <p style={{ fontFamily: dm, fontSize: '11px', fontWeight: 700, color: C.parchment, marginBottom: '3px' }}>
              Bil Bakalım
            </p>
            <p style={{ fontFamily: dm, fontSize: '9.5px', color: 'rgba(250,247,242,0.45)' }}>
              {QUIZ_QUESTIONS.length} soru
            </p>
            <div style={{
              marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px',
              background: `${C.gold}20`, borderRadius: '999px', padding: '3px 7px',
            }}>
              <span style={{ fontFamily: dm, fontSize: '9px', fontWeight: 700, color: C.goldLight }}>
                +{XP_CORRECT} XP/soru
              </span>
            </div>
          </button>

          {/* Flashcard card */}
          <button onClick={() => setMode('flashcard')}
            style={{
              borderRadius: '18px', padding: '14px 12px',
              background: C.sandstone,
              border: `0.5px solid rgba(28,20,16,0.12)`,
              cursor: 'pointer', textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.15s ease',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {/* Fold corner effect */}
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '20px', height: '20px',
              background: 'linear-gradient(225deg, rgba(28,20,16,0.12) 50%, transparent 50%)',
              borderTopRightRadius: '18px',
            }} />
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>🃏</div>
            <p style={{ fontFamily: dm, fontSize: '11px', fontWeight: 700, color: C.charcoal, marginBottom: '3px' }}>
              Hafıza Kartları
            </p>
            <p style={{ fontFamily: dm, fontSize: '9.5px', color: C.muted }}>
              {FLASHCARDS.length} kart
            </p>
            <div style={{
              marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px',
              background: `${C.gold}15`, borderRadius: '999px', padding: '3px 7px',
              border: `0.5px solid rgba(184,148,74,0.2)`,
            }}>
              <span style={{ fontFamily: dm, fontSize: '9px', fontWeight: 700, color: C.gold }}>
                +{XP_FLASHCARD} XP/kart
              </span>
            </div>
          </button>
        </div>

        {/* XP level bar */}
        <div style={{
          borderRadius: '14px', padding: '10px 12px',
          background: C.surface,
          border: `0.5px solid ${C.faint}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>✨</span>
              <span style={{ fontFamily: dm, fontSize: '11px', fontWeight: 600, color: C.charcoal }}>
                Toplam XP: {xp}
              </span>
            </div>
            <span style={{
              fontFamily: dm, fontSize: '9px', fontWeight: 700,
              color: C.gold, background: `${C.gold}12`,
              borderRadius: '999px', padding: '2px 7px',
            }}>
              Lv.{level}
            </span>
          </div>
          <div style={{ height: '6px', borderRadius: '999px', background: C.faint, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              width: `${levelPct}%`,
              background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
              transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
              position: 'relative',
            }}>
              {/* Shimmer */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
              }} />
            </div>
          </div>
          <p style={{ fontFamily: dm, fontSize: '9px', color: C.muted, marginTop: '5px', textAlign: 'right' }}>
            Sonraki seviye için {500 - (xp % 500)} XP
          </p>
        </div>
      </div>
    </>
  );
}

/* ─── MAIN SCREEN ─────────────────────────────────────── */
export default function CoursesScreen() {
  const { xp, level, levelPct, studyTopics } = useXP();
  const [yearFilter, setYearFilter] = useState(0);
  const [icerikModal, setIcerikModal] = useState(null); // null | { course, sinifRenk }

  const filtered = yearFilter === 0
    ? COURSES
    : COURSES.filter(c => c.year === yearFilter);

  // Sınıf rengini bul
  const sinifRengiAl = (course) => course.color || '#C8A45A';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* Ders İçerik Modalı */}
      {icerikModal && (
        <DersIcerikModal
          ders={icerikModal.course}
          sinifRenk={icerikModal.sinifRenk}
          onKapat={() => setIcerikModal(null)}
          onQuizAc={() => setIcerikModal(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{
          padding: '10px 14px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `0.5px solid ${C.faint}`, flexShrink: 0,
        }}>
          <h1 style={{ fontFamily: pf, fontSize: '17px', fontWeight: 700, color: C.charcoal }}>
            Derslerim
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: `${C.gold}12`,
            border: `0.5px solid rgba(184,148,74,0.3)`,
            borderRadius: '999px', padding: '4px 9px',
          }}>
            <span style={{ fontSize: '11px' }}>⚡</span>
            <span style={{ fontFamily: dm, fontSize: '11px', fontWeight: 700, color: C.gold }}>
              {xp} XP
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
          className="scrollbar-hide">

          {/* Year filter */}
          <div style={{marginTop: 10}}>
            <YearFilter active={yearFilter} onChange={setYearFilter} />
          </div>

          {/* Course list */}
          <div style={{ paddingBottom: '4px' }}>
            {filtered.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                studyTopics={studyTopics}
                onIcerikAc={(c) => setIcerikModal({ course: c, sinifRenk: sinifRengiAl(c) })}
              />
            ))}
          </div>

          {/* Divider */}
          <div style={{
            margin: '4px 14px 10px',
            height: '0.5px', background: C.faint,
          }} />

          {/* Gamification section */}
          <GamificationSection />

          {/* Bottom padding */}
          <div style={{ height: '8px' }} />
        </div>
      </div>
    </>
  );
}
