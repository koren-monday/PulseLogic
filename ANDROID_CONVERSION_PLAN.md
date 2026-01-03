# PulseLogic Android Conversion Plan

## Overview
Convert React web app to Android using Capacitor with Firebase Auth for identity and RevenueCat for payments.

---

## PHASE 1: CAPACITOR SETUP

### 1.1 Install Dependencies (client/)
```bash
yarn add @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/splash-screen
```

### 1.2 Initialize Capacitor
- Run `npx cap init` with:
  - appId: `com.pulselogic.app`
  - appName: `PulseLogic`
  - webDir: `dist`

### 1.3 Create capacitor.config.ts
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pulselogic.app',
  appName: 'PulseLogic',
  webDir: 'dist',
  server: {
    // Dev: point to local server (change for production)
    url: process.env.NODE_ENV === 'development' ? 'http://10.0.2.2:5173' : undefined,
    cleartext: true, // Allow HTTP in dev
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Set for release builds
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a', // slate-900
      showSpinner: true,
      spinnerColor: '#00AEEF', // garmin-blue
    },
  },
};

export default config;
```

### 1.4 Add Android Platform
```bash
npx cap add android
```

### 1.5 Update package.json scripts (client/)
Add:
- `"cap:sync": "cap sync android"`
- `"cap:open": "cap open android"`
- `"build:android": "vite build && cap sync android"`

### 1.6 Update index.html
Add viewport meta for mobile + safe-area handling:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
<meta name="theme-color" content="#0f172a" />
```

---

## PHASE 2: FIREBASE CLIENT AUTH

### 2.1 Install Firebase Client SDK
```bash
yarn add firebase
```

### 2.2 Create client/src/config/firebase.ts
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut, type User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, signInWithCustomToken, onAuthStateChanged, signOut };
export type { User };
```

### 2.3 Create client/src/contexts/AuthContext.tsx
- Wrap app with Firebase auth state
- Expose: currentUser, loading, signIn, signOut
- Listen to onAuthStateChanged for persistence

### 2.4 Modify server/src/routes/garmin.routes.ts
After successful Garmin login, generate Firebase custom token:
```typescript
import { getAuth } from 'firebase-admin/auth';

// In login success handler:
const firebaseToken = await getAuth().createCustomToken(email, {
  garminUserId: result.session.userId,
  provider: 'garmin',
});

// Return with response
res.json({
  success: true,
  data: {
    ...existingData,
    firebaseToken,
  },
});
```

### 2.5 Update client API/hooks
- After Garmin login success, call `signInWithCustomToken(auth, firebaseToken)`
- Use `auth.currentUser.uid` as the userId for subscription calls

### 2.6 Update App.tsx
- Wrap with AuthProvider
- Gate app on Firebase auth state, not just Garmin session
- Handle auth state persistence

---

## PHASE 3: REVENUECAT INTEGRATION

### 3.1 Create client/src/services/purchases.ts
```typescript
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export async function initializePurchases() {
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({
    apiKey: import.meta.env.VITE_REVENUECAT_PUBLIC_KEY,
  });
}

export async function loginToPurchases(firebaseUid: string) {
  await Purchases.logIn({ appUserID: firebaseUid });
}

export async function getOfferings() {
  return Purchases.getOfferings();
}

export async function purchasePackage(packageId: string) {
  const offerings = await getOfferings();
  const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId);
  if (!pkg) throw new Error('Package not found');
  return Purchases.purchasePackage({ aPackage: pkg });
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo() {
  return Purchases.getCustomerInfo();
}
```

### 3.2 Create client/src/components/Paywall.tsx
- Display subscription offerings (monthly/annual)
- Show current subscription status
- Handle purchase flow with loading states
- Restore purchases button

### 3.3 Create server/src/routes/webhooks.routes.ts
```typescript
import { Router } from 'express';
import { updateUserSubscription } from '../services/firestore.service.js';

const router = Router();

