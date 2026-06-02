/**
 * Firebase configuration for Kültür Koruma Akademisi
 *
 * HOW TO SET UP:
 * 1. Go to https://console.firebase.google.com → Create project "kulur-koruma-akademisi"
 * 2. Add a Web app → copy the firebaseConfig object below
 * 3. Enable Firestore Database (production mode → add rules below)
 * 4. Replace the placeholder values with your real config
 * 5. Create a .env.local in /frontend and set REACT_APP_* variables (optional)
 *
 * FIRESTORE SECURITY RULES (paste in Firebase console):
 * ──────────────────────────────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /users/{userId} {
 *       allow read: if true;           // leaderboard is public
 *       allow write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     match /leaderboard/{entry} {
 *       allow read: if true;
 *       allow write: if request.auth != null;
 *     }
 *   }
 * }
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore }            from 'firebase/firestore';
import { getAuth }                 from 'firebase/auth';

// ── Replace with your real Firebase project config ─────────────────
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "AIzaSyCuI9QLVOv5JF9BelfSBh9eWBkEBIoFZ3I",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "kultur-koruma-akademisi.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "kultur-koruma-akademisi",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "kultur-koruma-akademisi.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID|| "45076729268",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "1:45076729268:web:3b873a1b38a21539a3f6e1",
  measurementId:     process.env.REACT_APP_FIREBASE_MEASUREMENT_ID     || "G-09G085EQR3",
};

// Prevent duplicate initialisation in dev (React StrictMode double-renders)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db   = getFirestore(app);
export const auth = getAuth(app);
export default app;
