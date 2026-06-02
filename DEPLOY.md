# Kültür Koruma Akademisi — Deployment Guide

## 1. Backend → Render

### One-time setup
1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service** → connect the repo.
3. Set these values in the Render dashboard:

| Field | Value |
|---|---|
| **Root directory** | `backend` |
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `gunicorn kka_server:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT` |
| **Environment** | Python 3 |

4. Under **Environment Variables** add:

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | *(your Gemini key — never commit this)* |

5. Click **Deploy**. The health check endpoint is `/api/health`.

### Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Render health check |
| POST | `/api/ai-assistant` | Gemini chat |
| GET | `/api/leaderboard` | Top users (seed data) |
| POST | `/api/leaderboard/score` | Submit score |

---

## 2. Firebase → Firestore

### One-time setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com).
2. Create project → name it `kulur-koruma-akademisi`.
3. **Firestore Database** → Create database → Start in production mode.
4. **Project Settings → Your apps → Add app (Web)** → copy the `firebaseConfig`.
5. Paste values into `frontend/.env.local` (see template).

### Security rules (paste in Firestore → Rules tab)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /leaderboard/{entry} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Collections created automatically
| Collection | Document ID | Key fields |
|---|---|---|
| `users` | `{uid}` | `xp`, `streak`, `badges`, `lastActivity` |
| `leaderboard` | `{uid}` | `xp`, `streak`, `displayName`, `avatar`, `color` |

---

## 3. Frontend → Connect everything

In `frontend/.env.local`:
```
REACT_APP_API_URL=https://YOUR-RENDER-APP.onrender.com
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

Then run:
```bash
cd frontend
npm install      # installs firebase SDK
npm run build    # production build
```

Deploy the `build/` folder to **Vercel**, **Netlify**, or **Firebase Hosting**.

---

## 4. Local development

```bash
# Terminal 1 — backend
cd backend
pip install -r requirements.txt
uvicorn kka_server:app --reload --port 8001

# Terminal 2 — frontend
cd frontend
npm install
npm start        # proxies /api/* to localhost:8001
```
