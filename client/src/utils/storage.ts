/**
 * Simple encryption utilities for storing API keys in localStorage.
 *
 * Note: This is NOT cryptographically secure - it's obfuscation to prevent
 * casual inspection. For production, use a proper key vault or session-based storage.
 */

const STORAGE_KEY_PREFIX = 'gie_';
const OBFUSCATION_KEY = 'garmin-insights-engine-2024';

/**
 * Simple XOR-based obfuscation (NOT encryption!)
 */
function obfuscate(text: string): string {
  const encoded = text
    .split('')
    .map((char, i) => {
      const keyChar = OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    })
    .join('');
  return btoa(encoded);
}

function deobfuscate(text: string): string {
  const decoded = atob(text);
  return decoded
    .split('')
    .map((char, i) => {
      const keyChar = OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    })
    .join('');
}

export function storeApiKey(provider: string, apiKey: string): void {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  localStorage.setItem(key, obfuscate(apiKey));
}

export function getApiKey(provider: string): string | null {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return deobfuscate(stored);
  } catch {
    return null;
  }
}

export function removeApiKey(provider: string): void {
  const key = `${STORAGE_KEY_PREFIX}${provider}`;
  localStorage.removeItem(key);
}

export function storeSessionId(sessionId: string): void {
  sessionStorage.setItem(`${STORAGE_KEY_PREFIX}session`, sessionId);
}

export function getSessionId(): string | null {
  return sessionStorage.getItem(`${STORAGE_KEY_PREFIX}session`);
}

export function clearSession(): void {
  sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}session`);
}

// ============================================================================
// User Settings Storage (persisted per Garmin user)
// ============================================================================

export interface UserSettings {
  selectedProvider: 'openai' | 'anthropic' | 'google';
  selectedModel: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  selectedProvider: 'openai',
  selectedModel: 'gpt-5.2',
  apiKeys: {},
};

function getUserSettingsKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}user_settings_${userId}`;
}

export function storeUserSettings(userId: string, settings: UserSettings): void {
  const key = getUserSettingsKey(userId);
  // Obfuscate API keys before storing
  const toStore = {
    ...settings,
    apiKeys: {
      openai: settings.apiKeys.openai ? obfuscate(settings.apiKeys.openai) : undefined,
      anthropic: settings.apiKeys.anthropic ? obfuscate(settings.apiKeys.anthropic) : undefined,
      google: settings.apiKeys.google ? obfuscate(settings.apiKeys.google) : undefined,
    },
  };
  localStorage.setItem(key, JSON.stringify(toStore));
}

export function getUserSettings(userId: string): UserSettings {
  const key = getUserSettingsKey(userId);
  const stored = localStorage.getItem(key);
  if (!stored) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(stored);
    // Deobfuscate API keys
    return {
      selectedProvider: parsed.selectedProvider || DEFAULT_SETTINGS.selectedProvider,
      selectedModel: parsed.selectedModel || DEFAULT_SETTINGS.selectedModel,
      apiKeys: {
        openai: parsed.apiKeys?.openai ? deobfuscate(parsed.apiKeys.openai) : undefined,
        anthropic: parsed.apiKeys?.anthropic ? deobfuscate(parsed.apiKeys.anthropic) : undefined,
        google: parsed.apiKeys?.google ? deobfuscate(parsed.apiKeys.google) : undefined,
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function clearUserSettings(userId: string): void {
  const key = getUserSettingsKey(userId);
  localStorage.removeItem(key);
}

// Store current user ID for easy access
export function storeCurrentUserId(userId: string): void {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, userId);
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user`);
}

// ============================================================================
// Life Context Storage (persisted per user for analysis defaults)
// ============================================================================

import type { LifeContext } from '../types';

function getLifeContextsKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}life_contexts_${userId}`;
}

export function storeLifeContexts(userId: string, contexts: LifeContext[]): void {
  const key = getLifeContextsKey(userId);
  localStorage.setItem(key, JSON.stringify(contexts));
}

export function getLifeContexts(userId: string): LifeContext[] {
  const key = getLifeContextsKey(userId);
  const stored = localStorage.getItem(key);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as LifeContext[];
  } catch {
    return [];
  }
}

export function clearLifeContexts(userId: string): void {
  const key = getLifeContextsKey(userId);
  localStorage.removeItem(key);
}
