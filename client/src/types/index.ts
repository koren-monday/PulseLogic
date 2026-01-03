// Import and re-export structured analysis types
import type { StructuredAnalysis } from './structured-analysis';
export * from './structured-analysis';
export type { StructuredAnalysis };

// Re-export subscription types
export * from './subscription';

// ============================================================================
// Garmin Types (mirrored from server)
// ============================================================================

export interface GarminCredentials {
  username: string;
  password: string;
}

export interface GarminSession {
  isAuthenticated: boolean;
  displayName?: string;
  userId?: string;
  sessionId: string;
  requiresMFA?: boolean;
  mfaSessionId?: string;
}

export interface SleepData {
  date: string;
  sleepTimeSeconds: number;
  deepSleepSeconds: number;
  lightSleepSeconds: number;
  remSleepSeconds: number;
  awakeSleepSeconds: number;
  sleepScore: number | null;
  restingHeartRate: number | null;
}

export interface StressData {
  date: string;
  overallStressLevel: number;
  restStressLevel: number;
  lowStressLevel: number;
  mediumStressLevel: number;
  highStressLevel: number;
  stressQualifier: string;
}

export interface BodyBatteryData {
  date: string;
  charged: number;
  drained: number;
  startLevel: number;
  endLevel: number;
  highestLevel: number;
  lowestLevel: number;
}

export interface ActivityData {
  activityId: number;
  activityName: string;
  activityType: string;
  startTimeLocal: string;
  duration: number;
  distance: number | null;
  calories: number;
  averageHR: number | null;
  maxHR: number | null;
  averageSpeed: number | null;
}

export interface HeartRateData {
  date: string;
  restingHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
}

export interface GarminHealthData {
  dateRange: { start: string; end: string };
  sleep: SleepData[];
  stress: StressData[];
  bodyBattery: BodyBatteryData[];
  activities: ActivityData[];
  heartRate: HeartRateData[];
}

// ============================================================================
// LLM Types (Simplified - server provides all API keys)
// ============================================================================

// Legacy type kept for compatibility during transition
export type LLMProvider = 'google';

// ============================================================================
// Life Context Types - Personal circumstances affecting health metrics
// ============================================================================

export type LifeContextType =
  | 'new_baby'
  | 'pregnancy'
  | 'diet_change'
  | 'stress_event'
  | 'illness'
  | 'travel'
  | 'training_goal'
  | 'medication'
  | 'other';

export interface LifeContextBase {
  id: string;
  type: LifeContextType;
}

export interface NewBabyContext extends LifeContextBase {
  type: 'new_baby';
  birthDate: string;
  notes?: string;
}

export interface PregnancyContext extends LifeContextBase {
  type: 'pregnancy';
  dueDate?: string;
  currentWeek?: number;
  notes?: string;
}

export interface DietChangeContext extends LifeContextBase {
  type: 'diet_change';
  dietType: 'keto' | 'low_carb' | 'vegan' | 'vegetarian' | 'fasting' | 'calorie_restriction' | 'other';
  customDietType?: string;
  startDate: string;
  notes?: string;
}

export interface StressEventContext extends LifeContextBase {
  type: 'stress_event';
  category: 'work' | 'personal' | 'health' | 'financial' | 'relationship' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  startDate?: string;
}

