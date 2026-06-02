import React, { useState } from 'react';

/* ─── Tokens ──────────────────────────────────────────── */
const C = {
  parchment: '#FAF7F2',
  charcoal:  '#1C1410',
  gold:      '#B8944A',
  goldLight: '#D4AA6A',
  muted:     'rgba(28,20,16,0.45)',
  faint:     'rgba(28,20,16,0.08)',
  surface:   '#F3EFE8',
};
const dm = "'DM Sans', sans-serif";
const pf = "'Playfair Display', serif";

/* ─── Data ────────────────────────────────────────────── */
const SAVED_ITEMS = [
  {
    id: 1, type: 'Makale',
    title: 'Anadolu Uygarlıklarının Kayıp Dilleri',
    subtitle: 'Dr. Elif Şahin · 8 dk okuma',
    gradientFrom: '#2D5A3D', gradientTo: '#1A3A28',
    emoji: '📜', savedAt: '2 gün önce',
  },
  {
    id: 2, type: 'Haber',
    title: 'Göbekli Tepe\'de Yeni Bulgular Keşfedildi',
    subtitle: 'Kültür Bakanlığı · Dün',
    gradientFrom: '#5A3D2D', gradientTo: '#3A1A1A',
    emoji: '🏛️', savedAt: '1 gün önce',
  },
  {
    id: 3, type: 'Makale',
    title: 'Çatalhöyük\'ün 9000 Yıllık Sırları',
    subtitle: 'Prof. Mehmet Öz · 12 dk okuma',
    gradientFrom: '#3D2D5A', gradientTo: '#1A1A3A',
    emoji: '🔍', savedAt: '3 gün önce',
  },
  {
    id: 4, type: 'Alıntı',
    title: '"Bir milletin kültürünü yok etmek, hafızasını silmektir."',
    subtitle: 'Halide Edib Adıvar',
    gradientFrom: '#4A3D1A', gradientTo: '#2A2010',
    emoji: '💬', savedAt: '5 gün önce',
  },
  {
    id: 5, type: 'Haber',
    title: 'Efes\'te Yeni Restorasyon Projesi Başlıyor',
    subtitle: 'UNESCO · 2 gün önce',
    gradientFrom: '#1A3A5A', gradientTo: '#0A1A2A',
    emoji: '🌍', savedAt: '2 gün önce',
  },
  {
    id: 6, type: 'Makale',
    title: 'Hitit Dönemi Arkeolojik Kazı Yöntemleri',
    subtitle: 'Ayşe Kara · 6 dk okuma',
    gradientFrom: '#3D1A2D', gradientTo: '#1A0A15',
    emoji: '⛏️', savedAt: '1 hafta önce',
  },
  {
    id: 7, type: 'Alıntı',
    title: '"Medeniyetler köprülerle yükselir, duvarlarla değil."',
    subtitle: 'Yahya Kemal Beyatlı',
    gradientFrom: '#2D3D1A', gradientTo: '#151A0A',
    emoji: '✨', savedAt: '1 hafta önce',
  },
  {
    id: 8, type: 'Haber',
    title: 'Nemrut Dağı Ziyaretçi Rekoru Kırdı',
    subtitle: 'Kültür Turizm · 4 gün önce',
    gradientFrom: '#5A2D1A', gradientTo: '#3A1A0A',
    emoji: '⛰️', savedAt: '4 gün önce',
  },
];

const FILTERS = ['Tümü', 'Makaleler', 'Haberler', 'Alıntılar'];
const FILTER_MAP = { 'Makaleler': 'Makale', 'Haberler': 'Haber', 'Alıntılar': 'Alıntı' };

