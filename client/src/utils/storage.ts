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