export interface IllnessContext extends LifeContextBase {
  type: 'illness';
  illnessType: 'cold_flu' | 'injury' | 'surgery' | 'covid' | 'chronic' | 'other';
  customIllnessType?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface TravelContext extends LifeContextBase {
  type: 'travel';
  timezoneChange?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface TrainingGoalContext extends LifeContextBase {
  type: 'training_goal';
  eventType: 'marathon' | 'half_marathon' | 'triathlon' | '5k_10k' | 'competition' | 'other';
  customEventType?: string;
  eventDate?: string;
  notes?: string;
}

export interface MedicationContext extends LifeContextBase {
  type: 'medication';
  medicationName: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface OtherContext extends LifeContextBase {
  type: 'other';
  description: string;
}

export type LifeContext =
  | NewBabyContext
  | PregnancyContext
  | DietChangeContext
  | StressEventContext
  | IllnessContext
  | TravelContext
  | TrainingGoalContext
  | MedicationContext
  | OtherContext;

// Metadata for UI display
export const LIFE_CONTEXT_LABELS: Record<LifeContextType, { label: string; icon: string; description: string }> = {
  new_baby: { label: 'New Baby', icon: '👶', description: 'Postpartum period affecting sleep and stress' },
  pregnancy: { label: 'Pregnancy', icon: '🤰', description: 'Pregnancy-related changes to metrics' },
  diet_change: { label: 'Diet Change', icon: '🥗', description: 'Recent dietary changes' },
  stress_event: { label: 'Stress Event', icon: '😰', description: 'Major life stressor' },
  illness: { label: 'Illness/Recovery', icon: '🤒', description: 'Illness or recovery period' },
  travel: { label: 'Travel', icon: '✈️', description: 'Timezone changes or travel' },
  training_goal: { label: 'Training Goal', icon: '🎯', description: 'Upcoming event or competition' },
  medication: { label: 'Medication', icon: '💊', description: 'New or changed medication' },
  other: { label: 'Other', icon: '📝', description: 'Other relevant context' },
};

export interface AnalysisRequest {
  userId: string;
  healthData: GarminHealthData;
  useAdvancedModel?: boolean; // If true and paid tier, use advanced mode
  customPrompt?: string;
  lifeContexts?: LifeContext[];
}

export interface AnalysisResponse {
  model: string;
  analysis: string;
  structured?: StructuredAnalysis;
  tokensUsed?: number;
}

// Chat types for conversation continuation
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  userId: string;
  reportId: string;
  healthData: GarminHealthData;
  useAdvancedModel?: boolean;
  messages: ChatMessage[];
}

export interface ChatResponse {
  model: string;
  message: string;
  tokensUsed?: number;
}

// Daily Insight types - separate LLM call for comparing last day to averages
export interface DailyInsightComparison {
  metric: 'sleep' | 'stress' | 'heartRate' | 'bodyBattery' | 'activity';
  lastDayValue: string;
  periodAverage: string;
  trend: 'better' | 'worse' | 'same';
  insight: string;
}

export interface DailyInsightData {
  lastDay: {
    date: string;
    summary: string;
  };
  comparisons: DailyInsightComparison[];
  headline: string;
  topInsight: string;
  quickTips: string[];
  moodEmoji: string;
}

export interface DailyInsightRequest {
  userId: string;
  healthData: GarminHealthData;
}

export interface DailyInsightResponse {
  model: string;
  insight: DailyInsightData | null;
  tokensUsed?: number;
  error?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// App State Types
// ============================================================================

export type WizardStep = 'config' | 'data' | 'analysis';

export interface AppConfig {
  garminCredentials: GarminCredentials | null;
}

// ============================================================================
// User Statistics Types
// ============================================================================

export interface MetricStats {
  avg: number;
  median: number;
  min: number;
  max: number;
  p25?: number;
  p75?: number;
  count: number;
}

export interface UserStatistics {
  id: string;
  calculatedAt: string;
  periodStart: string;
  periodEnd: string;
  daysIncluded: number;
  sleep: {
    durationHours: MetricStats;
    sleepScore: MetricStats;
    deepSleepPercent: MetricStats;
    remSleepPercent: MetricStats;
    restingHR: MetricStats;
  };
  stress: {
    overallLevel: MetricStats;
    highStressPercent: MetricStats;
    lowStressPercent: MetricStats;
  };
  bodyBattery: {
    charged: MetricStats;
    drained: MetricStats;
    endLevel: MetricStats;
    highestLevel: MetricStats;
  };
  heartRate: {
    resting: MetricStats;
    min: MetricStats;
    max: MetricStats;
  };
  activity: {
    dailyCalories: MetricStats;
    sessionDuration: MetricStats;
    activeDaysPerWeek: number;
    totalActivities: number;
  };
}

export interface DailyComparison {
  metric: string;
  label: string;
  todayValue: number | null;
  todayFormatted: string;
  avgValue: number;
  avgFormatted: string;
  percentDiff: number;
  trend: 'better' | 'worse' | 'same';
  unit: string;
}

export interface StatisticsCompareResult {
  comparisons: DailyComparison[];
  statisticsFrom?: {
    calculatedAt: string;
    periodStart: string;
    periodEnd: string;
    daysIncluded: number;
  };
  message?: string;
}