// RevenueCat webhook endpoint
router.post('/revenuecat', async (req, res) => {
  const signature = req.headers['x-revenuecat-signature'];
  // TODO: Verify signature with REVENUECAT_WEBHOOK_SECRET

  const { event } = req.body;
  const userId = event.app_user_id; // Firebase UID

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await updateUserSubscription(userId, {
        tier: 'paid',
        status: 'active',
        currentPeriodEnd: event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : undefined,
      });
      break;

    case 'CANCELLATION':
    case 'EXPIRATION':
      await updateUserSubscription(userId, {
        tier: 'free',
        status: event.type === 'CANCELLATION' ? 'cancelled' : 'active',
      });
      break;
  }

  res.json({ success: true });
});

export default router;
```

### 3.4 Update Header.tsx
Add upgrade button for free tier users:
```tsx
{tier === 'free' && (
  <button onClick={() => setShowPaywall(true)} className="btn-primary-sm">
    Upgrade
  </button>
)}
```

### 3.5 Register webhook route in server/src/routes/index.ts

---

## PHASE 4: ANDROID CONFIGURATION

### 4.1 App Icons & Splash Screen
- Create launcher icons for all densities (mipmap-*)
- Create splash screen assets
- Update capacitor.config.ts splash settings

### 4.2 AndroidManifest.xml Updates
- Internet permission (should exist)
- Deep link intent filter for OAuth callback:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="pulselogic" />
</intent-filter>
```

### 4.3 build.gradle Configuration
- applicationId: "com.pulselogic.app"
- versionCode/versionName management
- Signing config placeholder for release

### 4.4 google-services.json
- Download from Firebase Console
- Place in android/app/

### 4.5 Back Button Handling
In App.tsx or a dedicated hook:
```typescript
import { App } from '@capacitor/app';

useEffect(() => {
  const handler = App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else if (currentStep !== 'data') {
      setCurrentStep('data');
    } else {
      App.exitApp();
    }
  });
  return () => { handler.remove(); };
}, [currentStep]);
```

---

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `client/capacitor.config.ts` | Capacitor configuration |
| `client/src/config/firebase.ts` | Firebase client initialization |
| `client/src/contexts/AuthContext.tsx` | Firebase auth state provider |
| `client/src/services/purchases.ts` | RevenueCat wrapper |
| `client/src/components/Paywall.tsx` | Subscription UI |
| `server/src/routes/webhooks.routes.ts` | RevenueCat webhooks |

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `client/package.json` | Add Capacitor deps, scripts |
| `client/index.html` | Mobile viewport, safe-area |
| `client/src/App.tsx` | Auth provider, back button handler |
| `client/src/main.tsx` | Initialize purchases |
| `client/src/services/api.ts` | Update GarminSession type for firebaseToken |
| `client/src/hooks/index.ts` | Update login hooks for Firebase auth |
| `client/src/components/Header.tsx` | Add upgrade button |
| `client/src/contexts/SubscriptionContext.tsx` | Use Firebase UID |
| `server/src/routes/garmin.routes.ts` | Generate Firebase custom tokens |
| `server/src/routes/index.ts` | Register webhook routes |
| `server/src/index.ts` | Update CORS for capacitor |

---

## ENVIRONMENT VARIABLES

### Client (.env)
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_REVENUECAT_PUBLIC_KEY=xxx
```

### Server (.env)
```
REVENUECAT_WEBHOOK_SECRET=xxx
```

---

## IMPLEMENTATION ORDER

1. **Phase 1**: Capacitor setup (can test web app in Android WebView)
2. **Phase 2**: Firebase Auth (silent auth after Garmin login)
3. **Phase 3**: RevenueCat (payments + tier upgrades)
4. **Phase 4**: Android polish (icons, deep links, back button)

---

## DECISION POINTS FOR USER

1. **Firebase Custom Token Claims**: Include garminUserId and provider - any other claims needed?
2. **Paywall UI**: Modal overlay or dedicated page?
3. **Subscription Products**: Monthly and annual only, or include weekly trial?
4. **Offline Handling**: Show cached data or block until online?
