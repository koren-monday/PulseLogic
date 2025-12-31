import { v4 as uuidv4 } from 'uuid';
import {
  db,
  type SavedReport,
  type TrackedAction,
  type QueuedInsight,
  type MetricSnapshot,
  type UserProgress,
} from '../db/schema';
import type {
  StructuredAnalysis,
  HealthMetrics,
  Recommendation,
  Insight,
  GarminHealthData,
  LifeContext,
  LLMProvider,
} from '../types';

// ============================================================================
// Report Operations
// ============================================================================

export async function saveReport(params: {
  dateRange: { start: string; end: string };
  provider: LLMProvider;
  model: string;
  markdown: string;
  structured: StructuredAnalysis;
  healthData: GarminHealthData;
  lifeContexts?: LifeContext[];
}): Promise<string> {
  const id = uuidv4();
  const savedReport: SavedReport = {
    ...params,
    id,
    createdAt: new Date().toISOString(),
  };

  await db.reports.add(savedReport);

  // Save metrics snapshot for trends
  await saveMetricSnapshot(id, params.structured.metrics, params.dateRange.end);

  // Queue insights for daily engagement
  await queueInsights(id, params.structured.insights);

  // Create action items from trackable recommendations
  await createActionsFromRecommendations(id, params.structured.recommendations);

  // Update user progress
  await incrementReportCount(id);

  return id;
}

export async function getReports(limit = 20): Promise<SavedReport[]> {
  return db.reports.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function getReport(id: string): Promise<SavedReport | undefined> {
  return db.reports.get(id);
}

export async function getLatestReport(): Promise<SavedReport | undefined> {
  return db.reports.orderBy('createdAt').reverse().first();
}

export async function deleteReport(id: string): Promise<void> {
  await Promise.all([
    db.reports.delete(id),
    db.actions.where('reportId').equals(id).delete(),
    db.insights.where('reportId').equals(id).delete(),
    db.metrics.where('reportId').equals(id).delete(),
  ]);
}

// ============================================================================
// Action Tracking Operations
// ============================================================================

async function createActionsFromRecommendations(
  reportId: string,
  recommendations: Recommendation[]
): Promise<void> {
  const trackableRecs = recommendations.filter((r) => r.trackingType !== null);

  const actions: TrackedAction[] = trackableRecs.map((rec) => ({
    id: uuidv4(),
    reportId,
    recommendation: rec,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    trackingHistory: [],
    currentStreak: 0,
    longestStreak: 0,
  }));

  if (actions.length > 0) {
    await db.actions.bulkAdd(actions);
  }
}

export async function getActiveActions(): Promise<TrackedAction[]> {
  return db.actions.where('status').equals('active').toArray();
}

export async function getAllActions(): Promise<TrackedAction[]> {
  return db.actions.toArray();
}

export async function getActionsByReport(reportId: string): Promise<TrackedAction[]> {
  return db.actions.where('reportId').equals(reportId).toArray();
}

export async function logActionProgress(
  actionId: string,
  completed: boolean,
  notes?: string
): Promise<void> {
  const action = await db.actions.get(actionId);
  if (!action) return;

  const today = new Date().toISOString().split('T')[0];

  // Check if already logged today
  const existingEntry = action.trackingHistory.find((h) => h.date === today);
  if (existingEntry) {
    // Update existing entry
    existingEntry.completed = completed;
    existingEntry.notes = notes;
  } else {
    // Add new entry
    action.trackingHistory.push({ date: today, completed, notes });
  }

  // Update streak
  const newStreak = completed ? action.currentStreak + 1 : 0;
  const longestStreak = Math.max(action.longestStreak, newStreak);

  await db.actions.update(actionId, {
    trackingHistory: action.trackingHistory,
    currentStreak: newStreak,
    longestStreak,
  });
}

export async function completeAction(actionId: string): Promise<void> {
  await db.actions.update(actionId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });

  // Update user progress
  const progress = await getProgress();
  await db.progress.update('singleton', {
    actionsCompleted: progress.actionsCompleted + 1,
  });
}

export async function dismissAction(actionId: string): Promise<void> {
  await db.actions.update(actionId, { status: 'dismissed' });
}

export async function snoozeAction(actionId: string): Promise<void> {
  await db.actions.update(actionId, { status: 'snoozed' });
}

