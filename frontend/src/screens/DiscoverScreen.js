import React, { useState } from 'react';

/* ─── Design tokens ───────────────────────────────────── */
const C = {
  parchment: '#FAF7F2',
  charcoal:  '#1C1410',
  gold:      '#B8944A',
  goldLight: '#D4AA6A',
  muted:     'rgba(28,20,16,0.45)',
  faint:     'rgba(28,20,16,0.08)',
  surface:   '#F3EFE8',
  darkCard:  '#1E1209',
};

const dmSans   = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

/* ─── Tabler icon: Search ─────────────────────────────── */
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="rgba(28,20,16,0.38)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20L16.65 16.65" />
  </svg>
);

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const IconMapPin = ({ color = '#B8944A' }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={color} stroke={color}
    strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" fill="white" />
  </svg>
);

/* ─── DATA ────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 1, emoji: '🏛️', label: 'Arkeoloji',  count: '248 içerik', color: '#8B6F4A' },
  { id: 2, emoji: '🎨', label: 'Sanat',       count: '312 içerik', color: '#C45E8A' },
  { id: 3, emoji: '📖', label: 'Edebiyat',    count: '189 içerik', color: '#4A6A8C' },
  { id: 4, emoji: '🎵', label: 'Müzik',       count: '156 içerik', color: '#5E8AC4' },
  { id: 5, emoji: '⚗️', label: 'Bilim',       count: '203 içerik', color: '#4A8C6A' },
  { id: 6, emoji: '🦉', label: 'Felsefe',     count: '134 içerik', color: '#7A6BAD' },
];

const MAP_PINS = [
  { id: 1, name: 'Göbekli Tepe',   x: 68, y: 54, color: '#B8944A', type: 'UNESCO' },
  { id: 2, name: 'Efes',           x: 22, y: 60, color: '#4A90B8', type: 'UNESCO' },
  { id: 3, name: 'Çatalhöyük',     x: 48, y: 58, color: '#4A8C6A', type: 'Arkeoloji' },
  { id: 4, name: 'Troya',          x: 18, y: 42, color: '#C45E8A', type: 'UNESCO' },
  { id: 5, name: 'Nemrut Dağı',    x: 72, y: 48, color: '#8B6F4A', type: 'UNESCO' },
  { id: 6, name: 'Divriği',        x: 60, y: 40, color: '#7A6BAD', type: 'UNESCO' },
];

const INSTRUCTORS = [
  { id: 1, name: 'Dr. Elif Şahin',   role: 'Arkeoloji', initial: 'E', color: '#4A8C6A',  students: '4.2K', rating: 4.9 },
  { id: 2, name: 'Prof. Mehmet Öz',  role: 'Tarih',     initial: 'M', color: '#6A4A8C',  students: '6.1K', rating: 4.8 },
  { id: 3, name: 'Ayşe Kara',        role: 'Sanat',     initial: 'A', color: '#C45E8A',  students: '3.7K', rating: 4.7 },
  { id: 4, name: 'Dr. Hasan Yıldız', role: 'Felsefe',   initial: 'H', color: '#4A6A8C',  students: '2.9K', rating: 4.9 },
  { id: 5, name: 'Zeynep Arslan',    role: 'Müzik',     initial: 'Z', color: '#8B6F4A',  students: '5.3K', rating: 4.6 },
];

/* ─── Search Bar ──────────────────────────────────────── */
function SearchBar({ value, onChange }) {
  return (
    <div style={{
      margin: '10px 16px 14px',
      display: 'flex', alignItems: 'center', gap: '8px',
      background: 'transparent',
      border: `0.5px solid rgba(28,20,16,0.18)`,
      borderRadius: '14px',
      padding: '9px 12px',
    }}>
      <IconSearch />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Konu, yer, hoca ara…"
        style={{
          flex: 1, background: 'none', border: 'none', outline: 'none',
          fontFamily: dmSans, fontSize: '12px', color: C.charcoal,
          '::placeholder': { color: C.muted },
        }}
      />
      {value && (
        <button onClick={() => onChange('')}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: '14px', lineHeight: 1,
            WebkitTapHighlightColor: 'transparent' }}>
          ✕
        </button>
      )}
    </div>
  );
}

