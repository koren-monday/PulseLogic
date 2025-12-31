import Dexie, { type Table } from 'dexie';
import type {
  LLMProvider,
  GarminHealthData,
  LifeContext,
  StructuredAnalysis,
  HealthMetrics,
  Recommendation,
  Insight,
} from '../types';

// ============================================================================
// Database Entity Types
// ============================================================================

/**
 * Saved analysis report with full data
 */
export interface SavedReport {
  id: string;
  createdAt: string;
  dateRange: { start: string; end: string };
  provider: LLMProvider;
  model: string;
  markdown: string;
  structured: StructuredAnalysis;
  healthData: GarminHealthData;
  lifeContexts?: LifeContext[];
}

/**
 * Tracked action item from recommendations
 */
export interface TrackedAction {
  id: string;
  reportId: string;
  recommendation: Recommendation;
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

/**
 * Daily insight queue entry
 */
export interface QueuedInsight {
  id: string;
  reportId: string;
  insight: Insight;
  scheduledFor: string;
  status: 'pending' | 'shown' | 'acted' | 'dismissed';
  shownAt?: string;
}

/**
 * Historical metrics snapshot for trends
 */
export interface MetricSnapshot {
  id: string;
  reportId: string;
  date: string;
  metrics: HealthMetrics;
}

/**
 * User progress and preferences (singleton)
 */
export interface UserProgress {
  id: 'singleton';
  lastReportId?: string;
  totalReports: number;
  actionsCompleted: number;
  currentStreaks: Record<string, number>;
  achievements: string[];
  insightPreferences: {
    lastShownDate: string;
    dismissedCategories: string[];
  };
}

// ============================================================================
// Dexie Database Class
// ============================================================================

export class PulseLogicDB extends Dexie {
  reports!: Table<SavedReport, string>;
  actions!: Table<TrackedAction, string>;
  insights!: Table<QueuedInsight, string>;
  metrics!: Table<MetricSnapshot, string>;
  progress!: Table<UserProgress, 'singleton'>;

  constructor() {
    super('PulseLogicDB');

    this.version(1).stores({
      reports: 'id, createdAt, dateRange.start, dateRange.end',
      actions: 'id, reportId, status, recommendation.priority',
      insights: 'id, reportId, scheduledFor, status',
      metrics: 'id, reportId, date',
      progress: 'id',
    });
  }
}

// Singleton database instance
export const db = new PulseLogicDB();
