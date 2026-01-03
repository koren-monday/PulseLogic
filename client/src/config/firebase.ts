import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut,
  type User,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Initialize Firebase only if config is available
let app: ReturnType<typeof initializeApp> | null = null;
let auth: Auth | null = null;

function getFirebaseApp() {
  if (!app && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getFirebaseAuth(): Auth | null {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp) {
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

export async function signInWithToken(customToken: string): Promise<User | null> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    console.warn('Firebase not configured - skipping auth');
    return null;
  }

  try {
    const userCredential = await signInWithCustomToken(firebaseAuth, customToken);
    return userCredential.user;
  } catch (error) {
    console.error('Firebase sign in failed:', error);
    throw error;
  }
}

export async function firebaseSignOut(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    // No Firebase - call with null immediately
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(firebaseAuth, callback);
}

export function getCurrentUser(): User | null {
  const firebaseAuth = getFirebaseAuth();
  return firebaseAuth?.currentUser ?? null;
}

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.apiKey;
}

export type { User };