/* ─── Featured Hero Card ──────────────────────────────── */
function HeroCard() {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{
      margin: '0 16px 16px',
      borderRadius: '20px',
      background: C.darkCard,
      overflow: 'hidden',
      border: `0.5px solid rgba(184,148,74,0.25)`,
      position: 'relative',
    }}>
      {/* Decorative background circles */}
      <div style={{
        position: 'absolute', top: '-30px', right: '-30px',
        width: '120px', height: '120px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(184,148,74,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20px', left: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(74,106,140,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ padding: '16px', position: 'relative' }}>
        {/* Gold label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: C.gold, flexShrink: 0,
          }} />
          <span style={{
            fontFamily: dmSans, fontSize: '9px', fontWeight: 700,
            color: C.goldLight, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Öne Çıkan Program
          </span>
        </div>

        <h2 style={{
          fontFamily: playfair, fontSize: '17px', fontWeight: 700,
          color: C.parchment, lineHeight: 1.3, marginBottom: '8px',
        }}>
          Anadolu Medeniyetleri Sertifika Programı
        </h2>

        <p style={{
          fontFamily: dmSans, fontSize: '11px', color: 'rgba(250,247,242,0.55)',
          lineHeight: 1.55, marginBottom: '14px',
        }}>
          12 haftalık kapsamlı program ile Hititlerden Osmanlı'ya Anadolu'nun
          7000 yıllık kültür mirasını keşfet.
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '14px',
          padding: '10px 12px', borderRadius: '12px',
          background: 'rgba(250,247,242,0.05)',
          border: `0.5px solid rgba(184,148,74,0.15)`,
        }}>
          {[
            { value: '12', label: 'Hafta' },
            { value: '48', label: 'Ders' },
            { value: '2.4K', label: 'Öğrenci' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontFamily: dmSans, fontSize: '14px', fontWeight: 700, color: C.goldLight }}>
                {stat.value}
              </p>
              <p style={{ fontFamily: dmSans, fontSize: '9px', color: 'rgba(250,247,242,0.4)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
          style={{
            width: '100%', padding: '11px',
            background: pressed
              ? `linear-gradient(135deg, #9A7A3A, #B8944A)`
              : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            border: 'none', borderRadius: '12px',
            fontFamily: dmSans, fontSize: '12px', fontWeight: 600,
            color: C.charcoal, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            WebkitTapHighlightColor: 'transparent',
            transform: pressed ? 'scale(0.98)' : 'scale(1)',
            transition: 'all 0.15s ease',
          }}>
          Programa Başla
          <IconArrow />
        </button>
      </div>
    </div>
  );
}

/* ─── Category Grid ───────────────────────────────────── */
function CategoryGrid() {
  const [active, setActive] = useState(null);
  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ fontFamily: playfair, fontSize: '14px', fontWeight: 600, color: C.charcoal }}>
          Kategoriler
        </h3>
        <button style={{
          fontFamily: dmSans, fontSize: '10px', color: C.gold,
          background: 'none', border: 'none', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
          Tümünü gör
        </button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
      }}>
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.id;
          return (
            <button key={cat.id} onClick={() => setActive(isActive ? null : cat.id)}
              style={{
                borderRadius: '16px', padding: '10px 6px',
                background: isActive ? cat.color : C.parchment,
                border: `0.5px solid ${isActive ? cat.color : C.faint}`,
                cursor: 'pointer', textAlign: 'center',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.18s ease',
                transform: isActive ? 'scale(0.97)' : 'scale(1)',
              }}>
              <div style={{ fontSize: '20px', marginBottom: '4px', lineHeight: 1 }}>
                {cat.emoji}
              </div>
              <p style={{
                fontFamily: dmSans, fontSize: '10px', fontWeight: 600,
                color: isActive ? '#fff' : C.charcoal, lineHeight: 1.2, marginBottom: '2px',
              }}>
                {cat.label}
              </p>
              <p style={{
                fontFamily: dmSans, fontSize: '8.5px',
                color: isActive ? 'rgba(255,255,255,0.7)' : C.muted,
              }}>
                {cat.count}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Heritage Map Card ───────────────────────────────── */
function MapCard() {
  const [activePin, setActivePin] = useState(null);
  return (
    <div style={{
      margin: '0 16px 16px',
      borderRadius: '20px',
      border: `0.5px solid ${C.faint}`,
      overflow: 'hidden',
      background: C.parchment,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `0.5px solid ${C.faint}`,
      }}>
        <div>
          <h3 style={{ fontFamily: playfair, fontSize: '13px', fontWeight: 600, color: C.charcoal }}>
            Miras Haritası
          </h3>
          <p style={{ fontFamily: dmSans, fontSize: '9.5px', color: C.muted, marginTop: '1px' }}>
            Türkiye UNESCO Alanları
          </p>
        </div>
        <span style={{
          fontFamily: dmSans, fontSize: '9px', fontWeight: 600,
          color: C.gold, background: 'rgba(184,148,74,0.1)',
          border: `0.5px solid rgba(184,148,74,0.25)`,
          borderRadius: '999px', padding: '3px 8px',
        }}>
          19 alan
        </span>
      </div>

      {/* SVG Map */}
      <div style={{ position: 'relative', height: '130px', background: '#EAE4D8' }}>
        <svg width="100%" height="130" viewBox="0 0 254 130" preserveAspectRatio="xMidYMid meet">
          {/* Terrain background layers */}
          <defs>
            <linearGradient id="terrainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D4C9B0" />
              <stop offset="100%" stopColor="#C8BC9E" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="254" height="130" fill="url(#terrainGrad)" />

          {/* SVG terrain silhouette of Anatolia (simplified) */}
          <path
            d="M 8 90 C 20 75, 35 80, 50 72 C 62 65, 68 55, 85 58 C 100 60, 108 52, 122 50
               C 138 48, 148 55, 162 52 C 175 50, 185 42, 198 45 C 210 48, 220 40, 235 44
               C 244 47, 250 55, 254 60 L 254 130 L 0 130 Z"
            fill="#B5A882" opacity="0.6"
          />
          <path
            d="M 0 100 C 15 88, 30 92, 45 85 C 58 79, 70 84, 88 80 C 104 76, 115 68, 130 66
               C 145 64, 158 70, 170 67 C 185 63, 195 55, 210 58 C 224 61, 238 54, 254 58
               L 254 130 L 0 130 Z"
            fill="#A89870" opacity="0.5"
          />
          {/* Water hint - Aegean left */}
          <path d="M 0 60 C 5 55, 10 62, 15 58 C 20 54, 22 60, 25 58 L 25 80 C 15 84, 8 78, 0 82 Z"
            fill="#7AAFCC" opacity="0.3" />
          {/* Mountain peaks */}
          {[[68, 48], [130, 38], [195, 32], [155, 44]].map(([mx, my], i) => (
            <polygon key={i}
              points={`${mx},${my} ${mx - 10},${my + 18} ${mx + 10},${my + 18}`}
              fill="#968A70" opacity="0.4" />
          ))}

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1={254 * t} y1="0" x2={254 * t} y2="130"
              stroke="rgba(28,20,16,0.05)" strokeWidth="0.5" strokeDasharray="3,3" />
          ))}
          {[0.33, 0.66].map((t, i) => (
            <line key={i} x1="0" y1={130 * t} x2="254" y2={130 * t}
              stroke="rgba(28,20,16,0.05)" strokeWidth="0.5" strokeDasharray="3,3" />
          ))}

          {/* Pins */}
          {MAP_PINS.map((pin) => {
            const px = (pin.x / 100) * 254;
            const py = (pin.y / 100) * 130;
            const isActive = activePin === pin.id;
            return (
              <g key={pin.id} onClick={() => setActivePin(isActive ? null : pin.id)}
                style={{ cursor: 'pointer' }}>
                {/* Pulse ring when active */}
                {isActive && (
                  <circle cx={px} cy={py} r="10" fill={pin.color} opacity="0.2" />
                )}
                {/* Pin circle */}
                <circle cx={px} cy={py} r={isActive ? 6 : 5}
                  fill={pin.color} stroke="white" strokeWidth="1.5"
                  style={{ transition: 'r 0.15s ease' }} />
                {/* Pin label when active */}
                {isActive && (
                  <g>
                    <rect x={px - 28} y={py - 24} width="56" height="14" rx="4"
                      fill={C.charcoal} />
                    <text x={px} y={py - 14} textAnchor="middle"
                      fill={C.parchment} fontSize="7" fontFamily="DM Sans, sans-serif">
                      {pin.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        padding: '8px 14px 10px',
        display: 'flex', gap: '14px',
        borderTop: `0.5px solid ${C.faint}`,
      }}>
        {[
          { color: C.gold, label: 'UNESCO' },
          { color: '#4A8C6A', label: 'Arkeoloji' },
          { color: '#C45E8A', label: 'Kültür' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
            <span style={{ fontFamily: dmSans, fontSize: '9px', color: C.muted }}>
              {item.label}
            </span>
          </div>
        ))}
        <span style={{
          marginLeft: 'auto', fontFamily: dmSans, fontSize: '9px', color: C.gold,
          cursor: 'pointer',
        }}>
          Tam harita →
        </span>
      </div>
    </div>
  );
}

/* ─── Instructors Row ─────────────────────────────────── */
function InstructorsRow() {
  const [following, setFollowing] = useState({});
  const toggle = (id) => setFollowing(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px 10px',
      }}>
        <h3 style={{ fontFamily: playfair, fontSize: '14px', fontWeight: 600, color: C.charcoal }}>
          Popüler Hocalar
        </h3>
        <button style={{
          fontFamily: dmSans, fontSize: '10px', color: C.gold,
          background: 'none', border: 'none', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
          Tümünü gör
        </button>
      </div>

      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
        className="scrollbar-hide">
        <div style={{ display: 'flex', gap: '10px', padding: '0 16px 4px' }}>
          {INSTRUCTORS.map((inst) => {
            const isFollowing = following[inst.id];
            return (
              <div key={inst.id} style={{
                flexShrink: 0, width: '110px',
                borderRadius: '18px',
                background: C.parchment,
                border: `0.5px solid ${C.faint}`,
                padding: '12px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '6px',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: inst.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: dmSans, fontSize: '18px', fontWeight: 700, color: '#fff',
                  border: `2px solid ${C.parchment}`,
                  boxShadow: `0 0 0 1.5px ${inst.color}40`,
                }}>
                  {inst.initial}
                </div>

                {/* Name */}
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: dmSans, fontSize: '10px', fontWeight: 600,
                    color: C.charcoal, lineHeight: 1.2,
                  }}>
                    {inst.name}
                  </p>
                  <p style={{ fontFamily: dmSans, fontSize: '8.5px', color: C.muted, marginTop: '1px' }}>
                    {inst.role}
                  </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontFamily: dmSans, fontSize: '8.5px', color: C.muted }}>
                    ⭐ {inst.rating}
                  </span>
                  <span style={{
                    width: '2px', height: '2px', borderRadius: '50%',
                    background: C.muted, display: 'inline-block',
                  }} />
                  <span style={{ fontFamily: dmSans, fontSize: '8.5px', color: C.muted }}>
                    {inst.students}
                  </span>
                </div>

                {/* Follow button */}
                <button
                  onClick={() => toggle(inst.id)}
                  style={{
                    width: '100%', padding: '5px 0',
                    borderRadius: '999px', cursor: 'pointer',
                    fontFamily: dmSans, fontSize: '10px', fontWeight: 600,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.18s ease',
                    ...(isFollowing ? {
                      background: 'transparent',
                      border: `0.5px solid rgba(28,20,16,0.25)`,
                      color: C.muted,
                    } : {
                      background: C.gold,
                      border: `0.5px solid ${C.gold}`,
                      color: '#fff',
                    }),
                  }}>
                  {isFollowing ? 'Takipte ✓' : 'Takip Et'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────── */
export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px 0',
        flexShrink: 0,
        borderBottom: `0.5px solid ${C.faint}`,
        paddingBottom: '0',
      }}>
        <h1 style={{
          fontFamily: playfair, fontSize: '17px', fontWeight: 600,
          color: C.charcoal, paddingBottom: '10px',
        }}>
          Keşfet
        </h1>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        className="scrollbar-hide">

        {/* Search bar */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Hero card */}
        <HeroCard />

        {/* Category grid */}
        <CategoryGrid />

        {/* Heritage map */}
        <MapCard />

        {/* Instructors */}
        <InstructorsRow />

        {/* Bottom padding */}
        <div style={{ height: '8px' }} />
      </div>
    </div>
  );
}
