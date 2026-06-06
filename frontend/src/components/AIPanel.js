import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* ─── Tokens ──────────────────────────────────────────── */
const C = {
  parchment:  'var(--bg-1)',
  charcoal:   'var(--txt-1)',
  gold:       '#B8944A',
  goldLight:  '#D4AA6A',
  muted:      'rgba(250,247,242,0.45)',
  faint:      'rgba(250,247,242,0.08)',
  panelBg:    '#110C08',
  userBubble: '#B8944A',
  aiBubble:   'rgba(250,247,242,0.07)',
  errorBubble:'rgba(192,83,58,0.15)',
};
const dm = "'DM Sans', sans-serif";
const pf = "'Playfair Display', serif";

/* ─── System prompt ───────────────────────────────────── */
const SYSTEM_PROMPT = `Sen "Prof. Kültür" adında bir Kültür Koruma Akademisi yapay zeka asistanısın.

Uzmanlık alanların: Türk kültür mirası, UNESCO Dünya Mirası alanları, arkeoloji, restorasyon teknikleri (Paraloid B-72, B-48N vb.), Osmanlı ve Selçuklu mimarisi, Anadolu medeniyetleri, müze yönetimi, KTVKK 2863.

Kurallar:
1. Her zaman Türkçe yanıt ver
2. Kısa, net ve bilgilendirici ol (maksimum 3-4 paragraf)  
3. Somut örnekler ve Türkiye'den vakalar kullan
4. Uydurma bilgi verme; emin olmadığında "Bu konuyu kaynaklardan teyit etmenizi öneririm" de
5. Emoji kullanımı: Az ama etkili (💡🏛️📜⚗️🔍)

Karakter: Prof. Kültür — sıcak, meraklı, öğretmeyi seven bir akademisyen.`;

/* ─── Gemini init ─────────────────────────────────────── */
let _model = null;
function getModel() {
  if (!_model) {
    const key = process.env.REACT_APP_GEMINI_API_KEY;
    if (!key) return null;
    const genAI = new GoogleGenerativeAI(key);
    _model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });
  }
  return _model;
}

/* ─── Quick suggestions ───────────────────────────────── */
const SUGGESTIONS = [
  'Paraloid B-72 vs B-48N',
  'Göbekli Tepe koruma',
  'UNESCO tescil süreci',
  'Mozaik restorasyon',
  'Osmanlı çini analizi',
];

/* ─── Typing dots ─────────────────────────────────────── */
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
      {!isUser && (
        <div style={{
          width: '24px', height: '24px', borderRadius: '8px', flexShrink: 0,
          background: isError ? 'rgba(192,83,58,0.2)' : 'rgba(184,148,74,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', marginRight: '8px', marginTop: '2px',
          alignSelf: 'flex-start',
        }}>
          {isError ? '⚠️' : '🦉'}
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: isUser
          ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
          : isError ? C.errorBubble : C.aiBubble,
        border: !isUser ? `0.5px solid ${C.faint}` : 'none',
        fontFamily: dm, fontSize: '13px', lineHeight: 1.6,
        color: isUser ? C.charcoal : C.parchment,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.text}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────── */
export default function AIPanel() {
  const [messages, setMessages] = useState([{
    id: 1, role: 'ai',
    text: 'Merhaba! Ben Kültür Koruma Akademisi\'nin AI hoca asistanıyım. 🏛️\n\nArkeoloji, restorasyon teknikleri veya Türk kültür mirası hakkında sorularınızı yanıtlayabilirim.',
  }]);
  const [input,           setInput]          = useState('');
  const [isTyping,        setIsTyping]        = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [chat,            setChat]            = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  /* Init Gemini chat session once */
  useEffect(() => {
    const model = getModel();
    if (model) setChat(model.startChat({ history: [] }));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setShowSuggestions(false);
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: trimmed }]);
    setIsTyping(true);

    try {
      if (!chat) throw new Error('Gemini API anahtarı yapılandırılmamış (REACT_APP_GEMINI_API_KEY).');
      const result = await chat.sendMessage(trimmed);
      const answer = result.response.text().trim() || 'Yanıt alınamadı.';
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 2, role: 'error',
        text: `Hata: ${err.message}`,
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [chat, isTyping]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

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
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
        background: C.panelBg,
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: `0.5px solid ${C.faint}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg,#2A1A0A,#1A0C06)',
              border: `0.5px solid rgba(184,148,74,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>🦉</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: pf, fontSize: '16px', fontWeight: 600, color: C.parchment, margin: 0 }}>
                AI Hoca Asistan
              </h3>
              <p style={{ fontFamily: dm, fontSize: '11px', color: C.muted, margin: '2px 0 0' }}>
                Kültür koruma uzmanı
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(52,199,89,0.12)', borderRadius: '999px', padding: '5px 10px',
              border: '0.5px solid rgba(52,199,89,0.25)',
            }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#34C759', animation: 'onlinePulse 2s infinite',
              }} />
              <span style={{ fontFamily: dm, fontSize: '10px', fontWeight: 600, color: '#34C759' }}>
                Çevrimiçi
              </span>
            </div>
          </div>

          {/* Topic chips */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
            {['Arkeoloji', 'Restorasyon', 'UNESCO', 'Tarihi Eser'].map(tag => (
              <span key={tag} style={{
                fontFamily: dm, fontSize: '10px', color: C.goldLight,
                background: 'rgba(184,148,74,0.1)',
                border: '0.5px solid rgba(184,148,74,0.2)',
                borderRadius: '999px', padding: '3px 9px',
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '16px 16px 8px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          scrollbarWidth: 'none',
        }}>
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', animation: 'msgIn 0.3s ease' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(184,148,74,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
              }}>🦉</div>
              <TypingDots />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Quick suggestions ── */}
        {showSuggestions && (
          <div style={{ padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <p style={{ fontFamily: dm, fontSize: '10px', color: C.muted, marginBottom: '8px' }}>
              Hızlı sorular:
            </p>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'nowrap' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} disabled={isTyping} style={{
                  fontFamily: dm, fontSize: '11px', fontWeight: 500,
                  color: C.goldLight,
                  background: 'rgba(184,148,74,0.08)',
                  border: '0.5px solid rgba(184,148,74,0.22)',
                  borderRadius: '999px', padding: '6px 12px',
                  cursor: isTyping ? 'default' : 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  opacity: isTyping ? 0.5 : 1,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <form onSubmit={handleSubmit} style={{
          padding: '10px 16px 20px',
          borderTop: `0.5px solid ${C.faint}`,
          display: 'flex', gap: '8px', alignItems: 'center',
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
              borderRadius: '14px', padding: '11px 14px',
              fontFamily: dm, fontSize: '13px', color: C.parchment,
              outline: 'none',
              opacity: isTyping ? 0.6 : 1,
            }}
            onFocus={e  => { if (!isTyping) e.target.style.borderColor = 'rgba(184,148,74,0.45)'; }}
            onBlur={e   => { e.target.style.borderColor = 'rgba(250,247,242,0.12)'; }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            style={{
              width: '42px', height: '42px', borderRadius: '14px', flexShrink: 0,
              background: input.trim() && !isTyping
                ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
                : 'rgba(250,247,242,0.08)',
              border: `0.5px solid ${input.trim() && !isTyping ? C.gold : 'rgba(250,247,242,0.1)'}`,
              cursor: input.trim() && !isTyping ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
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
