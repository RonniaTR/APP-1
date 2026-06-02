/**
 * Firebase Gamification Layer
 * ────────────────────────────
 * All Firestore read/write operations for:
 *   - User XP, Level, Streak
 *   - Badges (Rozetler)
 *   - Leaderboard (Liderlik Tablosu) — realtime listener
 *
 * Collection layout:
 *   /users/{uid}
 *     xp          : number
 *     streak      : number
 *     lastActivity: string  (ISO date "2025-06-02")
 *     badges      : string[]
 *     displayName : string
 *     avatar      : string  (initial letter)
 *     color       : string  (hex)
 *     updatedAt   : timestamp
 *
 *   /leaderboard/{uid}   ← denormalised copy for fast sorted reads
 *     uid, displayName, avatar, color, xp, streak, updatedAt
 */

import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, orderBy, limit,
  onSnapshot, serverTimestamp,
  increment, arrayUnion,
} from 'firebase/firestore';
import { db } from './config';

/* ── Constants ───────────────────────────────────────────────────── */
export const DEMO_UID      = 'local_demo_user';
export const XP_PER_LEVEL  = 500;

const BADGE_RULES = {
  streak_7:   { id: 'streak_7',   emoji: '🔥', label: '7 Gün Seri',  check: (u) => u.streak >= 7  },
  quiz_first: { id: 'quiz_first', emoji: '🏆', label: 'İlk Quiz',    check: (u) => (u.quizCount||0) >= 1 },
  lessons_10: { id: 'lessons_10', emoji: '📚', label: '10 Ders',      check: (u) => (u.lessonsCompleted||0) >= 10 },
  perfect:    { id: 'perfect',    emoji: '⭐', label: 'Mükemmel',     check: (u) => (u.perfectQuiz||0) >= 1 },
  explorer:   { id: 'explorer',   emoji: '🌍', label: 'Kaşif',        check: (u) => (u.categoriesVisited||0) >= 5 },
  graduate:   { id: 'graduate',   emoji: '🎓', label: 'Mezun',        check: (u) => (u.coursesCompleted||0) >= 1 },
};
export const ALL_BADGE_IDS = Object.keys(BADGE_RULES);

/* ── Firestore is optional — graceful fallback ───────────────────── */
function isFirebaseReady() {
  try {
    // If projectId is a placeholder, skip Firestore calls
    return db && db.app.options.projectId !== 'REPLACE_ME';
  } catch { return false; }
}

/* ── User profile ─────────────────────────────────────────────────── */

/**
 * Load user data from Firestore.
 * Returns null if Firebase is not configured or user doesn't exist.
 */
export async function loadUser(uid = DEMO_UID) {
  if (!isFirebaseReady()) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('[KKA Firebase] loadUser error:', e.message);
    return null;
  }
}

/**
 * Create or overwrite user document with sensible defaults.
 */
export async function initUser(uid = DEMO_UID, profile = {}) {
  if (!isFirebaseReady()) return;
  const defaults = {
    uid,
    displayName: profile.displayName || 'Öğrenci',
    avatar:      profile.avatar || 'Ö',
    color:       profile.color  || '#B8944A',
    xp:          320,
    streak:      7,
    lastActivity: new Date().toISOString().slice(0, 10),
    badges:      ['streak_7', 'quiz_first', 'lessons_10'],
    quizCount:            1,
    lessonsCompleted:     10,
    perfectQuiz:          0,
    categoriesVisited:    0,
    coursesCompleted:     0,
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'users', uid), { ...defaults, ...profile }, { merge: true });
    await _syncLeaderboard(uid, { ...defaults, ...profile });
  } catch (e) {
    console.warn('[KKA Firebase] initUser error:', e.message);
  }
}

/* ── XP ──────────────────────────────────────────────────────────── */

export async function addXPToFirebase(uid = DEMO_UID, amount) {
  if (!isFirebaseReady() || amount <= 0) return;
  try {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, {
      xp: increment(amount),
      updatedAt: serverTimestamp(),
    });
    // Re-read to sync leaderboard with latest xp
    const snap = await getDoc(ref);
    if (snap.exists()) await _syncLeaderboard(uid, snap.data());
  } catch (e) {
    console.warn('[KKA Firebase] addXP error:', e.message);
  }
}

/* ── Streak ──────────────────────────────────────────────────────── */

