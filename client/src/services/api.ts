import type {
  ApiResponse,
  GarminCredentials,
  GarminSession,
  GarminHealthData,
  LLMProvider,
  AnalysisResponse,
  ModelRegistry,
} from '../types';
import { getSessionId, storeSessionId } from '../utils/storage';

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

  // Store the session ID for future requests
  if (session.sessionId) {
    storeSessionId(session.sessionId);
  }

  return session;
}

export async function submitMFACode(mfaSessionId: string, code: string): Promise<GarminSession> {
  const session = await apiFetch<GarminSession>('/garmin/mfa', {
    method: 'POST',
    body: JSON.stringify({ mfaSessionId, code }),
  });

  if (session.sessionId) {
    storeSessionId(session.sessionId);
  }

  return session;
}

export async function logoutFromGarmin(): Promise<void> {
  await apiFetch('/garmin/logout', { method: 'POST' });
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
    }),
  });
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch<{ status: string; timestamp: string }>('/health');
}
