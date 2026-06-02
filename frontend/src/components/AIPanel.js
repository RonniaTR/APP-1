import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Tokens ──────────────────────────────────────────── */
const C = {
  parchment:  '#FAF7F2',
  charcoal:   '#1C1410',
  gold:       '#B8944A',
  goldLight:  '#D4AA6A',
  muted:      'rgba(250,247,242,0.45)',
  faint:      'rgba(250,247,242,0.08)',
  panelBg:    '#110C08',
  panelBorder:'rgba(184,148,74,0.20)',
  userBubble: '#B8944A',
  aiBubble:   'rgba(250,247,242,0.07)',
  errorBubble:'rgba(192,83,58,0.15)',
};
const dm = "'DM Sans', sans-serif";
const pf = "'Playfair Display', serif";

/* ─── Backend URL ─────────────────────────────────────── */
// package.json "proxy": "http://localhost:8001" ile çalışır.
// Prod ortamında REACT_APP_API_URL env değişkeninden alınır.
const API_BASE = process.env.REACT_APP_API_URL || '';
const AI_ENDPOINT = `${API_BASE}/api/ai-assistant`;

/* ─── Quick suggestion chips ──────────────────────────── */
const SUGGESTIONS = [
  'Paraloid B-72 vs B-48N',
  'Göbekli Tepe kireçtaşı koruma',
  'UNESCO tescil süreci',
  'Mozaik restorasyon teknikleri',
  'Osmanlı çini glazür analizi',
];

/* ─── Typing Indicator ────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '10px 14px',
      background: C.aiBubble,
      borderRadius: '14px 14px 14px 4px',
      width: 'fit-content',
      border: `0.5px solid ${C.faint}`,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: C.goldLight,
          animation: `typingBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─── Message bubble ──────────────────────────────────── */
function Bubble({ msg }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'msgIn 0.3s ease',
    }}>
      {/* AI/Error avatar */}
      {!isUser && (
        <div style={{
          width: '22px', height: '22px', borderRadius: '8px', flexShrink: 0,
          background: isError ? 'rgba(192,83,58,0.2)' : 'rgba(184,148,74,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', marginRight: '6px', marginTop: '2px',
          alignSelf: 'flex-start',
        }}>
          {isError ? '⚠️' : '🦉'}
        </div>
      )}

      <div style={{
        maxWidth: '78%',
        padding: '9px 12px',
        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        background: isUser
          ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
          : isError ? C.errorBubble : C.aiBubble,
        border: !isUser ? `0.5px solid ${C.faint}` : 'none',
        fontFamily: dm, fontSize: '11px', lineHeight: 1.6,
        color: isUser ? C.charcoal : C.parchment,
        whiteSpace: 'pre-wrap',          // preserve line breaks in AI response
        wordBreak: 'break-word',
      }}>
        {msg.text}
      </div>
    </div>
  );
}

