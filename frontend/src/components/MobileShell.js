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

/* ── XP Burst overlay ────────────────────────────────── */
function XPBurst() {
  const { burst } = useXP();
  if (!burst) return null;
  return (
    <div style={{
      position: 'absolute',
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

/* ── Shell inner (needs XP context) ─────────────────── */
function ShellInner() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div
      style={{
        width: '286px', height: '620px',
        borderRadius: '40px',
        background: '#FAF7F2',
        boxShadow:
          '0 0 0 0.5px rgba(184,148,74,0.30), ' +
          '0 32px 80px rgba(0,0,0,0.75), ' +
          '0 8px 24px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Notch */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '88px', height: '28px',
        background: '#FAF7F2',
        borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px',
        zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1C1410', opacity: 0.12 }} />
        <div style={{ width: '40px', height: '5px', borderRadius: '999px', background: '#1C1410', opacity: 0.1 }} />
      </div>

      {/* Status bar */}
      <div style={{
        height: '44px', flexShrink: 0,
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingLeft: '20px', paddingRight: '20px', paddingBottom: '6px',
      }}>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '11px', fontWeight: 600, color: '#1C1410' }}>
          9:41
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
            <rect x="0"  y="7" width="3" height="4"  rx="0.5" fill="#1C1410" opacity="0.75"/>
            <rect x="4"  y="5" width="3" height="6"  rx="0.5" fill="#1C1410" opacity="0.75"/>
            <rect x="8"  y="3" width="3" height="8"  rx="0.5" fill="#1C1410" opacity="0.75"/>
            <rect x="12" y="0" width="3" height="11" rx="0.5" fill="#1C1410" opacity="0.75"/>
          </svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
            <path d="M7.5 8.5C8.05 8.5 8.5 8.95 8.5 9.5C8.5 10.05 8.05 10.5 7.5 10.5C6.95 10.5 6.5 10.05 6.5 9.5C6.5 8.95 6.95 8.5 7.5 8.5Z" fill="#1C1410" opacity="0.75"/>
            <path d="M4.5 6.2C5.5 5.2 6.45 4.8 7.5 4.8C8.55 4.8 9.5 5.2 10.5 6.2" stroke="#1C1410" strokeWidth="1.2" strokeLinecap="round" opacity="0.75"/>
            <path d="M2 3.5C3.8 1.7 5.5 1 7.5 1C9.5 1 11.2 1.7 13 3.5" stroke="#1C1410" strokeWidth="1.2" strokeLinecap="round" opacity="0.75"/>
          </svg>
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
            <rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="#1C1410" strokeOpacity="0.75"/>
            <rect x="2" y="2" width="13" height="7" rx="1.5" fill="#1C1410" opacity="0.75"/>
            <path d="M19.5 3.5V7.5C20.3 7.2 21 6.5 21 5.5C21 4.5 20.3 3.8 19.5 3.5Z" fill="#1C1410" opacity="0.5"/>
          </svg>
        </div>
      </div>

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
    </div>
  );
}

/* ── Main export ─────────────────────────────────────── */
export default function MobileShell() {
  return (
    <div style={{
      minHeight: '100vh', minWidth: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #3A1F0D 0%, #1A0C04 40%, #0A0604 100%)',
      padding: '24px 20px',
    }}>
      <style>{`
        @keyframes xpBurst {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.6); }
          20%  { opacity: 1; transform: translate(-50%,-70%) scale(1.1); }
          70%  { opacity: 1; transform: translate(-50%,-90%) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-110%) scale(0.9); }
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
      `}</style>

      <XPProvider>
        {/* ── Outer layout: phone + AI panel side by side ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {/* Phone mockup */}
          <ShellInner />

          {/* AI companion panel */}
          <AIPanel />
        </div>
      </XPProvider>
    </div>
  );
}
