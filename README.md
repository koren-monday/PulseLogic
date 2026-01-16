# PulseLogic

AI-powered Garmin health insights with subscription-based monetization.

## Features

- **Garmin Connect Integration**: Securely authenticate and fetch health metrics (sleep, stress, body battery, activities, heart rate)
- **AI-Powered Analysis**: Get personalized insights using Google Gemini models
- **Subscription Tiers**: Free tier with limited usage, Pro tier with full access
- **Firebase Auth**: Silent authentication layer for user identity
- **Cloud Sync**: Reports, actions, and settings sync across devices

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Auth | Firebase Auth (custom tokens) |
| Database | Firebase Firestore |
| APIs | garmin-connect, Google AI SDK |
| Package Manager | Yarn (with workspaces) |

## Prerequisites

- Node.js 20+
- Yarn 1.22+
- A Garmin Connect account
- Firebase project (for auth + database)

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd PulseLogic

# Install all dependencies
yarn
```

### 2. Configure Environment

**Server** (`server/.env`):
```env
PORT=3002
NODE_ENV=development

# Firebase (required for cloud features)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # JSON string
# OR place firebase-service-account.json in server/
```

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:3002/api

# Firebase Client (required for persistent auth)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 3. Run the Application

```bash
# Start both frontend and backend
yarn dev
```

- **Backend**: http://localhost:3002
- **Frontend**: http://localhost:5173

---

## Project Structure

```
PulseLogic/
├── package.json                 # Monorepo root
├── server/                      # Express Backend
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── garmin.routes.ts     # Auth + Firebase tokens
│   │   │   ├── analyze.routes.ts    # AI analysis
│   │   │   └── subscription.routes.ts
│   │   └── services/
│   │       ├── garmin.service.ts
│   │       ├── firestore.service.ts
│   │       └── usage.service.ts
│   └── .env
│
├── client/                      # React Frontend
│   ├── src/
│   │   ├── App.tsx              # Main app
│   │   ├── config/
│   │   │   └── firebase.ts      # Firebase client init
│   │   ├── contexts/
│   │   │   └── SubscriptionContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   └── Paywall.tsx      # Subscription UI
│   │   └── pages/
│   │       ├── LoginPage.tsx    # Garmin + Firebase auth
│   │       ├── DataStep.tsx
│   │       └── AnalysisStep.tsx
│   └── .env
```

---

## Subscription Tiers

| Feature | Free | Pro |
|---------|------|-----|
| Reports per week | 1 | Unlimited* |
| Chat follow-ups | 1 per report | Unlimited* |
| Daily snapshots | - | 1/day |
| Data range | 30 days | 360 days |
| AI model | Basic | Advanced |
| Report history | Latest only | Full history |

*Pro tier has 10 LLM calls per day limit

---

## API Reference

### Garmin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/garmin/login` | Authenticate (returns `firebaseToken`) |
| POST | `/api/garmin/mfa` | Submit MFA code |
| POST | `/api/garmin/restore` | Restore session from tokens |
| POST | `/api/garmin/logout` | Clear session |
| POST | `/api/garmin/data` | Fetch health metrics |

### Subscription Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscription/tier` | Get user tier + limits |
| POST | `/api/subscription/check-report` | Check report limit |
| POST | `/api/subscription/check-chat` | Check chat limit |

---

## Available Scripts

### Root Level

| Command | Description |
|---------|-------------|
| `yarn dev` | Start server + client |
| `yarn build` | Build both for production |
| `yarn build:server` | Build server only |
| `yarn build:client` | Build client only |

### Client Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start Vite dev server |
| `yarn build` | Build for production |

---

## Architecture

### Authentication Flow

```
User                    Client                  Server              Firebase
  │                        │                       │                    │
  │ Enter Garmin creds     │                       │                    │
  │───────────────────────>│                       │                    │
  │                        │ POST /garmin/login    │                    │
  │                        │──────────────────────>│                    │
  │                        │                       │ createCustomToken  │
  │                        │                       │───────────────────>│
  │                        │   { firebaseToken }   │<───────────────────│
  │                        │<──────────────────────│                    │
  │                        │ signInWithCustomToken │                    │
  │                        │───────────────────────────────────────────>│
  │     Logged in          │<───────────────────────────────────────────│
  │<───────────────────────│                       │                    │
```

---

## Troubleshooting

### "Garmin login failed"
- Verify credentials are correct
- MFA is supported - enter code when prompted
- Try logging into connect.garmin.com first

### Firebase auth issues
- Check Firebase config in `client/.env`
- Ensure Firebase project has Authentication enabled
- Server needs valid service account credentials

---

## Deployment

### Server (Render)

Uses `render.yaml` for configuration:
- Backend: Docker-based web service
- Frontend: Static site serving `client/dist`

Set environment variables:
- `NODE_ENV=production`
- `FIREBASE_SERVICE_ACCOUNT=<json string>`
- `ALLOWED_ORIGIN=https://your-domain.com`

---

## Privacy & Account Deletion

**Privacy Policy:** https://garmin-insights-web.onrender.com/privacy

Users can delete their account and all associated data:

- **In-app**: Settings > Delete Account
- **Web**: https://garmin-insights-web.onrender.com/delete-account

This permanently deletes:
- User profile and settings
- All health reports and analysis history
- Saved actions and tracking data
- Personal statistics and trends
- Firebase authentication record
- Stored Garmin tokens

---

## License

MIT
