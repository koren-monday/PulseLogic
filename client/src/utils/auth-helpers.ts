import { clearAllAuthData } from './storage';
import { clearAllData } from '../services/storage.service';
import { firebaseSignOut } from '../config/firebase';
import { logoutFromPurchases } from '../services/purchases';
import { logoutFromGarmin } from '../services/api';

/**
 * Timeout wrapper for async operations.
 * Returns null if operation doesn't complete within the timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

/**
 * Perform complete logout from all services.
 *
 * This function ensures local state is cleared immediately, then attempts
 * to clean up remote sessions with timeouts. Even if remote calls fail,
 * the user will be logged out locally.
 *
 * @returns Promise that resolves when local cleanup is complete
 */
export async function performLogout(): Promise<void> {
  // Step 1: Clear local storage immediately (synchronous)
  clearAllAuthData();

  // Step 2: Clear IndexedDB (local async, should be fast)
  try {
    await clearAllData();
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
    // Continue anyway - this is local cleanup
  }

  // Step 3: Fire-and-forget remote logout calls with timeouts
  // These run in parallel and won't block the logout flow
  const remoteCleanup = Promise.all([
    withTimeout(firebaseSignOut(), 3000).catch((error) => {
      console.warn('Firebase sign out failed or timed out:', error);
    }),
    withTimeout(logoutFromPurchases(), 3000).catch((error) => {
      console.warn('RevenueCat logout failed or timed out:', error);
    }),
    withTimeout(logoutFromGarmin(false), 3000).catch((error) => {
      console.warn('Garmin logout failed or timed out:', error);
    }),
  ]);

  // Don't await remote cleanup - let it happen in background
  remoteCleanup.catch(() => {
    // Ignore errors - we've already logged out locally
  });

  // Return immediately after local cleanup
  return Promise.resolve();
}

/**
 * Validate session with the server.
 * Returns true if session is still valid on the server.
 */
export async function validateSessionWithServer(): Promise<boolean> {
  try {
    const response = await withTimeout(
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/garmin/status`, {
        headers: {
          'X-Garmin-Session': localStorage.getItem('gie_session') || '',
        },
      }),
      5000
    );

    if (!response) {
      // Timeout
      return false;
    }

    const data = await response.json();
    return data.success && data.data?.authenticated === true;
  } catch {
    return false;
  }
}
