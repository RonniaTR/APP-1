/**
 * XPContext — Global gamification state
 * ──────────────────────────────────────
 * - Loads initial XP / streak / badges from Firebase on mount
 * - Persists every addXP() call to Firestore (fire-and-forget)
 * - Falls back to local state when Firebase is not configured
 */

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import {
  loadUser, initUser, addXPToFirebase,
  checkAndUpdateStreak, evaluateAndAwardBadges,
  DEMO_UID, MOCK_USER, ALL_BADGE_IDS,
} from '../firebase/gamification';

const XPContext    = createContext(null);
export const XP_PER_LEVEL = 500;

/* ── Badge definitions (full metadata) ─────────────────────────── */
export const BADGE_META = {
  streak_7:   { emoji: '🔥', label: '7 Gün Seri',  desc: '7 gün üst üste giriş',   },
  quiz_first: { emoji: '🏆', label: 'İlk Quiz',    desc: 'İlk quiz tamamlandı',     },
  lessons_10: { emoji: '📚', label: '10 Ders',      desc: '10 ders tamamlandı',      },
  perfect:    { emoji: '⭐', label: 'Mükemmel',     desc: '5 soruyu art arda doğru', },
  explorer:   { emoji: '🌍', label: 'Kaşif',        desc: '5 farklı kategori',       },
  graduate:   { emoji: '🎓', label: 'Mezun',        desc: 'Bir kursu bitir',          },
};

export function XPProvider({ children }) {
  const [xp,      setXp]      = useState(MOCK_USER.xp);
  const [streak,  setStreak]  = useState(MOCK_USER.streak);
  const [badges,  setBadges]  = useState(MOCK_USER.badges);  // earned badge ids
  const [burst,   setBurst]   = useState(null);
  const [loading, setLoading] = useState(true);
  const uid = DEMO_UID;
  const syncTimer = useRef(null);

  /* Derived values */
  const level    = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelXP  = xp % XP_PER_LEVEL;
  const levelPct = Math.round((levelXP / XP_PER_LEVEL) * 100);

  /* ── Bootstrap: load from Firebase or fallback ────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Ensure user doc exists (idempotent)
      await initUser(uid, {
        displayName: 'Sen',
        avatar: 'K',
        color: '#B8944A',
      });
      // Update daily streak
      const newStreak = await checkAndUpdateStreak(uid);
      // Load current user data
      const userData = await loadUser(uid);

      if (!cancelled && userData) {
        setXp(userData.xp     ?? MOCK_USER.xp);
        setStreak(newStreak   ?? userData.streak ?? MOCK_USER.streak);
        setBadges(userData.badges ?? MOCK_USER.badges);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [uid]);

  /* ── addXP — local-first, then sync ───────────────────────────── */
  const addXP = useCallback((amount, label) => {
    if (amount <= 0) return;

    setXp(prev => {
      const next = prev + amount;
      // Debounced Firestore write (batch rapid quiz answers)
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        addXPToFirebase(uid, amount).catch(() => {});
      }, 800);
      return next;
    });

    setBurst({ amount, label: label || `+${amount} XP` });
    setTimeout(() => setBurst(null), 1400);
  }, [uid]);

  /* ── Badge award ────────────────────────────────────────────────── */
  const awardBadge = useCallback(async (badgeId) => {
    if (badges.includes(badgeId)) return;
    setBadges(prev => [...prev, badgeId]);
    // Persist through evaluateAndAwardBadges next cycle
    const userData = await loadUser(uid);
    if (userData) {
      await evaluateAndAwardBadges(uid, { ...userData, badges: [...badges, badgeId] });
    }
  }, [badges, uid]);

  /* ── Public badges list with earned/locked status ──────────────── */
  const badgeList = ALL_BADGE_IDS.map(id => ({
    id,
    ...BADGE_META[id],
    earned: badges.includes(id),
  }));

  return (
    <XPContext.Provider value={{
      xp, level, levelXP, levelPct,
      streak, badges, badgeList,
      burst, loading,
      addXP, awardBadge,
      uid,
    }}>
      {children}
    </XPContext.Provider>
  );
}

export function useXP() {
  const ctx = useContext(XPContext);
  if (!ctx) throw new Error('useXP must be used inside <XPProvider>');
  return ctx;
}