export async function reactivateAction(actionId: string): Promise<void> {
  await db.actions.update(actionId, { status: 'active' });
}

// ============================================================================
// Insight Operations
// ============================================================================

async function queueInsights(reportId: string, insights: Insight[]): Promise<void> {
  if (!insights || insights.length === 0) return;

  const startDate = new Date();

  // Clear old pending insights from previous reports
  await db.insights.where('status').equals('pending').delete();

  const queued: QueuedInsight[] = insights.map((insight, index) => ({
    id: uuidv4(),
    reportId,
    insight,
    scheduledFor: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    status: 'pending' as const,
  }));

  await db.insights.bulkAdd(queued);
}

export async function getTodayInsight(): Promise<QueuedInsight | null> {
  const today = new Date().toISOString().split('T')[0];

  // Get pending insight for today or earlier
  const insight = await db.insights
    .where('scheduledFor')
    .belowOrEqual(today)
    .and((i) => i.status === 'pending')
    .first();

  return insight || null;
}

export async function markInsightShown(id: string): Promise<void> {
  await db.insights.update(id, {
    status: 'shown',
    shownAt: new Date().toISOString(),
  });
}

export async function markInsightActed(id: string): Promise<void> {
  await db.insights.update(id, {
    status: 'acted',
    shownAt: new Date().toISOString(),
  });
}

export async function dismissInsight(id: string): Promise<void> {
  await db.insights.update(id, {
    status: 'dismissed',
    shownAt: new Date().toISOString(),
  });
}

// ============================================================================
// Metrics / Trends Operations
// ============================================================================

async function saveMetricSnapshot(
  reportId: string,
  metrics: HealthMetrics,
  date: string
): Promise<void> {
  await db.metrics.add({
    id: uuidv4(),
    reportId,
    date,
    metrics,
  });
}

export async function getMetricHistory(limit = 10): Promise<MetricSnapshot[]> {
  return db.metrics.orderBy('date').reverse().limit(limit).toArray();
}

export async function getLatestMetrics(): Promise<MetricSnapshot | undefined> {
  return db.metrics.orderBy('date').reverse().first();
}

export async function getTrendComparison(): Promise<{
  hasTrend: boolean;
  current?: MetricSnapshot;
  previous?: MetricSnapshot;
  deltas?: Record<keyof HealthMetrics, number>;
}> {
  const history = await getMetricHistory(2);

  if (history.length < 2) {
    return { hasTrend: false };
  }

  const [current, previous] = history;

  const deltas: Record<keyof HealthMetrics, number> = {
    overallScore: current.metrics.overallScore - previous.metrics.overallScore,
    sleepScore: current.metrics.sleepScore - previous.metrics.sleepScore,
    stressScore: current.metrics.stressScore - previous.metrics.stressScore,
    recoveryScore: current.metrics.recoveryScore - previous.metrics.recoveryScore,
    activityScore: current.metrics.activityScore - previous.metrics.activityScore,
  };

  return { hasTrend: true, current, previous, deltas };
}

// ============================================================================
// User Progress Operations
// ============================================================================

export async function getProgress(): Promise<UserProgress> {
  let progress = await db.progress.get('singleton');

  if (!progress) {
    progress = {
      id: 'singleton',
      totalReports: 0,
      actionsCompleted: 0,
      currentStreaks: {},
      achievements: [],
      insightPreferences: {
        lastShownDate: '',
        dismissedCategories: [],
      },
    };
    await db.progress.add(progress);
  }

  return progress;
}

async function incrementReportCount(reportId: string): Promise<void> {
  const progress = await getProgress();
  await db.progress.update('singleton', {
    totalReports: progress.totalReports + 1,
    lastReportId: reportId,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.reports.clear(),
    db.actions.clear(),
    db.insights.clear(),
    db.metrics.clear(),
    db.progress.clear(),
  ]);
}

export async function getDatabaseStats(): Promise<{
  reports: number;
  actions: number;
  insights: number;
  metrics: number;
}> {
  const [reports, actions, insights, metrics] = await Promise.all([
    db.reports.count(),
    db.actions.count(),
    db.insights.count(),
    db.metrics.count(),
  ]);

  return { reports, actions, insights, metrics };
}
