import {
  checkSyncStatus,
  fetchCloudUserData,
  saveCloudLifeContexts,
  fetchCloudReports,
  fetchCloudActions,
  saveCloudReport,
  saveCloudActions,
  updateCloudAction,
  deleteCloudReport,
  type CloudReport,
  type CloudAction,
} from './api';
import {
  getUserSettings,
  getLifeContexts,
  storeLifeContexts,
  type UserSettings,
} from '../utils/storage';
import { db, type SavedReport, type TrackedAction } from '../db/schema';
import type { LifeContext, StructuredAnalysis } from '../types';

let syncEnabled: boolean | null = null;

// Check if cloud sync is available
export async function isSyncEnabled(): Promise<boolean> {
  if (syncEnabled !== null) return syncEnabled;

  try {
    const status = await checkSyncStatus();
    syncEnabled = status.enabled;
    return syncEnabled;
  } catch {
    syncEnabled = false;
    return false;
  }
}

// Sync user data from cloud on login
// Note: With simplified tiers, only life contexts are synced (no API keys/settings)
export async function syncOnLogin(userId: string): Promise<UserSettings> {
  const localSettings = getUserSettings(userId);
  const localContexts = getLifeContexts(userId);

  if (!(await isSyncEnabled())) {
    return localSettings;
  }

  try {
    const cloudData = await fetchCloudUserData(userId);

    // Sync life contexts from cloud if available
    if (cloudData.lifeContexts && cloudData.lifeContexts.length > 0) {
      storeLifeContexts(userId, cloudData.lifeContexts as LifeContext[]);
    } else if (localContexts.length > 0) {
      // Push local contexts to cloud if cloud is empty
      await saveCloudLifeContexts(userId, localContexts);
    }

    return localSettings;
  } catch (error) {
    console.warn('Cloud sync failed, using local data:', error);
    return localSettings;
  }
}

// Push life contexts to cloud
export async function pushLifeContextsToCloud(userId: string, contexts: LifeContext[]): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    await saveCloudLifeContexts(userId, contexts);
  } catch (error) {
    console.warn('Failed to sync life contexts to cloud:', error);
  }
}

// ============================================================================
// Reports & Actions Cloud Sync
// ============================================================================

// Sync reports and actions from cloud to local IndexedDB on login
export async function syncReportsAndActionsOnLogin(userId: string): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    // Clear local IndexedDB first to prevent data from previous user
    await Promise.all([
      db.reports.clear(),
      db.actions.clear(),
      db.insights.clear(),
      db.metrics.clear(),
      db.progress.clear(),
    ]);

    const [cloudReports, cloudActions] = await Promise.all([
      fetchCloudReports(userId, 50),
      fetchCloudActions(userId),
    ]);

    // Populate local IndexedDB with cloud reports (without healthData - it's not stored in cloud)
    for (const cloudReport of cloudReports) {
      const existingReport = await db.reports.get(cloudReport.id);
      if (!existingReport) {
        // Create local report without healthData (will show as "no data available")
        const localReport: SavedReport = {
          id: cloudReport.id,
          createdAt: cloudReport.createdAt,
          dateRange: cloudReport.dateRange,
          model: cloudReport.model,
          markdown: cloudReport.markdown,
          structured: cloudReport.structured as StructuredAnalysis,
          healthData: null as unknown as SavedReport['healthData'], // Cloud reports don't have healthData
          lifeContexts: cloudReport.lifeContexts,
        };
        await db.reports.add(localReport);
      }
    }

    // Populate local IndexedDB with cloud actions
    for (const cloudAction of cloudActions) {
      const existingAction = await db.actions.get(cloudAction.id);
      if (!existingAction) {
        // Cast recommendation types from cloud (strings) to local union types
        const localAction: TrackedAction = {
          id: cloudAction.id,
          reportId: cloudAction.reportId,
          recommendation: {
            id: cloudAction.recommendation.id,
            text: cloudAction.recommendation.text,
            priority: cloudAction.recommendation.priority as 'high' | 'medium' | 'low',
            category: cloudAction.recommendation.category as 'sleep' | 'stress' | 'activity' | 'recovery' | 'lifestyle',
            evidence: cloudAction.recommendation.evidence,
            actionType: cloudAction.recommendation.actionType as 'habit' | 'avoid' | 'timing' | 'goal',
            trackingType: cloudAction.recommendation.trackingType as 'daily' | 'weekly' | 'one-time' | null,
            suggestedDuration: cloudAction.recommendation.suggestedDuration,
          },
          status: cloudAction.status,
          createdAt: cloudAction.createdAt,
          completedAt: cloudAction.completedAt,
          trackingHistory: cloudAction.trackingHistory,
          currentStreak: cloudAction.currentStreak,
          longestStreak: cloudAction.longestStreak,
        };
        await db.actions.add(localAction);
      } else {
        // Update local action with cloud data (cloud is source of truth)
        await db.actions.update(cloudAction.id, {
          status: cloudAction.status,
          completedAt: cloudAction.completedAt,
          trackingHistory: cloudAction.trackingHistory,
          currentStreak: cloudAction.currentStreak,
          longestStreak: cloudAction.longestStreak,
        });
      }
    }

    console.log(`Synced ${cloudReports.length} reports and ${cloudActions.length} actions from cloud`);
  } catch (error) {
    console.warn('Failed to sync reports and actions from cloud:', error);
  }
}

// Push a report to cloud (excludes healthData for privacy)
export async function pushReportToCloud(userId: string, report: SavedReport): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    const cloudReport: CloudReport = {
      id: report.id,
      createdAt: report.createdAt,
      dateRange: report.dateRange,
      model: report.model,
      markdown: report.markdown,
      structured: report.structured,
      lifeContexts: report.lifeContexts,
      // NOTE: healthData intentionally excluded
    };
    await saveCloudReport(userId, cloudReport);
  } catch (error) {
    console.warn('Failed to push report to cloud:', error);
  }
}

// Push actions to cloud
export async function pushActionsToCloud(userId: string, actions: TrackedAction[]): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    const cloudActions: CloudAction[] = actions.map(action => ({
      id: action.id,
      reportId: action.reportId,
      recommendation: action.recommendation,
      status: action.status,
      createdAt: action.createdAt,
      completedAt: action.completedAt,
      trackingHistory: action.trackingHistory,
      currentStreak: action.currentStreak,
      longestStreak: action.longestStreak,
    }));
    await saveCloudActions(userId, cloudActions);
  } catch (error) {
    console.warn('Failed to push actions to cloud:', error);
  }
}

// Update a single action in cloud
export async function pushActionUpdateToCloud(
  userId: string,
  actionId: string,
  updates: Partial<TrackedAction>
): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    await updateCloudAction(userId, actionId, updates as Partial<CloudAction>);
  } catch (error) {
    console.warn('Failed to push action update to cloud:', error);
  }
}

// Delete a report from cloud
export async function deleteReportFromCloud(userId: string, reportId: string): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    await deleteCloudReport(userId, reportId);
  } catch (error) {
    console.warn('Failed to delete report from cloud:', error);
  }
}
