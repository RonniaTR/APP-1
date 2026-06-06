import React, { useState, useCallback, useEffect } from 'react';
import BottomNav        from './BottomNav';
import AIPanel          from './AIPanel';
import { XPProvider, useXP } from '../contexts/XPContext';
import ProfileScreen    from '../screens/ProfileScreen';
import CoursesScreen    from '../screens/CoursesScreen';
import FlashcardScreen  from '../screens/FlashcardScreen';
import AiCoachScreen    from '../screens/AiCoachScreen';
import GameScreen       from '../screens/GameScreen';
import ExamCoachScreen  from '../screens/ExamCoachScreen';
import DetectiveScreen  from '../screens/DetectiveScreen';
import DiscoverScreen   from '../screens/DiscoverScreen';
import DashboardScreen  from '../screens/DashboardScreen';
import AtlasLoginScreen from '../screens/AtlasLoginScreen';
import { makeTFunc }    from '../data/translations';
import { auth }         from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Ekranlar — t ve dil prop'u kabul edenler onu alır
const SCREEN_MAP = {
  dashboard: DashboardScreen,
  profile:   ProfileScreen,
  courses:   CoursesScreen,
  flashcard: FlashcardScreen,
  aicoach:   AiCoachScreen,
  game:      GameScreen,
  examcoach: ExamCoachScreen,
  detective: DetectiveScreen,
  discover:  DiscoverScreen,
};

const LOCALIZED_SCREENS = new Set(['profile', 'flashcard', 'game', 'discover']);

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
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'var(--overlay)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 200,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '88vh',
        background: 'var(--bg-deep)',
        borderRadius: '24px 24px 0 0',
        border: '0.5px solid var(--border-m)',
        boxShadow: '0 -8px 40px var(--shadow-m)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px 0',
          flexShrink: 0,
        }}>
          <div style={{
            width: '36px', height: '4px', borderRadius: '999px',
            background: 'var(--border-m)',
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
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      aria-label="AI Hoca Asistan"
    >
      🦉
    </button>
  );
}

