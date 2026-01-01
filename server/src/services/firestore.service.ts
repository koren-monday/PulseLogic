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

// ============================================================================
// Reports Subcollection
// ============================================================================

export interface CloudReport {
  id: string;
  createdAt: string;
  dateRange: { start: string; end: string };
  provider: string;
  model: string;
  markdown: string;
  structured: unknown; // StructuredAnalysis - kept as unknown for flexibility
  lifeContexts?: LifeContext[];
  // NOTE: healthData is intentionally excluded for privacy
}

export async function saveReport(userId: string, report: CloudReport): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore
      .collection('users')
      .doc(userId)
      .collection('reports')
      .doc(report.id)
      .set({
        ...report,
        updatedAt: new Date().toISOString(),
      });
    return true;
  } catch (error) {
    console.error('Failed to save report:', error);
    return false;
  }
}

export async function getReports(userId: string, limit = 20): Promise<CloudReport[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('reports')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as CloudReport);
  } catch (error) {
    console.error('Failed to get reports:', error);
    return [];
  }
}

export async function getReport(userId: string, reportId: string): Promise<CloudReport | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const doc = await firestore
      .collection('users')
      .doc(userId)
      .collection('reports')
      .doc(reportId)
      .get();

    if (!doc.exists) return null;
    return doc.data() as CloudReport;
  } catch (error) {
    console.error('Failed to get report:', error);
    return null;
  }
}

export async function deleteReport(userId: string, reportId: string): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    // Delete report
    await firestore
      .collection('users')
      .doc(userId)
      .collection('reports')
      .doc(reportId)
      .delete();

    // Delete associated actions
    const actionsSnapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('actions')
      .where('reportId', '==', reportId)
      .get();

    const batch = firestore.batch();
    actionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return true;
  } catch (error) {
    console.error('Failed to delete report:', error);
    return false;
  }
}

// ============================================================================
// Actions Subcollection
// ============================================================================

export interface CloudAction {
  id: string;
  reportId: string;
  recommendation: {
    id: string;
    text: string;
    priority: string;
    category: string;
    evidence: string;
    actionType: string;
    trackingType: string | null;
    suggestedDuration?: number;
  };
  status: 'active' | 'completed' | 'dismissed' | 'snoozed';
  createdAt: string;
  completedAt?: string;
  trackingHistory: {
    date: string;
    completed: boolean;
    notes?: string;
  }[];
  currentStreak: number;
  longestStreak: number;
}

export async function saveAction(userId: string, action: CloudAction): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore
      .collection('users')
      .doc(userId)
      .collection('actions')
      .doc(action.id)
      .set({
        ...action,
        updatedAt: new Date().toISOString(),
      });
    return true;
  } catch (error) {
    console.error('Failed to save action:', error);
    return false;
  }
}

export async function saveActions(userId: string, actions: CloudAction[]): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    const batch = firestore.batch();
    const actionsRef = firestore.collection('users').doc(userId).collection('actions');

    actions.forEach(action => {
      batch.set(actionsRef.doc(action.id), {
        ...action,
        updatedAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Failed to save actions:', error);
    return false;
  }
}

export async function getActions(userId: string): Promise<CloudAction[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('actions')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as CloudAction);
  } catch (error) {
    console.error('Failed to get actions:', error);
    return [];
  }
}

export async function getActiveActions(userId: string): Promise<CloudAction[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('actions')
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(doc => doc.data() as CloudAction);
  } catch (error) {
    console.error('Failed to get active actions:', error);
    return [];
  }
}

export async function updateAction(
  userId: string,
  actionId: string,
  updates: Partial<CloudAction>
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore
      .collection('users')
      .doc(userId)
      .collection('actions')
      .doc(actionId)
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    return true;
  } catch (error) {
    console.error('Failed to update action:', error);
    return false;
  }
}

// ============================================================================
// Statistics Subcollection
// ============================================================================

export interface CloudStatistics {
  id: string;
  calculatedAt: string;
  periodStart: string;
  periodEnd: string;
  daysIncluded: number;
  sleep: {
    durationHours: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    sleepScore: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    deepSleepPercent: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    remSleepPercent: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    restingHR: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
  };
  stress: {
    overallLevel: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    highStressPercent: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    lowStressPercent: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
  };
  bodyBattery: {
    charged: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    drained: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    endLevel: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    highestLevel: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
  };
  heartRate: {
    resting: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    min: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    max: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
  };
  activity: {
    dailyCalories: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    sessionDuration: { avg: number; median: number; min: number; max: number; p25?: number; p75?: number; count: number };
    activeDaysPerWeek: number;
    totalActivities: number;
  };
}

export async function saveStatistics(userId: string, statistics: CloudStatistics): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore
      .collection('users')
      .doc(userId)
      .collection('statistics')
      .doc(statistics.id)
      .set({
        ...statistics,
        updatedAt: new Date().toISOString(),
      });
    return true;
  } catch (error) {
    console.error('Failed to save statistics:', error);
    return false;
  }
}

export async function getLatestStatistics(userId: string): Promise<CloudStatistics | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('statistics')
      .orderBy('calculatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as CloudStatistics;
  } catch (error) {
    console.error('Failed to get latest statistics:', error);
    return null;
  }
}

export async function getStatisticsHistory(userId: string, limit = 10): Promise<CloudStatistics[]> {
  const firestore = getDb();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('statistics')
      .orderBy('calculatedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as CloudStatistics);
  } catch (error) {
    console.error('Failed to get statistics history:', error);
    return [];
  }
}
