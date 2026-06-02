import React, { useState, useEffect, useRef } from 'react';
import { useXP } from '../contexts/XPContext';
import { subscribeLeaderboard, DEMO_UID } from '../firebase/gamification';

/* ─── Tokens ──────────────────────────────────────────── */
const C = {
  parchment:  '#FAF7F2',
  charcoal:   '#1C1410',
  gold:       '#B8944A',
  goldLight:  '#D4AA6A',
  terracotta: '#C0533A',
  muted:      'rgba(28,20,16,0.45)',
  faint:      'rgba(28,20,16,0.08)',
  surface:    '#F3EFE8',
  silver:     '#A8A8A8',
  bronze:     '#CD7F32',
};
const dm = "'DM Sans', sans-serif";
const pf = "'Playfair Display', serif";

const LEVEL_TITLES = ['Meraklı','Araştırmacı','Tarihçi','Miras Koruyucu','Kültür Elçisi','Akademisyen'];
const getLevelTitle = (lv) => LEVEL_TITLES[Math.min(lv - 1, LEVEL_TITLES.length - 1)];

const SETTINGS = [
  { icon: '👤', label: 'Hesap Bilgileri',  arrow: true  },
  { icon: '🔔', label: 'Bildirimler',      arrow: true  },
  { icon: '🌙', label: 'Görünüm',          arrow: true  },
  { icon: '🔒', label: 'Gizlilik',         arrow: true  },
  { icon: '❓', label: 'Yardım & Destek', arrow: true  },
  { icon: '🚪', label: 'Çıkış Yap',       arrow: false, danger: true },
];

function medalColor(r) { return r===1 ? C.gold : r===2 ? C.silver : r===3 ? C.bronze : C.muted; }
function medalEmoji(r) { return r===1 ? '🥇'  : r===2 ? '🥈'    : r===3 ? '🥉'    : null; }

/* ─── Leaderboard row ─────────────────────────────────── */
function LeaderRow({ user, isMe }) {
  const mColor = medalColor(user.rank);
  const medal  = medalEmoji(user.rank);
  const isTop3 = user.rank <= 3;

  return (
    <div style={{
      borderRadius: '14px',
      background: isMe
        ? 'linear-gradient(90deg,rgba(184,148,74,0.12),rgba(184,148,74,0.06))'
        : isTop3 ? C.surface : C.parchment,
      border: isMe
        ? '0.5px solid rgba(184,148,74,0.35)'
        : isTop3 ? `0.5px solid ${mColor}30` : `0.5px solid ${C.faint}`,
      padding: '9px 11px',
      display: 'flex', alignItems: 'center', gap: '9px',
    }}>
      {/* Rank badge */}
      <div style={{
        width:'24px', height:'24px', borderRadius:'50%', flexShrink:0,
        background: isTop3 ? `${mColor}20` : C.faint,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:dm, fontSize: isTop3 ? '13px' : '10px',
        fontWeight:700, color: isTop3 ? mColor : C.muted,
      }}>
        {medal || user.rank}
      </div>

      {/* Avatar */}
      <div style={{
        width:'30px', height:'30px', borderRadius:'50%', flexShrink:0,
        background: user.color || '#B8944A',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:dm, fontSize:'13px', fontWeight:700, color:'#fff',
        border: isMe ? `2px solid ${C.gold}` : 'none',
      }}>
        {user.avatar}
      </div>

      {/* Name + streak */}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontFamily:dm, fontSize:'11px', fontWeight: isMe?700:500, color: isMe ? C.gold : C.charcoal }}>
          {user.displayName} {isMe && '(Sen)'}
        </p>
        <p style={{ fontFamily:dm, fontSize:'9px', color:C.muted }}>
          🔥 {user.streak ?? 0} gün seri
        </p>
      </div>

      {/* XP */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ fontFamily:dm, fontSize:'12px', fontWeight:700, color: isTop3 ? mColor : C.charcoal }}>
          {(user.xp||0) >= 1000 ? `${((user.xp||0)/1000).toFixed(1)}k` : (user.xp||0)}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────── */
