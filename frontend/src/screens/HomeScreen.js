import React, { useState } from 'react';

/* ─── Design tokens ───────────────────────────────────── */
const C = {
  parchment: '#FAF7F2',
  charcoal:  '#1C1410',
  gold:      '#B8944A',
  goldLight: '#D4AA6A',
  muted:     'rgba(28,20,16,0.45)',
  faint:     'rgba(28,20,16,0.10)',
  surface:   '#F3EFE8',
};

const dmSans    = "'DM Sans', sans-serif";
const playfair  = "'Playfair Display', serif";

/* ─── Inline SVG Icons (Tabler outline) ──────────────── */
const IconHeart = ({ filled, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? C.gold : 'none'}
    stroke={filled ? C.gold : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19.5 12.572L12 20L4.5 12.572A5 5 0 1 1 12 6.006A5 5 0 1 1 19.5 12.572Z" />
  </svg>
);
const IconMessage = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" />
  </svg>
);
const IconBookmark = ({ filled, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? C.gold : 'none'}
    stroke={filled ? C.gold : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1z" />
  </svg>
);

/* ─── DATA ────────────────────────────────────────────── */
const STORIES = [
  { id: 1, label: 'Güncel',  seen: false, emoji: '🔥', color: '#E8633A' },
  { id: 2, label: 'Kimya',   seen: false, emoji: '⚗️', color: '#4A90B8' },
  { id: 3, label: 'Tarih',   seen: true,  emoji: '📜', color: '#8B6F4A' },
  { id: 4, label: 'Sanat',   seen: true,  emoji: '🎨', color: '#C45E8A' },
  { id: 5, label: 'Müzik',   seen: true,  emoji: '🎵', color: '#5E8AC4' },
  { id: 6, label: 'Felsefe', seen: false, emoji: '🦉', color: '#7A6BAD' },
];

const CATEGORIES = ['Tümü', 'Makale', 'UNESCO', 'Alıntı', 'Video', 'Podcast'];

const FEED = [
  { type: 'editorial', id: 1 },
  { type: 'infographic', id: 1 },
  { type: 'quote', id: 1 },
  { type: 'editorial', id: 2 },
  { type: 'infographic', id: 2 },
  { type: 'quote', id: 2 },
];

const ARTICLES = [
  {
    id: 1,
    gradientFrom: '#2D5A3D', gradientTo: '#1A3A28',
    tag: 'Kültür Mirası',
    title: 'Anadolu Uygarlıklarının Kayıp Dilleri',
    excerpt: 'Hattice ve Luvice, günümüzden 3500 yıl önce Anadolu steplerinde yankılanırdı…',
    author: 'Dr. Elif Şahin',
    authorInitial: 'E',
    authorColor: '#4A8C6A',
    time: '2 sa önce',
    likes: 248,
    comments: 34,
  },
  {
    id: 2,
    gradientFrom: '#3D2D5A', gradientTo: '#281A3A',
    tag: 'Arkeoloji',
    title: 'Çatalhöyük\'ün Sırları: 9000 Yıllık Şehir Hayatı',
    excerpt: 'Neolitik dönemin en büyük yerleşim alanı, modern şehir planlamasını bile etkiliyor…',
    author: 'Prof. Mehmet Öz',
    authorInitial: 'M',
    authorColor: '#6A4A8C',
    time: '5 sa önce',
    likes: 412,
    comments: 67,
  },
];

const UNESCO_SITES = [
  {
    id: 1,
    name: 'Göbekli Tepe',
    location: 'Şanlıurfa',
    progress: 78,
    year: '1995',
    color: '#B8944A',
    items: [
      { label: 'Tamamlanan kazı', value: 78 },
      { label: 'Bulunan eser',    value: 55 },
      { label: 'Araştırma verisi', value: 91 },
    ],
  },
  {
    id: 2,
    name: 'Efes Antik Kenti',
    location: 'İzmir',
    progress: 64,
    year: '2015',
    color: '#4A90B8',
    items: [
      { label: 'Restorasyon',   value: 64 },
      { label: 'Ziyaretçi kap.', value: 82 },
      { label: 'Dijital arşiv', value: 45 },
    ],
  },
];

const QUOTES = [
  {
    id: 1,
    text: 'Bir milletin kültürünü yok etmek, o milletin hafızasını silmektir; geçmişsiz bir toplum kör bir yolcudur.',
    author: 'Halide Edib Adıvar',
    role: 'Yazar & Düşünür',
    initial: 'H',
    color: '#8B6F4A',
  },
  {
    id: 2,
    text: 'Medeniyetler taş üstüne taş koymakla değil, nesiller arasında kurulan köprülerle yükselir.',
    author: 'Yahya Kemal Beyatlı',
    role: 'Şair',
    initial: 'Y',
    color: '#4A6A8C',
  },
];

/* ─── Sub-components ──────────────────────────────────── */

function StoriesRow({ seen, onToggle }) {
  return (
    <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
      className="scrollbar-hide">
      <div style={{ display: 'flex', gap: '12px', padding: '4px 16px 8px' }}>
        {STORIES.map((s) => {
          const isSeen = seen[s.id];
          return (
            <button key={s.id} onClick={() => onToggle(s.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '5px', background: 'none', border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}>
              {/* Ring */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', padding: '2px',
                background: isSeen
                  ? 'rgba(28,20,16,0.12)'
                  : `conic-gradient(${s.color} 0%, ${C.goldLight} 60%, ${s.color} 100%)`,
                transition: 'background 0.3s ease',
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: C.parchment,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                  border: `1.5px solid ${C.parchment}`,
                }}>
                  {s.emoji}
                </div>
              </div>
              <span style={{
                fontFamily: dmSans, fontSize: '9px', fontWeight: 500,
                color: isSeen ? C.muted : C.charcoal,
                transition: 'color 0.2s',
              }}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryPills({ active, onSelect }) {
  return (
    <div style={{ overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}
      className="scrollbar-hide">
      <div style={{ display: 'flex', gap: '6px', padding: '0 16px 12px' }}>
        {CATEGORIES.map((cat) => {
          const isActive = active === cat;
          return (
            <button key={cat} onClick={() => onSelect(cat)}
              style={{
                fontFamily: dmSans, fontSize: '11px', fontWeight: isActive ? 600 : 400,
                color: isActive ? C.parchment : C.charcoal,
                background: isActive ? C.charcoal : 'transparent',
                border: `0.5px solid ${isActive ? C.charcoal : C.faint}`,
                borderRadius: '999px', padding: '5px 12px',
                cursor: 'pointer', whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.18s ease',
                flexShrink: 0,
              }}>
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditorialCard({ data, liked, saved, onLike, onSave }) {
  return (
    <div style={{
      margin: '0 16px 14px',
      borderRadius: '20px',
      overflow: 'hidden',
      border: `0.5px solid ${C.faint}`,
    }}>
      {/* Gradient header */}
      <div style={{
        background: `linear-gradient(135deg, ${data.gradientFrom} 0%, ${data.gradientTo} 100%)`,
        padding: '14px 16px 16px',
        position: 'relative',
        minHeight: '90px',
      }}>
        {/* Tag */}
        <span style={{
          fontFamily: dmSans, fontSize: '9px', fontWeight: 600,
          color: C.goldLight, letterSpacing: '0.08em', textTransform: 'uppercase',
          background: 'rgba(184,148,74,0.18)', borderRadius: '999px',
          padding: '3px 8px', border: `0.5px solid rgba(212,170,106,0.3)`,
        }}>
          {data.tag}
        </span>
        {/* Title */}
        <h3 style={{
          fontFamily: playfair, fontSize: '15px', fontWeight: 600,
          color: '#FAF7F2', lineHeight: 1.35, marginTop: '8px',
        }}>
          {data.title}
        </h3>
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', right: '-16px', bottom: '-16px',
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
      </div>

      {/* Body */}
      <div style={{ background: C.parchment, padding: '12px 16px 10px' }}>
        <p style={{
          fontFamily: dmSans, fontSize: '11.5px', color: C.muted,
          lineHeight: 1.55, marginBottom: '12px',
        }}>
          {data.excerpt}
        </p>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: data.authorColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: dmSans, fontSize: '11px', fontWeight: 600, color: '#fff',
            }}>
              {data.authorInitial}
            </div>
            <div>
              <p style={{ fontFamily: dmSans, fontSize: '10.5px', fontWeight: 600, color: C.charcoal }}>
                {data.author}
              </p>
              <p style={{ fontFamily: dmSans, fontSize: '9px', color: C.muted }}>
                {data.time}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={onLike} style={{ background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '3px',
              WebkitTapHighlightColor: 'transparent', padding: '2px' }}>
              <IconHeart filled={liked} />
              <span style={{ fontFamily: dmSans, fontSize: '10px', color: liked ? C.gold : C.muted }}>
                {liked ? data.likes + 1 : data.likes}
              </span>
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '3px',
              WebkitTapHighlightColor: 'transparent', padding: '2px' }}>
              <IconMessage />
              <span style={{ fontFamily: dmSans, fontSize: '10px', color: C.muted }}>
                {data.comments}
              </span>
            </button>
            <button onClick={onSave} style={{ background: 'none', border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', padding: '2px' }}>
              <IconBookmark filled={saved} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfographicCard({ data }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      margin: '0 16px 14px',
      borderRadius: '20px',
      background: C.charcoal,
      padding: '16px',
      border: `0.5px solid rgba(184,148,74,0.20)`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <span style={{
            fontFamily: dmSans, fontSize: '9px', fontWeight: 600,
            color: C.goldLight, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            UNESCO Mirası · {data.year}
          </span>
          <h3 style={{
            fontFamily: playfair, fontSize: '14px', fontWeight: 600,
            color: C.parchment, marginTop: '4px', lineHeight: 1.3,
          }}>
            {data.name}
          </h3>
          <p style={{ fontFamily: dmSans, fontSize: '10px', color: 'rgba(250,247,242,0.45)', marginTop: '2px' }}>
            📍 {data.location}
          </p>
        </div>
        {/* Circular progress */}
        <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(250,247,242,0.08)" strokeWidth="3" />
            <circle cx="22" cy="22" r="18" fill="none" stroke={data.color} strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - data.progress / 100)}`}
              strokeLinecap="round" transform="rotate(-90 22 22)"
              style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            fontFamily: dmSans, fontSize: '10px', fontWeight: 700, color: data.color,
          }}>
            {data.progress}%
          </span>
        </div>
      </div>

      {/* Progress bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.items.map((item, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: dmSans, fontSize: '10px', color: 'rgba(250,247,242,0.6)' }}>
                {item.label}
              </span>
              <span style={{ fontFamily: dmSans, fontSize: '10px', fontWeight: 600, color: data.color }}>
                {item.value}%
              </span>
            </div>
            <div style={{
              height: '4px', borderRadius: '999px',
              background: 'rgba(250,247,242,0.08)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                width: `${item.value}%`,
                background: `linear-gradient(90deg, ${data.color}99, ${data.color})`,
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Expand toggle */}
      <button onClick={() => setExpanded(!expanded)}
        style={{
          marginTop: '12px', width: '100%', textAlign: 'center',
          fontFamily: dmSans, fontSize: '10px', fontWeight: 500,
          color: C.goldLight, background: 'none', border: 'none', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
        {expanded ? '▲ Daha az göster' : '▼ Detayları gör'}
      </button>

      {expanded && (
        <div style={{
          marginTop: '10px', padding: '10px', borderRadius: '12px',
          background: 'rgba(250,247,242,0.05)',
          borderTop: `0.5px solid rgba(184,148,74,0.2)`,
        }}>
          <p style={{ fontFamily: dmSans, fontSize: '10.5px', color: 'rgba(250,247,242,0.55)', lineHeight: 1.5 }}>
            {data.name}, Türkiye'nin dünya mirasına katkısının en önemli örneklerinden biridir.
            Süregelen araştırmalar ve koruma projeleri sayesinde gelecek nesillere aktarılmaktadır.
          </p>
        </div>
      )}
    </div>
  );
}

function PullQuoteCard({ data }) {
  return (
    <div style={{
      margin: '0 16px 14px',
      borderRadius: '20px',
      background: C.parchment,
      border: `0.5px solid ${C.faint}`,
      overflow: 'hidden',
      display: 'flex',
    }}>
      {/* Gold left border */}
      <div style={{
        width: '3px', flexShrink: 0,
        background: `linear-gradient(180deg, ${C.goldLight} 0%, ${C.gold} 100%)`,
      }} />
      <div style={{ padding: '14px 14px 14px 12px' }}>
        {/* Quote mark */}
        <div style={{
          fontFamily: playfair, fontSize: '36px', lineHeight: 0.8,
          color: C.gold, opacity: 0.35, marginBottom: '6px',
        }}>
          "
        </div>
        <p style={{
          fontFamily: playfair, fontSize: '12.5px', fontStyle: 'italic',
          color: C.charcoal, lineHeight: 1.6, marginBottom: '12px',
        }}>
          {data.text}
        </p>
        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: data.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: dmSans, fontSize: '12px', fontWeight: 600, color: '#fff',
          }}>
            {data.initial}
          </div>
          <div>
            <p style={{ fontFamily: dmSans, fontSize: '11px', fontWeight: 600, color: C.charcoal }}>
              {data.author}
            </p>
            <p style={{ fontFamily: dmSans, fontSize: '9.5px', color: C.muted }}>
              {data.role}
            </p>
          </div>
          <button style={{
            marginLeft: 'auto',
            fontFamily: dmSans, fontSize: '10px', fontWeight: 600,
            color: C.gold, background: 'none',
            border: `0.5px solid ${C.gold}`, borderRadius: '999px',
            padding: '4px 10px', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            Paylaş
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────── */
export default function HomeScreen() {
  const [seenStories, setSeenStories] = useState({});
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [likedPosts, setLikedPosts] = useState({});
  const [savedPosts, setSavedPosts]  = useState({});

  const toggleSeen  = (id) => setSeenStories(p => ({ ...p, [id]: true }));
  const toggleLike  = (id) => setLikedPosts(p  => ({ ...p, [id]: !p[id] }));
  const toggleSave  = (id) => setSavedPosts(p  => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── App Header ──────────────────────────────── */}
      <div style={{
        padding: '10px 16px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `0.5px solid ${C.faint}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontFamily: dmSans, fontSize: '10px', color: C.muted }}>
            Hoş geldin 👋
          </p>
          <h1 style={{ fontFamily: playfair, fontSize: '17px', fontWeight: 600, color: C.charcoal, lineHeight: 1.2 }}>
            Kültür Mirası
          </h1>
        </div>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: dmSans, fontSize: '13px', fontWeight: 700, color: '#fff',
          border: `0.5px solid rgba(184,148,74,0.3)`,
        }}>
          K
        </div>
      </div>

      {/* ── Scrollable feed ─────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        className="scrollbar-hide">

        {/* Stories */}
        <div style={{ paddingTop: '12px' }}>
          <StoriesRow seen={seenStories} onToggle={toggleSeen} />
        </div>

        {/* Category pills */}
        <CategoryPills active={activeCategory} onSelect={setActiveCategory} />

        {/* Feed cards */}
        {FEED.map((item, index) => {
          if (item.type === 'editorial') {
            const data = ARTICLES[(item.id - 1) % ARTICLES.length];
            return (
              <EditorialCard key={`ed-${index}`} data={data}
                liked={!!likedPosts[`ed-${data.id}`]}
                saved={!!savedPosts[`ed-${data.id}`]}
                onLike={() => toggleLike(`ed-${data.id}`)}
                onSave={() => toggleSave(`ed-${data.id}`)} />
            );
          }
          if (item.type === 'infographic') {
            const data = UNESCO_SITES[(item.id - 1) % UNESCO_SITES.length];
            return <InfographicCard key={`inf-${index}`} data={data} />;
          }
          if (item.type === 'quote') {
            const data = QUOTES[(item.id - 1) % QUOTES.length];
            return <PullQuoteCard key={`q-${index}`} data={data} />;
          }
          return null;
        })}

        {/* Bottom padding */}
        <div style={{ height: '8px' }} />
      </div>
    </div>
  );
}