/* ── Shell inner (needs XP context) ──────────────────── */
function ShellInner({ tema, setTema, dil, setDil, t }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [aiOpen, setAiOpen]       = useState(false);
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [nickInput, setNickInput] = useState('');

  // PWA Kurulum State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  const { xp, userProfile, updateProfileData } = useXP() || {};

  // PWA Kurulum dinleyicisi
  useEffect(() => {
    const handler = (e) => {
      // Chrome'un otomatik mini-infobar çıkarmasını engelle
      e.preventDefault();
      setDeferredPrompt(e);
      // Daha önce görülüp görülmediğini kontrol et
      const hasSeen = localStorage.getItem('kka_pwa_prompt');
      if (!hasSeen) {
        // Hoş geldin modalı ile çakışmaması için biraz gecikmeli göster
        setTimeout(() => setShowPwaPrompt(true), 2500);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    setShowPwaPrompt(false);
    localStorage.setItem('kka_pwa_prompt', 'true');
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismissPwa = () => {
    setShowPwaPrompt(false);
    localStorage.setItem('kka_pwa_prompt', 'true');
  };

  // İlk girişte nick yoksa popup aç
  useEffect(() => {
    // Eğer userProfile yüklendiyse ve isim 'Öğrenci' ise (varsayılan) veya hiç yoksa VEYA hasSetNickname true değilse
    if (userProfile && !userProfile.hasSetNickname) {
      if (!showOnboarding) {
        setNickInput(userProfile.displayName !== 'Öğrenci' ? userProfile.displayName : '');
        setShowOnboarding(true);
      }
    }
  }, [userProfile]);

  const handleSaveNick = () => {
    if (nickInput.trim().length < 2) return;
    if (updateProfileData) {
      updateProfileData({ displayName: nickInput.trim(), hasSetNickname: true });
    }
    setShowOnboarding(false);
  };

  const ScreenComponent = SCREEN_MAP[activeTab];
  const screenProps = LOCALIZED_SCREENS.has(activeTab) ? { dil, setDil, t, tema, setTema } : {};
  if (activeTab === 'dashboard') {
    screenProps.user = userProfile || { displayName: 'Kültür Elçisi', photoURL: auth.currentUser?.photoURL };
    screenProps.onNavigate = setActiveTab;
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-0)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'var(--surface)', padding: 32, borderRadius: 24,
            width: '100%', maxWidth: 360, textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border-m)',
            animation: 'fadeInUp 0.4s ease'
          }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--txt-1)', margin: '0 0 12px' }}>
              Akademiye Hoş Geldin!
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--txt-3)', fontSize: 13, marginBottom: 24 }}>
              Oyunlarda ve liderlik tablosunda kullanmak üzere sana nasıl hitap edelim?
            </p>
            <input 
              type="text" 
              placeholder="Adın veya takma adın..." 
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--bg-0)',
                color: 'var(--txt-1)', fontSize: 16, fontFamily: "'DM Sans', sans-serif",
                marginBottom: 20, outline: 'none'
              }}
            />
            <button 
              onClick={handleSaveNick}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, var(--altin), #B8944A)',
                color: '#FFF', fontSize: 15, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Kaydet ve Başla
            </button>
          </div>
        </div>
      )}

      {/* PWA Kurulum Modalı */}
      {showPwaPrompt && (
        <div style={{
          position: 'absolute', bottom: 80, left: 20, right: 20, zIndex: 9000,
          background: 'var(--surface)', borderRadius: 16, padding: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid var(--border-m)',
          animation: 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--altin), #C0533A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
              🏛️
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--txt-1)' }}>Akademi'yi Yükle</h3>
              <p style={{ margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--txt-3)', lineHeight: 1.4 }}>
                Daha hızlı erişim, tam ekran deneyimi ve bildirimler için ana ekranına ekle.
              </p>
            </div>
            <button onClick={handleDismissPwa} style={{ background: 'transparent', border: 'none', color: 'var(--txt-3)', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>
          <button onClick={handleInstallPwa} style={{ background: 'linear-gradient(135deg, var(--altin), #B8944A)', border: 'none', color: '#FFF', padding: '12px', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Hemen Yükle
          </button>
        </div>
      )}

      {/* Tema + Dil toggle bar kaldırıldı, artık ProfileScreen içerisinde. */}

      {/* Screen area */}
      <div
        key={activeTab}
        className="animate-fade-up screen-scroll scrollbar-hide"
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <ScreenComponent {...screenProps} />
      </div>

      <XPBurst />
      <BottomNav active={activeTab} onChange={setActiveTab} dil={dil} t={t} />
      <FAB onClick={() => setAiOpen(true)} />
      <AIModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

/* ── Main export ──────────────────────────────────────── */
export default function MobileShell() {
  const [tema, setTema] = useState(() => {
    const saved = localStorage.getItem('kka_tema');
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Watch for OS theme changes if user hasn't explicitly set one
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('kka_tema')) {
        setTema(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema);
  }, [tema]);

  // Auth state
  const [authUser, setAuthUser]       = useState(undefined); // undefined = loading
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  // Tema state moved to the top of component
  const [dil, setDil] = useState('tr');
  const t = useCallback(makeTFunc(dil), [dil]);

  // Auth loading splash
  if (!authChecked) {
    return (
      <div style={{
        width: '100vw', height: '100dvh',
        background: '#1A0E06',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 36, animation: 'pulse 1.5s infinite' }}>🏛️</div>
        <span style={{ fontFamily: "'Georgia',serif", fontSize: 12, color: '#C8A45A88', letterSpacing: '0.15em' }}>ATLAS</span>
      </div>
    );
  }

  // Login screen
  if (!authUser) {
    return (
      <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <style>{`
          @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        `}</style>
        <AtlasLoginScreen onLogin={(u) => setAuthUser(u)} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw', height: '100dvh',
        overflow: 'hidden',
        background: 'var(--scene-bg)',
        transition: 'background 0.3s ease',
      }}
    >
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
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .flash-correct { animation: flashGreen 0.6s ease; }
        .flash-wrong   { animation: flashRed   0.6s ease; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <XPProvider>
        <ShellInner tema={tema} setTema={setTema} dil={dil} setDil={setDil} t={t} />
      </XPProvider>
    </div>
  );
}
