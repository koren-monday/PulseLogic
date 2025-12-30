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
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  customPrompt?: string;
  lifeContexts?: LifeContext[];
}

export interface AnalysisResponse {
  provider: LLMProvider;
  model: string;
  analysis: string;
  tokensUsed?: number;
}

// Chat types for conversation continuation
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  provider: LLMProvider;
  model: string;
  message: string;
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
