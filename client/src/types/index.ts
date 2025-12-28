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
// LLM Types
// ============================================================================

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface ProviderConfig {
  name: string;
  models: ModelInfo[];
  defaultModel: string;
}

export type ModelRegistry = Record<LLMProvider, ProviderConfig>;

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
  llmConfigs: Partial<Record<LLMProvider, string>>;
  selectedProvider: LLMProvider;
  selectedModels: Partial<Record<LLMProvider, string>>;
}
