import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  getRevenueCatSubscriber,
  getSubscriberTier,
  getSubscriptionExpiration,
} from './revenuecat.service.js';

// Types for user data
export interface UserProfile {
  email: string;
  garminUserId?: string;
  displayName?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserSettings {
  preferAdvancedModel?: boolean;
}

export interface LifeContext {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface UserData {
  profile?: UserProfile;
  settings?: UserSettings;
  lifeContexts?: LifeContext[];
  updatedAt?: string;
}

// Initialize Firebase lazily
let db: Firestore | null = null;

function getServiceAccount(): object | null {
  // First, try environment variable (for production/Render)
  const envCredentials = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envCredentials) {
    try {
      return JSON.parse(envCredentials);
    } catch {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env variable');
    }
  }

  // Fall back to local file (for development)
  const serviceAccountPath = resolve(process.cwd(), 'firebase-service-account.json');
  if (existsSync(serviceAccountPath)) {
    try {
      return JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    } catch {
      console.error('Failed to parse firebase-service-account.json');
    }
  }

  return null;
}

function getDb(): Firestore | null {
  if (db) return db;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    console.warn('Firebase service account not found. Cloud sync disabled.');
    return null;
  }

  try {
    if (getApps().length === 0) {
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

/**
 * Record user login - uses email as the document key for easy identification.
 * Creates profile if first login, updates lastLoginAt if existing.
 * Also stores the Garmin userId for reference.
 */
export async function recordUserLogin(email: string, garminUserId?: string): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    const now = new Date().toISOString();
    const userRef = firestore.collection('users').doc(email);
    const doc = await userRef.get();

    if (!doc.exists || !doc.data()?.profile) {
      // First login - create profile with default subscription
      await userRef.set(
        {
          profile: {
            email,
            garminUserId,
            createdAt: now,
            lastLoginAt: now,
          },
          subscription: {
            tier: 'free',
            status: 'active',
            createdAt: now,
            updatedAt: now,
          },
          updatedAt: now,
        },
        { merge: true }
      );
      console.log(`Created new user profile with default subscription: ${email}`);
    } else {
      // Existing user - update last login
      const updates: Record<string, unknown> = {
        'profile.lastLoginAt': now,
        updatedAt: now,
      };
      if (garminUserId) {
        updates['profile.garminUserId'] = garminUserId;
      }

      // Initialize subscription if it doesn't exist (for legacy users)
      const userData = doc.data();
      if (!userData?.subscription) {
        updates['subscription'] = {
          tier: 'free',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };
        console.log(`Initialized missing subscription for existing user: ${email}`);
      }

      await userRef.update(updates);
    }
    return true;
  } catch (error) {
    console.error('Failed to record user login:', error);
    return false;
  }
}

/**
 * Get user profile (email, etc) for admin visibility.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const doc = await firestore.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data()?.profile || null;
  } catch (error) {
    console.error('Failed to get user profile:', error);
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

/**
 * Delete a user account and all associated data.
 * This includes: user document, all subcollections, and Firebase Auth user.
 */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    const userRef = firestore.collection('users').doc(userId);

