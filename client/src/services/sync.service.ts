import {
  checkSyncStatus,
  fetchCloudUserData,
  saveCloudSettings,
  saveCloudLifeContexts,
  type CloudUserSettings,
} from './api';
import {
  getUserSettings,
  storeUserSettings,
  getLifeContexts,
  storeLifeContexts,
  type UserSettings,
} from '../utils/storage';
import type { LifeContext } from '../types';

let syncEnabled: boolean | null = null;

// Check if cloud sync is available
export async function isSyncEnabled(): Promise<boolean> {
  if (syncEnabled !== null) return syncEnabled;

  try {
    const status = await checkSyncStatus();
    syncEnabled = status.enabled;
    return syncEnabled;
  } catch {
    syncEnabled = false;
    return false;
  }
}

// Sync user data from cloud on login
export async function syncOnLogin(userId: string): Promise<UserSettings> {
  const localSettings = getUserSettings(userId);
  const localContexts = getLifeContexts(userId);

  if (!(await isSyncEnabled())) {
    return localSettings;
  }

  try {
    const cloudData = await fetchCloudUserData(userId);

    // If cloud has data, prefer it (cloud is source of truth)
    if (cloudData.settings) {
      const mergedSettings: UserSettings = {
        selectedProvider: cloudData.settings.provider || localSettings.selectedProvider,
        selectedModel: cloudData.settings.model || localSettings.selectedModel,
        apiKeys: {
          ...localSettings.apiKeys,
          ...cloudData.settings.apiKeys,
        },
      };

      // Save merged to local
      storeUserSettings(userId, mergedSettings);

      // Sync life contexts if cloud has them
      if (cloudData.lifeContexts && cloudData.lifeContexts.length > 0) {
        storeLifeContexts(userId, cloudData.lifeContexts as LifeContext[]);
      } else if (localContexts.length > 0) {
        // Push local contexts to cloud if cloud is empty
        await saveCloudLifeContexts(userId, localContexts);
      }

      return mergedSettings;
    } else if (hasAnySettings(localSettings)) {
      // Cloud is empty but local has data - push to cloud
      await pushSettingsToCloud(userId, localSettings);
      if (localContexts.length > 0) {
        await saveCloudLifeContexts(userId, localContexts);
      }
    }

    return localSettings;
  } catch (error) {
    console.warn('Cloud sync failed, using local data:', error);
    return localSettings;
  }
}

// Push settings to cloud (call after local save)
export async function pushSettingsToCloud(userId: string, settings: UserSettings): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    const cloudSettings: CloudUserSettings = {
      provider: settings.selectedProvider,
      model: settings.selectedModel,
      apiKeys: settings.apiKeys,
    };
    await saveCloudSettings(userId, cloudSettings);
  } catch (error) {
    console.warn('Failed to sync settings to cloud:', error);
  }
}

// Push life contexts to cloud
export async function pushLifeContextsToCloud(userId: string, contexts: LifeContext[]): Promise<void> {
  if (!(await isSyncEnabled())) return;

  try {
    await saveCloudLifeContexts(userId, contexts);
  } catch (error) {
    console.warn('Failed to sync life contexts to cloud:', error);
  }
}

function hasAnySettings(settings: UserSettings): boolean {
  return Object.values(settings.apiKeys).some(Boolean);
}