/* ─── Main AI Panel ───────────────────────────────────── */
export default function AIPanel() {
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'ai',
      text: 'Merhaba! Ben Kültür Koruma Akademisi\'nin AI hoca asistanıyım. 🏛️\n\nArkeoloji, restorasyon teknikleri veya Türk kültür mirası hakkında sorularınızı yanıtlayabilirim. Size nasıl yardımcı olabilirim?',
    },
  ]);
  const [input,           setInput]           = useState('');
  const [isTyping,        setIsTyping]         = useState(false);
  const [showSuggestions, setShowSuggestions]  = useState(true);
  const [sessionId]                            = useState(() => crypto.randomUUID());
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  /* Auto-scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* Core send function — calls real backend */
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setShowSuggestions(false);
    setInput('');

    // 1. Append user bubble immediately
    const userMsg = { id: Date.now(), role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);

    // 2. Show typing indicator
    setIsTyping(true);

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      });

      if (!res.ok) {
        // Try to parse error detail from FastAPI
        let detail = `Sunucu hatası (${res.status})`;
        try {
          const errData = await res.json();
          detail = errData.detail || detail;
        } catch (_) { /* ignore */ }
        throw new Error(detail);
      }

      const data = await res.json();
      const aiText = data.response || 'Yanıt alınamadı.';

      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: aiText }]);

    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'error',
          text: `Bağlantı hatası: ${err.message}\n\nBackend çalışıyor mu? (cd backend && uvicorn server:app --port 8001)`,
        },
      ]);
    }
  }, [isTyping, sessionId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.5; }
          30%            { transform: translateY(-5px); opacity: 1;   }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes onlinePulse {
          0%,100% { box-shadow: 0 0 0 0   rgba(52,199,89,0.6); }
          50%     { box-shadow: 0 0 0 5px rgba(52,199,89,0);   }
        }
        .ai-input::placeholder { color: rgba(250,247,242,0.3); }
      `}</style>

      <div style={{
        width: '260px', height: '620px',
        borderRadius: '24px',
        background: C.panelBg,
        border: `0.5px solid ${C.panelBorder}`,
        boxShadow: '0 0 0 0.5px rgba(184,148,74,0.12), 0 24px 60px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0,
      }}>

        {/* ── Header ───────────────────────────────────── */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: `0.5px solid ${C.faint}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Avatar */}
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg,#2A1A0A,#1A0C06)',
              border: `0.5px solid rgba(184,148,74,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>
              🦉
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: pf, fontSize: '14px', fontWeight: 600, color: C.parchment, lineHeight: 1.2 }}>
                AI Hoca Asistan
              </h3>
              <p style={{ fontFamily: dm, fontSize: '9.5px', color: C.muted, marginTop: '1px' }}>
                Kültür koruma uzmanı
              </p>
            </div>

            {/* Online badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(52,199,89,0.12)', borderRadius: '999px', padding: '4px 8px',
              border: '0.5px solid rgba(52,199,89,0.25)',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#34C759', animation: 'onlinePulse 2s infinite',
              }} />
              <span style={{ fontFamily: dm, fontSize: '9px', fontWeight: 600, color: '#34C759' }}>
                Çevrimiçi
              </span>
            </div>
          </div>

          {/* Topic chips */}
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap' }}>
            {['Arkeoloji', 'Restorasyon', 'UNESCO', 'Tarihi Eser'].map(t => (
              <span key={t} style={{
                fontFamily: dm, fontSize: '8.5px', color: C.goldLight,
                background: 'rgba(184,148,74,0.1)',
                border: '0.5px solid rgba(184,148,74,0.2)',
                borderRadius: '999px', padding: '2px 7px',
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Messages ─────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '12px 12px 8px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          scrollbarWidth: 'none',
        }}>
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', animation: 'msgIn 0.3s ease' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(184,148,74,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px',
              }}>
                🦉
              </div>
              <TypingDots />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Quick Suggestions ────────────────────────── */}
        {showSuggestions && (
          <div style={{ padding: '0 10px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <p style={{ fontFamily: dm, fontSize: '9px', color: C.muted, marginBottom: '6px', paddingLeft: '2px' }}>
              Hızlı sorular:
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isTyping}
                  style={{
                    fontFamily: dm, fontSize: '9.5px', fontWeight: 500,
                    color: C.goldLight,
                    background: 'rgba(184,148,74,0.08)',
                    border: '0.5px solid rgba(184,148,74,0.22)',
                    borderRadius: '999px', padding: '5px 10px',
                    cursor: isTyping ? 'default' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                    opacity: isTyping ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isTyping) {
                      e.currentTarget.style.background = 'rgba(184,148,74,0.18)';
                      e.currentTarget.style.borderColor = 'rgba(184,148,74,0.45)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(184,148,74,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(184,148,74,0.22)';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input bar ────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{
          padding: '8px 10px 12px',
          borderTop: `0.5px solid ${C.faint}`,
          display: 'flex', gap: '7px', alignItems: 'center',
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            className="ai-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Bir soru sor…"
            disabled={isTyping}
            style={{
              flex: 1,
              background: 'rgba(250,247,242,0.06)',
              border: '0.5px solid rgba(250,247,242,0.12)',
              borderRadius: '12px', padding: '9px 12px',
              fontFamily: dm, fontSize: '11px', color: C.parchment,
              outline: 'none',
              opacity: isTyping ? 0.6 : 1,
              transition: 'border-color 0.15s ease, opacity 0.15s ease',
            }}
            onFocus={e  => { if (!isTyping) e.target.style.borderColor = 'rgba(184,148,74,0.45)'; }}
            onBlur={e   => { e.target.style.borderColor = 'rgba(250,247,242,0.12)'; }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            style={{
              width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
              background: input.trim() && !isTyping
                ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
                : 'rgba(250,247,242,0.08)',
              border: `0.5px solid ${input.trim() && !isTyping ? C.gold : 'rgba(250,247,242,0.1)'}`,
              cursor: input.trim() && !isTyping ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseDown={e => { if (input.trim() && !isTyping) e.currentTarget.style.transform = 'scale(0.9)'; }}
            onMouseUp={e   => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() && !isTyping ? C.charcoal : 'rgba(250,247,242,0.3)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
