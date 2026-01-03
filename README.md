# PulseLogic

AI-powered Garmin health insights with subscription-based monetization. Available as a web app and Android app.

## Features

- **Garmin Connect Integration**: Securely authenticate and fetch health metrics (sleep, stress, body battery, activities, heart rate)
- **AI-Powered Analysis**: Get personalized insights using Google Gemini models
- **Subscription Tiers**: Free tier with limited usage, Pro tier with full access
- **Cross-Platform**: Web app + Android app (via Capacitor)
- **Firebase Auth**: Silent authentication layer for user identity
- **RevenueCat Payments**: Google Play subscription management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Mobile | Capacitor 7, Android |
| Auth | Firebase Auth (custom tokens) |
| Payments | RevenueCat |
| Database | Firebase Firestore |
| APIs | garmin-connect, Google AI SDK |
| Package Manager | Yarn (with workspaces) |

## Prerequisites

- Node.js 20+
- Yarn 1.22+
- A Garmin Connect account
- Firebase project (for auth + database)
- RevenueCat account (for payments - Android only)
- Android Studio (for Android builds)

---

## Quick Start (Web)

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

# RevenueCat (for payment webhooks)
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:3002/api

# Firebase Client (optional - enables persistent auth)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id

# RevenueCat (Android only)
VITE_REVENUECAT_PUBLIC_KEY=your_public_key
```

### 3. Run the Application

```bash
# Start both frontend and backend
yarn dev
```

- **Backend**: http://localhost:3002
- **Frontend**: http://localhost:5173

---

## Android Build

### Prerequisites

1. **Android Studio** with SDK 24+ installed
2. **Java 17+** (bundled with Android Studio)
3. **Firebase project** with Android app configured
4. **Google Play Console** account (for publishing)
5. **RevenueCat** account with Android app configured

### Setup Steps

#### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create or select your project
3. Add an Android app:
   - Package name: `com.pulselogic.app`
   - Download `google-services.json`
4. Place `google-services.json` in `client/android/app/`

#### 2. RevenueCat Setup

1. Create project at [RevenueCat](https://www.revenuecat.com)
2. Add Android app with package ID: `com.pulselogic.app`
3. Connect to Google Play Console
4. Create subscription products:
   - `pulselogic_monthly` - Monthly subscription
   - `pulselogic_annual` - Annual subscription
5. Configure entitlement: `pro`
6. Set up webhook: `POST https://your-server.com/api/webhooks/revenuecat`

#### 3. Environment Variables

Update `client/.env` for Android:
```env
# Use 10.0.2.2 for Android emulator to reach localhost
VITE_API_URL=http://10.0.2.2:3002/api

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_REVENUECAT_PUBLIC_KEY=your_revenuecat_public_key
```

#### 4. Build Android App

```bash
cd client

# Build web assets
yarn build

# Sync to Android project
yarn cap:sync

# Open in Android Studio
yarn cap:open
```

#### 5. Android Studio

1. Let Gradle sync complete
2. Connect device or start emulator
3. Click **Run** to build and install

### Android Scripts

| Command | Description |
|---------|-------------|
| `yarn cap:sync` | Sync web assets to Android |
| `yarn cap:open` | Open project in Android Studio |
| `yarn build:android` | Build + sync in one command |

### Release Build

1. In Android Studio: **Build > Generate Signed Bundle / APK**
2. Create or select keystore
3. Choose **release** build variant
4. Upload to Google Play Console

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
│   │   │   ├── subscription.routes.ts
│   │   │   └── webhooks.routes.ts   # RevenueCat webhooks
│   │   └── services/
│   │       ├── garmin.service.ts
│   │       ├── firestore.service.ts
│   │       └── usage.service.ts
│   └── .env
│
├── client/                      # React Frontend
│   ├── src/
│   │   ├── App.tsx              # Main app + back button
│   │   ├── config/
│   │   │   └── firebase.ts      # Firebase client init
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── SubscriptionContext.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── purchases.ts     # RevenueCat wrapper
│   │   ├── components/
│   │   │   ├── Header.tsx       # Upgrade button
│   │   │   └── Paywall.tsx      # Subscription UI
│   │   └── pages/
│   │       ├── LoginPage.tsx    # Garmin + Firebase auth
│   │       ├── DataStep.tsx
│   │       └── AnalysisStep.tsx
│   ├── capacitor.config.ts      # Capacitor config
│   ├── android/                 # Android project
│   │   ├── app/
│   │   │   ├── src/main/
│   │   │   │   └── assets/public/   # Web assets
│   │   │   ├── build.gradle
│   │   │   └── google-services.json # Firebase config
│   │   └── build.gradle
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

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/revenuecat` | RevenueCat subscription events |

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
| `yarn cap:sync` | Sync to Android |
| `yarn cap:open` | Open in Android Studio |
| `yarn build:android` | Build + sync |

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

### Payment Flow

```
User                    Client (RevenueCat)     RevenueCat          Server
  │                        │                       │                   │
  │ Tap Subscribe          │                       │                   │
  │───────────────────────>│                       │                   │
  │                        │ purchasePackage()     │                   │
  │                        │──────────────────────>│                   │
  │    Google Play UI      │<──────────────────────│                   │
  │<───────────────────────│                       │                   │
  │ Complete purchase      │                       │                   │
  │───────────────────────>│                       │                   │
  │                        │    CustomerInfo       │                   │
  │                        │<──────────────────────│                   │
  │                        │                       │ POST /webhooks    │
  │                        │                       │──────────────────>│
  │                        │                       │  Update Firestore │
  │   Pro activated        │                       │<──────────────────│
  │<───────────────────────│                       │                   │
```

---

## Troubleshooting

### "Garmin login failed"
- Verify credentials are correct
- MFA is supported - enter code when prompted
- Try logging into connect.garmin.com first

### Android build fails
```bash
# Clean and rebuild
cd client/android
./gradlew clean
cd ..
yarn build:android
```

### RevenueCat not working
- Ensure `VITE_REVENUECAT_PUBLIC_KEY` is set
- Check app is running on real device (not web)
- Verify products are configured in RevenueCat dashboard

### Firebase auth issues
- Check Firebase config in `client/.env`
- Ensure Firebase project has Authentication enabled
- Server needs valid service account credentials

---

## Deployment

### Server (Render/Railway)

1. Set environment variables:
   - `NODE_ENV=production`
   - `FIREBASE_SERVICE_ACCOUNT=<json string>`
   - `REVENUECAT_WEBHOOK_SECRET=<secret>`
   - `ALLOWED_ORIGIN=https://your-domain.com`

2. Deploy with `yarn build:server && yarn start`

### Android (Google Play)

1. Generate signed APK/Bundle in Android Studio
2. Create app listing in Play Console
3. Upload to internal testing first
4. Configure in-app products
5. Promote to production

---

## License

MIT