/* ─── Bookmark icon ───────────────────────────────────── */
function IconBookmark({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"
      fill={filled ? '#B8944A' : 'none'}
      stroke={filled ? '#B8944A' : 'rgba(28,20,16,0.35)'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

/* ─── Saved Item Card ─────────────────────────────────── */
function SavedCard({ item, saved, onToggle }) {
  const tagColors = {
    'Makale':  { bg: 'rgba(74,140,106,0.15)', text: '#2D6A4A' },
    'Haber':   { bg: 'rgba(74,106,140,0.15)', text: '#2D4A6A' },
    'Alıntı':  { bg: 'rgba(184,148,74,0.15)', text: '#7A5E1A' },
  };
  const tag = tagColors[item.type] || tagColors['Makale'];

  return (
    <div style={{
      margin: '0 14px 9px',
      borderRadius: '16px',
      background: C.parchment,
      border: `0.5px solid ${C.faint}`,
      display: 'flex', alignItems: 'center', gap: '11px',
      padding: '10px',
      overflow: 'hidden',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '12px', flexShrink: 0,
        background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '26px', position: 'relative', overflow: 'hidden',
      }}>
        {/* subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 8px)',
        }} />
        <span style={{ position: 'relative', zIndex: 1 }}>{item.emoji}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Tag */}
        <span style={{
          fontFamily: dm, fontSize: '8.5px', fontWeight: 700,
          color: tag.text, background: tag.bg,
          borderRadius: '4px', padding: '1px 6px',
          letterSpacing: '0.04em',
        }}>
          {item.type}
        </span>
        {/* Title */}
        <p style={{
          fontFamily: pf, fontSize: '11.5px', fontWeight: 600,
          color: C.charcoal, lineHeight: 1.35, marginTop: '4px',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.title}
        </p>
        {/* Subtitle */}
        <p style={{
          fontFamily: dm, fontSize: '9px', color: C.muted,
          marginTop: '3px', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.subtitle}
        </p>
      </div>

      {/* Bookmark toggle */}
      <button onClick={() => onToggle(item.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px', flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform 0.15s ease',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.85)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onTouchStart={e => e.currentTarget.style.transform = 'scale(0.85)'}
        onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <IconBookmark filled={saved} />
      </button>
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────── */
export default function SavedScreen() {
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [bookmarks, setBookmarks] = useState(
    Object.fromEntries(SAVED_ITEMS.map(i => [i.id, true]))
  );

  const toggleBookmark = (id) => {
    setBookmarks(p => ({ ...p, [id]: !p[id] }));
  };

  const filtered = SAVED_ITEMS.filter(item => {
    if (activeFilter === 'Tümü') return true;
    return item.type === FILTER_MAP[activeFilter];
  });

  const savedCount = Object.values(bookmarks).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 0',
        borderBottom: `0.5px solid ${C.faint}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px' }}>
          <div>
            <h1 style={{ fontFamily: pf, fontSize: '17px', fontWeight: 700, color: C.charcoal }}>
              Kütüphanem
            </h1>
            <p style={{ fontFamily: dm, fontSize: '10px', color: C.muted, marginTop: '1px' }}>
              {savedCount} kayıtlı içerik
            </p>
          </div>
          {/* Count badge */}
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: dm, fontSize: '14px', fontWeight: 800, color: '#fff',
          }}>
            {savedCount}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '-0.5px' }}
          className="scrollbar-hide">
          <div style={{ display: 'flex', gap: '0' }}>
            {FILTERS.map(f => {
              const isActive = activeFilter === f;
              return (
                <button key={f} onClick={() => setActiveFilter(f)}
                  style={{
                    fontFamily: dm, fontSize: '11px', fontWeight: isActive ? 600 : 400,
                    color: isActive ? C.charcoal : C.muted,
                    background: 'none', border: 'none',
                    borderBottom: isActive ? `2px solid ${C.gold}` : '2px solid transparent',
                    padding: '8px 12px 8px',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.15s ease',
                  }}>
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '10px' }}
        className="scrollbar-hide">
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '200px', gap: '8px',
          }}>
            <span style={{ fontSize: '36px' }}>🔖</span>
            <p style={{ fontFamily: pf, fontSize: '14px', color: C.muted }}>
              Henüz kayıt yok
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <SavedCard
              key={item.id}
              item={item}
              saved={!!bookmarks[item.id]}
              onToggle={toggleBookmark}
            />
          ))
        )}
        <div style={{ height: '8px' }} />
      </div>
    </div>
  );
}
