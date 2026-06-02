import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useXP } from '../contexts/XPContext';

/* ─── Tokens ──────────────────────────────────────────── */
const C = {
  parchment: '#FAF7F2',
  charcoal:  '#1C1410',
  gold:      '#B8944A',
  goldLight: '#D4AA6A',
  muted:     'rgba(28,20,16,0.45)',
  faint:     'rgba(28,20,16,0.08)',
  surface:   '#F3EFE8',
  terracotta:'#C0533A',
  green:     '#34C759',
  red:       '#FF3B30',
  sandstone: '#D4C4A8',
  cream:     '#FEFCF7',
};
const dm  = "'DM Sans', sans-serif";
const pf  = "'Playfair Display', serif";

/* ─── XP CONFIG ──────────────────────────────────────── */
const XP_CORRECT   = 25;
const XP_STREAK_3  = 10; // bonus 3 üst üste
const XP_STREAK_5  = 25; // bonus 5 üst üste
const XP_FLASHCARD = 5;

/* ─── DATA ────────────────────────────────────────────── */
const COURSES = [
  {
    id: 1, year: 1, code: 'TAR101',
    name: 'Anadolu Uygarlıkları Tarihi',
    instructor: 'Dr. Elif Şahin',
    examDate: '2025-06-05',
    completion: 72,
    color: '#4A8C6A',
    lessons: 24, done: 17,
  },
  {
    id: 2, year: 1, code: 'SAT102',
    name: 'Osmanlı Sanat Tarihi',
    instructor: 'Prof. Mehmet Öz',
    examDate: '2025-06-12',
    completion: 45,
    color: '#6A4A8C',
    lessons: 20, done: 9,
  },
  {
    id: 3, year: 2, code: 'ARK201',
    name: 'Arkeolojik Kazı Yöntemleri',
    instructor: 'Ayşe Kara',
    examDate: '2025-06-18',
    completion: 88,
    color: '#C45E8A',
    lessons: 18, done: 16,
  },
  {
    id: 4, year: 2, code: 'FEL202',
    name: 'Antik Türk Felsefesi',
    instructor: 'Dr. Hasan Yıldız',
    examDate: '2025-06-25',
    completion: 30,
    color: '#4A6A8C',
    lessons: 22, done: 7,
  },
  {
    id: 5, year: 3, code: 'MUZ301',
    name: 'Geleneksel Türk Müziği',
    instructor: 'Zeynep Arslan',
    examDate: '2025-07-02',
    completion: 55,
    color: '#8B6F4A',
    lessons: 16, done: 9,
  },
  {
    id: 6, year: 4, code: 'KOR401',
    name: 'Miras Koruma Hukuku',
    instructor: 'Prof. Ali Demir',
    examDate: '2025-07-10',
    completion: 20,
    color: '#7A6BAD',
    lessons: 28, done: 6,
  },
];

const QUIZ_QUESTIONS = [
  {
    id: 1,
    q: 'Göbekli Tepe\'nin inşa tarihi yaklaşık kaç yıl öncesine dayanmaktadır?',
    options: ['5.000 yıl', '8.000 yıl', '12.000 yıl', '3.500 yıl'],
    correct: 2,
    explanation: 'Göbekli Tepe yaklaşık 12.000 yıl önce, MÖ 10.000 civarında inşa edilmiştir.',
  },
  {
    id: 2,
    q: 'Türkiye\'deki ilk UNESCO Dünya Mirası hangi yılda tescillenmiştir?',
    options: ['1982', '1985', '1990', '1978'],
    correct: 1,
    explanation: 'Göreme Ulusal Parkı ve Kapadokya Kaya Sitleri 1985\'te tescillenmiştir.',
  },
  {
    id: 3,
    q: 'Efes antik kenti hangi medeniyete ait büyük bir ticaret merkeziydi?',
    options: ['Hitit', 'Roma', 'Selçuklu', 'Bizans'],
    correct: 1,
    explanation: 'Efes, Roma İmparatorluğu döneminde Anadolu\'nun en önemli ticaret merkeziydi.',
  },
  {
    id: 4,
    q: 'Çatalhöyük hangi döneme ait bir yerleşim alanıdır?',
    options: ['Kalkolitik', 'Tunç Çağı', 'Neolitik', 'Demir Çağı'],
    correct: 2,
    explanation: 'Çatalhöyük, MÖ 7500-5700 yılları arasına tarihlenen bir Neolitik yerleşim alanıdır.',
  },
  {
    id: 5,
    q: 'Hitit uygarlığının başkenti aşağıdakilerden hangisidir?',
    options: ['Troya', 'Hattuşa', 'Sardis', 'Miletos'],
    correct: 1,
    explanation: 'Hattuşa (bugünkü Boğazköy), Hitit İmparatorluğu\'nun başkentiydi.',
  },
];

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
function CourseCard({ course }) {
  const days = daysUntil(course.examDate);
  const urgencyColor = days <= 3 ? C.terracotta : days <= 7 ? '#D4862A' : C.muted;
  const examLabel = new Date(course.examDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

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
              <span style={{ fontFamily: dm, fontSize: '9px', color: urgencyColor, fontWeight: 600 }}>
                {days <= 0 ? 'Bugün!' : `${days}g`} · {examLabel}
              </span>
            </div>
            <p style={{
              fontFamily: pf, fontSize: '12.5px', fontWeight: 600, color: C.charcoal,
              lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '170px',
            }}>
              {course.name}
            </p>
            <p style={{ fontFamily: dm, fontSize: '9.5px', color: C.muted, marginTop: '2px' }}>
              {course.instructor}
            </p>
          </div>
          {/* Completion ring */}
          <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
            <svg width="38" height="38" viewBox="0 0 38 38">
              <circle cx="19" cy="19" r="15" fill="none" stroke={C.faint} strokeWidth="3"/>
              <circle cx="19" cy="19" r="15" fill="none" stroke={course.color} strokeWidth="3"
                strokeDasharray={`${2*Math.PI*15}`}
                strokeDashoffset={`${2*Math.PI*15*(1-course.completion/100)}`}
                strokeLinecap="round" transform="rotate(-90 19 19)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}/>
            </svg>
            <span style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              fontFamily: dm, fontSize: '8px', fontWeight: 700, color: course.color,
            }}>
              {course.completion}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', borderRadius: '999px', background: C.faint, overflow: 'hidden', marginTop: '4px' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            width: `${course.completion}%`,
            background: `linear-gradient(90deg, ${course.color}99, ${course.color})`,
            transition: 'width 1s ease',
          }} />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontFamily: dm, fontSize: '9.5px', color: C.muted }}>
            {course.done}/{course.lessons} ders tamamlandı
          </span>
          <button style={{
            fontFamily: dm, fontSize: '10px', fontWeight: 600,
            color: course.color, background: 'none', border: 'none', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            Devam Et →
          </button>
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
  const { xp, level, levelPct } = useXP();
  const [yearFilter, setYearFilter] = useState(0);

  const filtered = yearFilter === 0
    ? COURSES
    : COURSES.filter(c => c.year === yearFilter);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

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

          {/* Urgency / XP card */}
          <UrgencyCard xp={xp} level={level} levelPct={levelPct} />

          {/* Year filter */}
          <YearFilter active={yearFilter} onChange={setYearFilter} />

          {/* Course list */}
          <div style={{ paddingBottom: '4px' }}>
            {filtered.map(course => (
              <CourseCard key={course.id} course={course} />
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
