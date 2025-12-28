import { z } from 'zod';

// ============================================================================
// Garmin Types
// ============================================================================

export interface GarminCredentials {
  username: string;
  password: string;
}

export interface GarminSession {
  isAuthenticated: boolean;
  displayName?: string;
  userId?: string;
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
// LLM Types
// ============================================================================

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

export interface AnalysisRequest {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  customPrompt?: string;
}

export interface AnalysisResponse {
  provider: LLMProvider;
  model: string;
  analysis: string;
  tokensUsed?: number;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const GarminLoginSchema = z.object({
  username: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

export const AnalyzeRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']),
  apiKey: z.string().min(1, 'API key required'),
  healthData: z.object({
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }),
    sleep: z.array(z.any()),
    stress: z.array(z.any()),
    bodyBattery: z.array(z.any()),
    activities: z.array(z.any()),
    heartRate: z.array(z.any()),
  }),
  model: z.string().optional(),
  customPrompt: z.string().optional(),
});

export const FetchDataRequestSchema = z.object({
  days: z.number().min(1).max(30).default(7),
});

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
