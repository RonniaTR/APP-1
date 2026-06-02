import React from 'react';

/* ── Tabler outline icon paths (stroke, no fill) ─────── */
const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
      <path d="M5 12L12 5L19 12" />
      <path d="M5 12V19C5 19.5523 5.44772 20 6 20H9V16C9 15.4477 9.44772 15 10 15H14C14.5523 15 15 15.4477 15 16V20H18C18.5523 20 19 19.5523 19 19V12" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5L9.5 14.5" />
      <path d="M14.5 9.5L16 8L14.5 9.5Z" />
      <path d="M9.5 14.5L8 16L9.5 14.5Z" />
      <path d="M15.536 8.464L10 10L8.464 15.536" />
    </svg>
  ),
  school: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
      <path d="M22 9L12 5L2 9L12 13L22 9Z" />
      <path d="M6 10.6V16C6 16 8.5 18 12 18C15.5 18 18 16 18 16V10.6" />
      <path d="M22 9V13" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
      <path d="M6 4H18C18.5523 4 19 4.44772 19 5V21L12 17L5 21V5C5 4.44772 5.44772 4 6 4Z" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20C4 17 7.58172 14 12 14C16.4183 14 20 17 20 20" />
    </svg>
  ),
};

const TABS = [
  { id: 'home',     label: 'Ana Sayfa', icon: 'home'     },
  { id: 'discover', label: 'Keşfet',    icon: 'compass'  },
  { id: 'courses',  label: 'Dersler',   icon: 'school'   },
  { id: 'saved',    label: 'Kaydedilenler', icon: 'bookmark' },
  { id: 'profile',  label: 'Profil',    icon: 'user'     },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav
      style={{
        background: 'rgba(250,247,242,0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(28,20,16,0.10)',
      }}
      className="flex items-center justify-around px-1 pt-3 pb-5 flex-shrink-0"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex flex-col items-center gap-[5px] flex-1 outline-none border-none bg-transparent cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* icon */}
            <span
              style={{
                color: isActive ? '#1C1410' : 'rgba(28,20,16,0.38)',
                stroke: isActive ? '#1C1410' : 'rgba(28,20,16,0.38)',
                transition: 'color 0.2s ease, stroke 0.2s ease',
              }}
            >
              {ICONS[tab.icon]}
            </span>

            {/* label */}
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: tab.label.length > 8 ? '9px' : '10px',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.02em',
                color: isActive ? '#1C1410' : 'rgba(28,20,16,0.38)',
                transition: 'color 0.2s ease, font-weight 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </span>

            {/* active dot */}
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#B8944A',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1)' : 'scale(0)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