export default function ProfileScreen() {
  const { xp, level, levelPct, streak, badgeList, uid } = useXP();
  const levelTitle  = getLevelTitle(level);
  const [activeBadge, setActiveBadge] = useState(null);

  /* ── Live leaderboard from Firebase ───────────────────── */
  const [board,        setBoard]        = useState([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const unsubRef = useRef(null);

  useEffect(() => {
    setBoardLoading(true);
    unsubRef.current = subscribeLeaderboard((entries) => {
      setBoard(entries);
      setBoardLoading(false);
    }, 10);
    return () => unsubRef.current?.();
  }, []);

  /* Merge current user's live XP into the board */
  const mergedBoard = (() => {
    const myEntry = { uid, displayName:'Sen', avatar:'K', color:C.gold, xp, streak, rank:0 };
    const others  = board.filter(u => u.uid !== uid);
    const all     = [myEntry, ...others].sort((a,b) => b.xp - a.xp).map((u,i) => ({...u, rank:i+1}));
    return all;
  })();

  const savedCount  = 8;
  const badgeCount  = (badgeList || []).filter(b => b.earned).length;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }} className="scrollbar-hide">

        {/* ── Hero ─────────────────────────────────────── */}
        <div style={{
          background:`linear-gradient(150deg,#3A1F0D 0%,${C.charcoal} 100%)`,
          padding:'20px 16px 22px', position:'relative', overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:'-20px',right:'-20px',width:'100px',height:'100px',borderRadius:'50%',background:'radial-gradient(circle,rgba(184,148,74,0.18) 0%,transparent 70%)',pointerEvents:'none'}} />
          <div style={{position:'absolute',bottom:'-10px',left:'-10px',width:'70px',height:'70px',borderRadius:'50%',background:'radial-gradient(circle,rgba(192,83,58,0.15) 0%,transparent 70%)',pointerEvents:'none'}} />

          <div style={{display:'flex',alignItems:'flex-end',gap:'14px'}}>
            <div style={{
              width:'64px',height:'64px',borderRadius:'50%',flexShrink:0,
              background:`linear-gradient(135deg,${C.gold} 0%,${C.terracotta} 100%)`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:pf,fontSize:'26px',fontWeight:700,color:'#fff',
              border:'2px solid rgba(184,148,74,0.5)',
              boxShadow:'0 4px 20px rgba(184,148,74,0.3)',
            }}>K</div>
            <div style={{flex:1}}>
              <h1 style={{fontFamily:pf,fontSize:'18px',fontWeight:700,color:C.parchment,lineHeight:1.2}}>
                Kültür Akademisi
              </h1>
              <p style={{fontFamily:dm,fontSize:'10.5px',color:'rgba(250,247,242,0.55)',marginTop:'3px'}}>
                Miras Koruma · 3. Sınıf
              </p>
              <div style={{
                display:'inline-flex',alignItems:'center',gap:'4px',marginTop:'6px',
                background:'rgba(184,148,74,0.15)',borderRadius:'999px',padding:'3px 9px',
                border:'0.5px solid rgba(184,148,74,0.3)',
              }}>
                <span style={{fontSize:'10px'}}>✨</span>
                <span style={{fontFamily:dm,fontSize:'10px',fontWeight:700,color:C.goldLight}}>
                  Seviye {level} — {levelTitle}
                </span>
              </div>
            </div>
          </div>

          {/* XP progress bar */}
          <div style={{marginTop:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
              <span style={{fontFamily:dm,fontSize:'9px',color:'rgba(250,247,242,0.45)'}}>Seviye {level} → {level+1}</span>
              <span style={{fontFamily:dm,fontSize:'9px',fontWeight:600,color:C.goldLight}}>{levelPct}%</span>
            </div>
            <div style={{height:'6px',borderRadius:'999px',background:'rgba(250,247,242,0.1)',overflow:'hidden'}}>
              <div style={{
                height:'100%',borderRadius:'999px',
                width:`${levelPct}%`,
                background:`linear-gradient(90deg,${C.gold},${C.goldLight})`,
                transition:'width 0.8s cubic-bezier(.4,0,.2,1)',
              }}/>
            </div>
          </div>
        </div>

        {/* ── 4-col stats ──────────────────────────────── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:C.faint,borderBottom:`0.5px solid ${C.faint}`}}>
          {[
            {value:xp,          label:'XP Puan',   emoji:'⚡'},
            {value:streak,      label:'Gün Serisi', emoji:'🔥'},
            {value:savedCount,  label:'Kaydedilen', emoji:'🔖'},
            {value:badgeCount,  label:'Rozet',      emoji:'🏅'},
          ].map((stat,i) => (
            <div key={i} style={{background:C.parchment,padding:'10px 4px',display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
              <span style={{fontSize:'14px'}}>{stat.emoji}</span>
              <span style={{fontFamily:dm,fontSize:'13px',fontWeight:800,color:C.charcoal}}>
                {stat.value>=1000?`${(stat.value/1000).toFixed(1)}k`:stat.value}
              </span>
              <span style={{fontFamily:dm,fontSize:'8.5px',color:C.muted,textAlign:'center',lineHeight:1.2}}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Leaderboard ───────────────────────────────── */}
        <div style={{padding:'12px 14px 0'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
            <h2 style={{fontFamily:pf,fontSize:'14px',fontWeight:700,color:C.charcoal}}>
              Liderlik Tablosu
            </h2>
            <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
              {/* Live indicator */}
              <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#34C759',animation:'pulse 2s infinite'}}/>
              <span style={{fontFamily:dm,fontSize:'9px',color:C.muted}}>Canlı</span>
            </div>
          </div>

          {boardLoading ? (
            <div style={{display:'flex',justifyContent:'center',padding:'20px 0'}}>
              <div style={{fontFamily:dm,fontSize:'11px',color:C.muted}}>Yükleniyor…</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
              {mergedBoard.slice(0,6).map((user) => (
                <LeaderRow key={user.uid} user={user} isMe={user.uid === uid} />
              ))}
            </div>
          )}
        </div>

        {/* ── Badges ────────────────────────────────────── */}
        <div style={{padding:'14px 14px 0'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
            <h2 style={{fontFamily:pf,fontSize:'14px',fontWeight:700,color:C.charcoal}}>Rozetlerim</h2>
            <span style={{fontFamily:dm,fontSize:'9px',color:C.muted}}>
              {badgeCount}/{(badgeList||[]).length} kazanıldı
            </span>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
            {(badgeList||[]).map(badge => (
              <button key={badge.id}
                onClick={() => setActiveBadge(activeBadge===badge.id ? null : badge.id)}
                style={{
                  borderRadius:'14px',padding:'10px 8px',
                  background: badge.earned ? `${C.gold}10` : C.parchment,
                  border: badge.earned ? '0.5px solid rgba(184,148,74,0.3)' : '0.5px dashed rgba(28,20,16,0.2)',
                  cursor:'pointer',textAlign:'center',
                  WebkitTapHighlightColor:'transparent',
                  opacity: badge.earned ? 1 : 0.38,
                  transition:'all 0.18s ease',
                  transform: activeBadge===badge.id ? 'scale(0.95)' : 'scale(1)',
                }}>
                <div style={{
                  width:'36px',height:'36px',borderRadius:'50%',margin:'0 auto 6px',
                  background: badge.earned ? `linear-gradient(135deg,${C.gold},${C.goldLight})` : 'rgba(28,20,16,0.06)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',
                  boxShadow: badge.earned ? `0 2px 10px ${C.gold}40` : 'none',
                }}>
                  {badge.emoji}
                </div>
                <p style={{fontFamily:dm,fontSize:'9px',fontWeight:600,color:C.charcoal,lineHeight:1.2}}>
                  {badge.label}
                </p>
                {activeBadge===badge.id && (
                  <p style={{fontFamily:dm,fontSize:'8px',color:C.muted,marginTop:'3px',lineHeight:1.3}}>
                    {badge.desc}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Settings ──────────────────────────────────── */}
        <div style={{padding:'14px 14px 0'}}>
          <h2 style={{fontFamily:pf,fontSize:'14px',fontWeight:700,color:C.charcoal,marginBottom:'8px'}}>
            Hesap Ayarları
          </h2>
          <div style={{borderRadius:'16px',overflow:'hidden',border:`0.5px solid ${C.faint}`}}>
            {SETTINGS.map((item,i) => (
              <div key={i}>
                <button
                  style={{width:'100%',background:C.parchment,border:'none',padding:'11px 14px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',WebkitTapHighlightColor:'transparent',transition:'background 0.15s ease'}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface}
                  onMouseLeave={e=>e.currentTarget.style.background=C.parchment}
                  onTouchStart={e=>e.currentTarget.style.background=C.surface}
                  onTouchEnd={e=>e.currentTarget.style.background=C.parchment}
                >
                  <span style={{fontSize:'16px',flexShrink:0}}>{item.icon}</span>
                  <span style={{fontFamily:dm,fontSize:'12px',fontWeight:500,flex:1,textAlign:'left',color:item.danger?'#C0533A':C.charcoal}}>
                    {item.label}
                  </span>
                  {item.arrow && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6"/>
                    </svg>
                  )}
                </button>
                {i < SETTINGS.length-1 && <div style={{height:'0.5px',background:C.faint,marginLeft:'44px'}}/>}
              </div>
            ))}
          </div>
        </div>

        <div style={{height:'16px'}}/>
      </div>
    </div>
  );
}