    // Delete all subcollections
    const subcollections = ['reports', 'actions', 'statistics', 'usage'];
    for (const subcollection of subcollections) {
      const snapshot = await userRef.collection(subcollection).get();
      if (!snapshot.empty) {
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // Delete main user document
    await userRef.delete();

    // Delete Firebase Auth user
    try {
      await getAuth().deleteUser(userId);
    } catch (authError) {
      // User might not exist in Firebase Auth (e.g., if using fallback auth)
      console.warn('Could not delete Firebase Auth user (may not exist):', authError);
    }

    console.log(`Deleted user account: ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete user account:', error);
    return false;
  }
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

// ============================================================================
// Subscription & Usage Tracking
// ============================================================================

import type { UserSubscription, UsageRecord } from '../types/subscription.js';

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  tier: 'free',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const firestore = getDb();
  if (!firestore) return { ...DEFAULT_SUBSCRIPTION };

  try {
    const doc = await firestore.collection('users').doc(userId).get();
    if (!doc.exists) return { ...DEFAULT_SUBSCRIPTION };

    const data = doc.data();
    if (!data?.subscription) return { ...DEFAULT_SUBSCRIPTION };

    return data.subscription as UserSubscription;
  } catch (error) {
    console.error('Failed to get user subscription:', error);
    return { ...DEFAULT_SUBSCRIPTION };
  }
}

export async function updateUserSubscription(
  userId: string,
  updates: Partial<UserSubscription>
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    const current = await getUserSubscription(userId);
    const updated: UserSubscription = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await firestore.collection('users').doc(userId).set(
      { subscription: updated },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to update user subscription:', error);
    return false;
  }
}

export async function setUserSubscription(
  userId: string,
  subscription: UserSubscription
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    await firestore.collection('users').doc(userId).set(
      {
        subscription: {
          ...subscription,
          updatedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to set user subscription:', error);
    return false;
  }
}

/**
 * Sync user subscription with RevenueCat.
 * Queries RevenueCat API for current subscription status and updates Firestore.
 * Returns the updated subscription, or null if sync failed.
 */
export async function syncRevenueCatSubscription(
  userId: string
): Promise<UserSubscription | null> {
  console.log(`Syncing RevenueCat subscription for user: ${userId}`);

  try {
    // Query RevenueCat for subscriber info
    const subscriber = await getRevenueCatSubscriber(userId);

    if (!subscriber) {
      console.log(`RevenueCat: No subscriber found for ${userId}, keeping current subscription`);
      return await getUserSubscription(userId);
    }

    // Determine tier based on entitlements
    const tier = getSubscriberTier(subscriber);
    const currentPeriodEnd = getSubscriptionExpiration(subscriber);

    console.log(`RevenueCat: User ${userId} has tier: ${tier}, expires: ${currentPeriodEnd || 'N/A'}`);

    // Update Firestore with RevenueCat data
    const updates: Partial<UserSubscription> = {
      tier,
      status: 'active',
      currentPeriodEnd,
    };

    const success = await updateUserSubscription(userId, updates);

    if (!success) {
      console.error(`Failed to update subscription in Firestore for ${userId}`);
      return null;
    }

    // Return updated subscription
    return await getUserSubscription(userId);
  } catch (error) {
    console.error(`Failed to sync RevenueCat subscription for ${userId}:`, error);
    return null;
  }
}

// Get today's date as YYYY-MM-DD
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// Get the start of the current week (Monday) as YYYY-MM-DD
function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday = 0
  const weekStart = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
  return weekStart.toISOString().split('T')[0];
}

export async function getUserUsage(userId: string): Promise<UsageRecord> {
  const firestore = getDb();
  const today = getToday();
  const weekStart = getWeekStart();

  const defaultUsage: UsageRecord = {
    userId,
    date: today,
    llmCommunicationsToday: 0,
    snapshotsUsed: 0,
    weekStartDate: weekStart,
    reportsThisWeek: 0,
  };

  if (!firestore) return defaultUsage;

  try {
    const doc = await firestore
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc(today)
      .get();

    if (!doc.exists) return defaultUsage;

    const data = doc.data() as UsageRecord;

    // Reset weekly count if we're in a new week
    if (data.weekStartDate !== weekStart) {
      return {
        ...data,
        llmCommunicationsToday: data.llmCommunicationsToday || 0,
        weekStartDate: weekStart,
        reportsThisWeek: 0,
      };
    }

    return {
      ...defaultUsage,
      ...data,
    };
  } catch (error) {
    console.error('Failed to get user usage:', error);
    return defaultUsage;
  }
}

export async function incrementUsage(
  userId: string,
  type: 'llm' | 'snapshot'
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  const today = getToday();
  const weekStart = getWeekStart();

  try {
    const usage = await getUserUsage(userId);
    const updates: Partial<UsageRecord> = {
      date: today,
      weekStartDate: weekStart,
    };

    switch (type) {
      case 'llm':
        // Increment both daily LLM communications and weekly reports
        updates.llmCommunicationsToday = (usage.llmCommunicationsToday || 0) + 1;
        updates.reportsThisWeek = (usage.reportsThisWeek || 0) + 1;
        break;
      case 'snapshot':
        updates.snapshotsUsed = (usage.snapshotsUsed || 0) + 1;
        break;
    }

    await firestore
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc(today)
      .set({ ...usage, ...updates }, { merge: true });

    return true;
  } catch (error) {
    console.error('Failed to increment usage:', error);
    return false;
  }
}

// Get chat messages sent for a specific report (tracked in report metadata)
export async function getReportChatCount(
  userId: string,
  reportId: string
): Promise<number> {
  const firestore = getDb();
  if (!firestore) return 0;

  try {
    const doc = await firestore
      .collection('users')
      .doc(userId)
      .collection('reports')
      .doc(reportId)
      .get();

    if (!doc.exists) return 0;
    const data = doc.data();
    return data?.chatMessageCount || 0;
  } catch (error) {
    console.error('Failed to get report chat count:', error);
    return 0;
  }
}

export async function incrementReportChatCount(
  userId: string,
  reportId: string
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return false;

  try {
    const current = await getReportChatCount(userId, reportId);
    await firestore
      .collection('users')
      .doc(userId)
      .collection('reports')
      .doc(reportId)
      .update({
        chatMessageCount: current + 1,
        updatedAt: new Date().toISOString(),
      });
    return true;
  } catch (error) {
    console.error('Failed to increment report chat count:', error);
    return false;
  }
}
