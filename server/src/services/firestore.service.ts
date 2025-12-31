import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Types for user data
export interface UserSettings {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

export interface LifeContext {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface UserData {
  settings?: UserSettings;
  lifeContexts?: LifeContext[];
  updatedAt?: string;
}

// Initialize Firebase lazily
let db: Firestore | null = null;

function getDb(): Firestore | null {
  if (db) return db;

  // Try to load service account
  const serviceAccountPath = resolve(process.cwd(), 'firebase-service-account.json');

  if (!existsSync(serviceAccountPath)) {
    console.warn('Firebase service account not found. Cloud sync disabled.');
    return null;
  }

  try {
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    db = getFirestore();
    console.log('Firestore initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    return null;
  }
}

// Get user data
export async function getUserData(userId: string): Promise<UserData | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const doc = await firestore.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as UserData;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

// Save user settings
export async function saveUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore.collection('users').doc(userId).set(
      {
        settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to save user settings:', error);
    return false;
  }
}

// Save life contexts
export async function saveLifeContexts(userId: string, lifeContexts: LifeContext[]): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore.collection('users').doc(userId).set(
      {
        lifeContexts,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to save life contexts:', error);
    return false;
  }
}

// Save all user data at once
export async function saveUserData(userId: string, data: UserData): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore.collection('users').doc(userId).set(
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to save user data:', error);
    return false;
  }
}

// Check if Firestore is available
export function isFirestoreEnabled(): boolean {
  return getDb() !== null;
}
