/**
 * Storage utilities for PulseLogic client.
 *
 * Note: With the simplified tier system, API keys are now managed server-side.
 * This file handles session storage, user preferences, and life contexts.
 */

const STORAGE_KEY_PREFIX = 'gie_';

export function storeSessionId(sessionId: string): void {
  // Use localStorage for persistent sessions across browser restarts
  localStorage.setItem(`${STORAGE_KEY_PREFIX}session`, sessionId);
}

export function getSessionId(): string | null {
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}session`);
}

export function clearSession(): void {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}session`);
}

// ============================================================================
// Garmin Auth Persistence (for session restore without MFA)
// ============================================================================

export function storeGarminEmail(email: string): void {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}garmin_email`, email);
}

export function getGarminEmail(): string | null {
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}garmin_email`);
}

export function clearGarminAuth(): void {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}session`);
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}garmin_email`);
}

// ============================================================================
// User Settings Storage (persisted per Garmin user)
// Note: With simplified tiers, LLM API keys are server-managed.
// User settings now only include model preferences.
// ============================================================================

export interface UserSettings {
  preferAdvancedModel?: boolean; // User prefers advanced mode when available (paid tier)
}

const DEFAULT_SETTINGS: UserSettings = {
  preferAdvancedModel: false,
};

function getUserSettingsKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}user_settings_${userId}`;
}

export function storeUserSettings(userId: string, settings: UserSettings): void {
  const key = getUserSettingsKey(userId);
  localStorage.setItem(key, JSON.stringify(settings));
}

export function getUserSettings(userId: string): UserSettings {
  const key = getUserSettingsKey(userId);
  const stored = localStorage.getItem(key);
  if (!stored) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(stored);
    return {
      preferAdvancedModel: parsed.preferAdvancedModel ?? DEFAULT_SETTINGS.preferAdvancedModel,
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
