import React, { useState } from 'react';
import BottomNav      from './BottomNav';
import AIPanel        from './AIPanel';
import { XPProvider, useXP } from '../contexts/XPContext';
import HomeScreen     from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import CoursesScreen  from '../screens/CoursesScreen';
import SavedScreen    from '../screens/SavedScreen';
import ProfileScreen  from '../screens/ProfileScreen';

const SCREEN_MAP = {
  home:     HomeScreen,
  discover: DiscoverScreen,
  courses:  CoursesScreen,
  saved:    SavedScreen,
  profile:  ProfileScreen,
};

/* ── XP Burst overlay ─────────────────────────────────── */
function XPBurst() {
  const { burst } = useXP();
  if (!burst) return null;
  return (
    <div style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 999,
      pointerEvents: 'none',
      animation: 'xpBurst 1.4s ease-out forwards',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '22px', fontWeight: 800,
      color: '#B8944A',
      textShadow: '0 2px 12px rgba(184,148,74,0.5)',
      whiteSpace: 'nowrap',
    }}>
      {burst.label}
    </div>
  );
}

/* ── AI Modal (slide-up bottom sheet) ─────────────────── */
function AIModal({ open, onClose }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 200,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '88vh',
        background: '#110C08',
        borderRadius: '24px 24px 0 0',
        border: '0.5px solid rgba(184,148,74,0.25)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* Drag handle + close */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px 0',
          flexShrink: 0,
        }}>
          <div style={{
            width: '36px', height: '4px', borderRadius: '999px',
            background: 'rgba(250,247,242,0.15)',
            margin: '0 auto',
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            top: '10px',
          }} />
          <div style={{ width: 32 }} />
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(250,247,242,0.08)',
              border: '0.5px solid rgba(250,247,242,0.12)',
              color: 'rgba(250,247,242,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px', lineHeight: 1,
              WebkitTapHighlightColor: 'transparent',
              marginLeft: 'auto',
            }}
          >
            ✕
          </button>
        </div>

        {/* Panel content fills remaining space */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AIPanel />
        </div>
      </div>
    </>
  );
}

/* ── FAB button ───────────────────────────────────────── */
function FAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '80px', right: '20px',
        width: '56px', height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #B8944A, #D4AA6A)',
        boxShadow: '0 4px 20px rgba(184,148,74,0.45), 0 2px 8px rgba(0,0,0,0.3)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        fontSize: '24px',
      }}
      onMouseDown={e => {
        e.currentTarget.style.transform = 'scale(0.92)';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(184,148,74,0.35)';
      }}
      onMouseUp={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(184,148,74,0.45), 0 2px 8px rgba(0,0,0,0.3)';
      }}
      onTouchStart={e => {
        e.currentTarget.style.transform = 'scale(0.92)';
      }}
      onTouchEnd={e => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      aria-label="AI Hoca Asistan"
    >
      🦉
    </button>
  );
}

/* ── Shell inner (needs XP context) ──────────────────── */
function ShellInner() {
  const [activeTab, setActiveTab] = useState('home');
  const [aiOpen, setAiOpen]       = useState(false);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#FAF7F2',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Screen area */}
      <div
        key={activeTab}
        className="animate-fade-up screen-scroll scrollbar-hide"
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {React.createElement(SCREEN_MAP[activeTab])}
      </div>

      {/* XP burst overlay */}
      <XPBurst />

      {/* Bottom nav */}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {/* FAB */}
      <FAB onClick={() => setAiOpen(true)} />

      {/* AI slide-up modal */}
      <AIModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

/* ── Main export ──────────────────────────────────────── */
export default function MobileShell() {
  return (
    <div style={{
      width: '100vw', height: '100dvh',
      overflow: 'hidden',
      background: '#FAF7F2',
    }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }

        @keyframes xpBurst {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.6); }
          20%  { opacity: 1; transform: translate(-50%,-70%) scale(1.1); }
          70%  { opacity: 1; transform: translate(-50%,-90%) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-110%) scale(0.9); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes flashGreen {
          0%,100% { background: transparent; }
          30%     { background: rgba(52,199,89,0.18); }
        }
        @keyframes flashRed {
          0%,100% { background: transparent; }
          30%     { background: rgba(255,59,48,0.15); }
        }
        @keyframes slideInUp {
          from { opacity:0; transform: translateY(16px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.04); }
        }
        .flash-correct { animation: flashGreen 0.6s ease; }
        .flash-wrong   { animation: flashRed   0.6s ease; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <XPProvider>
        <ShellInner />
      </XPProvider>
    </div>
  );
}
