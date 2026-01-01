import type {
  ApiResponse,
  GarminCredentials,
  GarminSession,
  GarminHealthData,
  LLMProvider,
  AnalysisResponse,
  ModelRegistry,
  ChatMessage,
  ChatResponse,
  LifeContext,
  DailyInsightResponse,
  UserStatistics,
  StatisticsCompareResult,
} from '../types';
import { getSessionId, storeSessionId, storeGarminEmail, clearGarminAuth } from '../utils/storage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Base fetch wrapper with common headers and error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId && { 'X-Garmin-Session': sessionId }),
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data as T;
}

// ============================================================================
// Garmin API
// ============================================================================

export async function loginToGarmin(credentials: GarminCredentials): Promise<GarminSession> {
  const session = await apiFetch<GarminSession>('/garmin/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  // Store the session ID and email for future requests and session restore
  if (session.sessionId) {
    storeSessionId(session.sessionId);
    storeGarminEmail(credentials.username);
  }

  return session;
}

export async function submitMFACode(mfaSessionId: string, code: string, email: string): Promise<GarminSession> {
  const session = await apiFetch<GarminSession>('/garmin/mfa', {
    method: 'POST',
    body: JSON.stringify({ mfaSessionId, code }),
  });

  if (session.sessionId) {
    storeSessionId(session.sessionId);
    storeGarminEmail(email);
  }

  return session;
}

export async function logoutFromGarmin(clearStoredTokens = false): Promise<void> {
  await apiFetch('/garmin/logout', {
    method: 'POST',
    body: JSON.stringify({ clearStoredTokens }),
  });
  clearGarminAuth();
}

export async function canRestoreGarminSession(email: string): Promise<boolean> {
  try {
    const result = await apiFetch<{ canRestore: boolean }>('/garmin/can-restore', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return result.canRestore;
  } catch {
    return false;
  }
}

export async function restoreGarminSession(email: string): Promise<GarminSession | null> {
  try {
    const response = await fetch(`${API_BASE}/garmin/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.success && data.data) {
      const session = data.data as GarminSession;
      if (session.sessionId) {
        storeSessionId(session.sessionId);
        storeGarminEmail(email);
      }
      return session;
    }

    return null;
  } catch {
    return null;
  }
}

export async function checkGarminStatus(): Promise<{ authenticated: boolean }> {
  return apiFetch<{ authenticated: boolean }>('/garmin/status');
}

export async function fetchGarminData(days: number = 7): Promise<GarminHealthData> {
  return apiFetch<GarminHealthData>('/garmin/data', {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

// ============================================================================
// Analysis API
// ============================================================================

export async function fetchModelRegistry(): Promise<ModelRegistry> {
  return apiFetch<ModelRegistry>('/analyze/models');
}

export interface AnalyzeOptions {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  customPrompt?: string;
  lifeContexts?: LifeContext[];
}

export async function analyzeHealthData(options: AnalyzeOptions): Promise<AnalysisResponse> {
  return apiFetch<AnalysisResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify({
      provider: options.provider,
      apiKey: options.apiKey,
      healthData: options.healthData,
      model: options.model,
      customPrompt: options.customPrompt,
      lifeContexts: options.lifeContexts,
    }),
  });
}

export interface ChatOptions {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  messages: ChatMessage[];
}

export async function chatAboutHealth(options: ChatOptions): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/analyze/chat', {
    method: 'POST',
    body: JSON.stringify({
      provider: options.provider,
      apiKey: options.apiKey,
      healthData: options.healthData,
      model: options.model,
      messages: options.messages,
    }),
  });
}

export interface DailyInsightOptions {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
}

export async function generateDailyInsight(options: DailyInsightOptions): Promise<DailyInsightResponse> {
  return apiFetch<DailyInsightResponse>('/analyze/daily-insight', {
    method: 'POST',
    body: JSON.stringify({
      provider: options.provider,
      apiKey: options.apiKey,
      healthData: options.healthData,
      model: options.model,
    }),
  });
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch<{ status: string; timestamp: string }>('/health');
}

// ============================================================================
// Cloud Sync API
// ============================================================================

export interface CloudUserSettings {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

export interface CloudUserData {
  settings?: CloudUserSettings;
  lifeContexts?: unknown[];
  updatedAt?: string;
}

export async function checkSyncStatus(): Promise<{ enabled: boolean }> {
  return apiFetch<{ enabled: boolean }>('/user/sync-status');
}

export async function fetchCloudUserData(userId: string): Promise<CloudUserData> {
  return apiFetch<CloudUserData>('/user/data', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function saveCloudSettings(userId: string, settings: CloudUserSettings): Promise<void> {
  await apiFetch('/user/settings', {
    method: 'POST',
    body: JSON.stringify({ userId, settings }),
  });
}

export async function saveCloudLifeContexts(userId: string, lifeContexts: unknown[]): Promise<void> {
  await apiFetch('/user/life-contexts', {
    method: 'POST',
    body: JSON.stringify({ userId, lifeContexts }),
  });
}

// ============================================================================
// Cloud Reports API
// ============================================================================

export interface CloudReport {
  id: string;
  createdAt: string;
  dateRange: { start: string; end: string };
  provider: string;
  model: string;
  markdown: string;
  structured: unknown;
  lifeContexts?: LifeContext[];
  // NOTE: healthData is intentionally excluded for privacy
}

export async function fetchCloudReports(userId: string, limit = 20): Promise<CloudReport[]> {
  return apiFetch<CloudReport[]>('/user/reports', {
    method: 'POST',
    body: JSON.stringify({ userId, limit }),
  });
}

export async function fetchCloudReport(userId: string, reportId: string): Promise<CloudReport | null> {
  return apiFetch<CloudReport | null>('/user/reports/get', {
    method: 'POST',
    body: JSON.stringify({ userId, reportId }),
  });
}

export async function saveCloudReport(userId: string, report: CloudReport): Promise<void> {
  await apiFetch('/user/reports/save', {
    method: 'POST',
    body: JSON.stringify({ userId, report }),
  });
}

export async function deleteCloudReport(userId: string, reportId: string): Promise<void> {
  await apiFetch('/user/reports/delete', {
    method: 'POST',
    body: JSON.stringify({ userId, reportId }),
  });
}

// ============================================================================
// Cloud Actions API
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

export async function fetchCloudActions(userId: string): Promise<CloudAction[]> {
  return apiFetch<CloudAction[]>('/user/actions', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function saveCloudAction(userId: string, action: CloudAction): Promise<void> {
  await apiFetch('/user/actions/save', {
    method: 'POST',
    body: JSON.stringify({ userId, action }),
  });
}

export async function saveCloudActions(userId: string, actions: CloudAction[]): Promise<void> {
  await apiFetch('/user/actions/save-bulk', {
    method: 'POST',
    body: JSON.stringify({ userId, actions }),
  });
}

export async function updateCloudAction(
  userId: string,
  actionId: string,
  updates: Partial<CloudAction>
): Promise<void> {
  await apiFetch('/user/actions/update', {
    method: 'POST',
    body: JSON.stringify({ userId, actionId, updates }),
  });
}

// ============================================================================
// Statistics API
// ============================================================================

export async function fetchLatestStatistics(userId: string): Promise<UserStatistics | null> {
  return apiFetch<UserStatistics | null>('/user/statistics', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function fetchStatisticsHistory(userId: string, limit = 10): Promise<UserStatistics[]> {
  return apiFetch<UserStatistics[]>('/user/statistics/history', {
    method: 'POST',
    body: JSON.stringify({ userId, limit }),
  });
}

export async function calculateAndSaveStatistics(
  userId: string,
  healthData: GarminHealthData
): Promise<UserStatistics> {
  return apiFetch<UserStatistics>('/user/statistics/calculate', {
    method: 'POST',
    body: JSON.stringify({ userId, healthData }),
  });
}

export async function compareDayToStatistics(
  userId: string,
  todayData: GarminHealthData
): Promise<StatisticsCompareResult> {
  return apiFetch<StatisticsCompareResult>('/user/statistics/compare', {
    method: 'POST',
    body: JSON.stringify({ userId, todayData }),
  });
}