/**
 * Call on app open. Increments streak if last activity was yesterday,
 * resets to 1 if a day was skipped, keeps as-is if already logged today.
 */
export async function checkAndUpdateStreak(uid = DEMO_UID) {
  if (!isFirebaseReady()) return null;
  try {
    const ref  = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data      = snap.data();
    const today     = new Date().toISOString().slice(0, 10);
    const last      = data.lastActivity || '';
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    let newStreak = data.streak || 0;
    if (last === today)      { /* already logged today */            }
    else if (last === yesterday) { newStreak += 1;                   }
    else                         { newStreak  = 1;                   }

    await updateDoc(ref, {
      streak: newStreak,
      lastActivity: today,
      updatedAt: serverTimestamp(),
    });
    return newStreak;
  } catch (e) {
    console.warn('[KKA Firebase] streak error:', e.message);
    return null;
  }
}

/* ── Badges ──────────────────────────────────────────────────────── */

export async function evaluateAndAwardBadges(uid = DEMO_UID, userData) {
  if (!isFirebaseReady()) return [];
  try {
    const newBadges = [];
    const earned    = userData.badges || [];
    for (const [id, rule] of Object.entries(BADGE_RULES)) {
      if (!earned.includes(id) && rule.check(userData)) {
        newBadges.push(id);
      }
    }
    if (newBadges.length > 0) {
      await updateDoc(doc(db, 'users', uid), {
        badges: arrayUnion(...newBadges),
        updatedAt: serverTimestamp(),
      });
    }
    return newBadges;
  } catch (e) {
    console.warn('[KKA Firebase] badges error:', e.message);
    return [];
  }
}

/* ── Leaderboard ─────────────────────────────────────────────────── */

async function _syncLeaderboard(uid, userData) {
  if (!isFirebaseReady()) return;
  try {
    await setDoc(doc(db, 'leaderboard', uid), {
      uid,
      displayName: userData.displayName || 'Öğrenci',
      avatar:      userData.avatar      || 'Ö',
      color:       userData.color       || '#B8944A',
      xp:          userData.xp          || 0,
      streak:      userData.streak      || 0,
      updatedAt:   serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('[KKA Firebase] leaderboard sync error:', e.message);
  }
}

/**
 * Subscribe to real-time leaderboard updates.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param {(entries: Array) => void} callback
 * @param {number} topN  number of entries to fetch (default 10)
 */
export function subscribeLeaderboard(callback, topN = 10) {
  if (!isFirebaseReady()) {
    // Return mock data immediately + no-op unsubscribe
    callback(MOCK_LEADERBOARD);
    return () => {};
  }
  const q = query(
    collection(db, 'leaderboard'),
    orderBy('xp', 'desc'),
    limit(topN),
  );
  return onSnapshot(q,
    (snap) => {
      const entries = snap.docs.map((d, i) => ({ ...d.data(), rank: i + 1 }));
      callback(entries);
    },
    (err) => {
      console.warn('[KKA Firebase] leaderboard listener error:', err.message);
      callback(MOCK_LEADERBOARD);
    },
  );
}

/* ── Mock fallback data (shown when Firebase is not yet configured) ─ */
export const MOCK_LEADERBOARD = [
  { uid: 'u1', displayName: 'Zeynep A.', avatar: 'Z', color: '#4A8C6A', xp: 2840, streak: 31, rank: 1 },
  { uid: 'u2', displayName: 'Mehmet K.', avatar: 'M', color: '#6A4A8C', xp: 2610, streak: 18, rank: 2 },
  { uid: 'u3', displayName: 'Elif Ş.',   avatar: 'E', color: '#C45E8A', xp: 2380, streak: 22, rank: 3 },
  { uid: 'u4', displayName: 'Hasan Y.',  avatar: 'H', color: '#4A6A8C', xp: 1890, streak: 14, rank: 4 },
  { uid: 'u5', displayName: 'Ayşe T.',   avatar: 'A', color: '#8B6F4A', xp: 1740, streak:  9, rank: 5 },
];

export const MOCK_USER = {
  uid:         DEMO_UID,
  displayName: 'Sen',
  avatar:      'K',
  color:       '#B8944A',
  xp:          320,
  streak:      7,
  badges:      ['streak_7', 'quiz_first', 'lessons_10'],
};
