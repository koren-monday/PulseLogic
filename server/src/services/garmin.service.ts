import GarminConnectPkg from '@gooin/garmin-connect';
const { GarminConnect, MFAManager } = GarminConnectPkg;
import { randomUUID } from 'crypto';
import path from 'path';
import { getDateRange } from '../utils/dates.js';
import { saveTokens, loadTokens, deleteTokens } from './token-storage.js';
import type {
  GarminCredentials,
  GarminSession,
  GarminHealthData,
  SleepData,
  StressData,
  BodyBatteryData,
  ActivityData,
  HeartRateData,
} from '../types/index.js';

// Type for the GarminConnect client instance
type GarminConnectClient = InstanceType<typeof GarminConnect>;

// Store pending MFA sessions
interface PendingMFASession {
  credentials: GarminCredentials;
  sessionId: string;
  createdAt: number;
  loginPromise?: Promise<GarminConnectClient>;
}

const pendingMFASessions = new Map<string, PendingMFASession>();

// Cleanup old MFA sessions (older than 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of pendingMFASessions) {
    if (now - session.createdAt > 5 * 60 * 1000) {
      pendingMFASessions.delete(sessionId);
    }
  }
}, 60 * 1000);

export interface LoginResult {
  success: boolean;
  requiresMFA?: boolean;
  mfaSessionId?: string;
  session?: GarminSession;
  error?: string;
}

/**
 * GarminService handles authentication and data fetching from Garmin Connect.
 * Supports MFA (Multi-Factor Authentication) flow.
 */
export class GarminService {
  private client: GarminConnectClient | null = null;
  private mfaStorageDir: string;
  private userEmail: string | null = null;

  constructor() {
    // Use a temp directory for MFA session storage
    this.mfaStorageDir = path.join(process.cwd(), '.mfa-sessions');
  }

  /**
   * Initial login attempt. If MFA is required, returns mfaSessionId for code submission.
   *
   * Flow:
   * 1. Try login WITHOUT MFA config first (for non-MFA accounts)
   * 2. If that fails with MFA-specific error, start MFA flow
   * 3. If it fails with other errors, return error
   */
  async login(credentials: GarminCredentials): Promise<LoginResult> {
    // Step 1: Try simple login without MFA config (for accounts without MFA)
    try {
      this.client = new GarminConnect({
        username: credentials.username,
        password: credentials.password,
      });

      await this.client.login();

      // Login succeeded without MFA - store email and persist tokens
      this.userEmail = credentials.username;
      await this.persistTokens();

      const userProfile = await this.client.getUserProfile();

      return {
        success: true,
        session: {
          isAuthenticated: true,
          displayName: userProfile?.displayName ?? userProfile?.fullName ?? credentials.username,
          userId: userProfile?.profileId?.toString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';

      // Check if this is an MFA-required error
      const isMFARequired = message.includes('MFA') ||
                            message.includes('mfa') ||
                            message.includes('Ticket not found') ||
                            message.includes('verification') ||
                            message.includes('two-factor');

      if (!isMFARequired) {
        // Not an MFA error - it's a genuine auth failure
        this.client = null;
        return {
          success: false,
          error: `Garmin login failed: ${message}`,
        };
      }

      // Step 2: MFA is required - start MFA flow
      console.log('[GarminService] MFA required, starting MFA flow');

      const mfaSessionId = randomUUID();

      // Store the pending session
      pendingMFASessions.set(mfaSessionId, {
        credentials,
        sessionId: mfaSessionId,
        createdAt: Date.now(),
      });

      // Start the login process with MFA support in background
      this.startMFALogin(mfaSessionId, credentials);

      return {
        success: false,
        requiresMFA: true,
        mfaSessionId,
      };
    }
  }

  /**
   * Start login with MFA support (runs in background waiting for code)
   */
  private startMFALogin(mfaSessionId: string, credentials: GarminCredentials): void {
    const client = new GarminConnect({
      username: credentials.username,
      password: credentials.password,
      mfa: {
        type: 'file',
        dir: this.mfaStorageDir,
      },
    });

    const session = pendingMFASessions.get(mfaSessionId);
    if (session) {
      // Start login with session ID - this will wait for MFA code
      session.loginPromise = client.login(credentials.username, credentials.password, mfaSessionId)
        .then(() => {
          this.client = client;
          return client;
        });
    }
  }

  /**
   * Submit MFA code and complete login
   */
  async submitMFACode(mfaSessionId: string, code: string): Promise<LoginResult> {
    const session = pendingMFASessions.get(mfaSessionId);
    if (!session) {
      return {
        success: false,
        error: 'MFA session expired or not found. Please try logging in again.',
      };
    }

    try {
      // Get the MFA manager and submit the code
      const mfaManager = MFAManager.getInstance({
        type: 'file',
        dir: this.mfaStorageDir,
      });

      const submitted = await mfaManager.submitMFACode(mfaSessionId, code);
      if (!submitted) {
        return {
          success: false,
          error: 'Failed to submit MFA code. Please try again.',
        };
      }

      // Wait for the login to complete
      if (session.loginPromise) {
        const client = await session.loginPromise;
        this.client = client;

        // Store email and persist tokens for session restoration
        this.userEmail = session.credentials.username;
        await this.persistTokens();

        // Get user profile
        const userProfile = await this.client.getUserProfile();

        // Clean up the pending session
        pendingMFASessions.delete(mfaSessionId);

        return {
          success: true,
          session: {
            isAuthenticated: true,
            displayName: userProfile?.displayName ?? userProfile?.fullName ?? session.credentials.username,
            userId: userProfile?.profileId?.toString(),
          },
        };
      }

      return {
        success: false,
        error: 'Login session not found.',
      };
    } catch (error) {
      pendingMFASessions.delete(mfaSessionId);
      const message = error instanceof Error ? error.message : 'MFA verification failed';
      return {
        success: false,
        error: `MFA verification failed: ${message}`,
      };
    }
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.client !== null;
  }

  /**
   * Logout and clear the client session
   */
  logout(clearStoredTokens = false): void {
    if (clearStoredTokens && this.userEmail) {
      deleteTokens(this.userEmail).catch(() => {});
    }
    this.client = null;
    this.userEmail = null;
  }

  /**
   * Persist OAuth tokens to storage for session restoration
   */
  private async persistTokens(): Promise<void> {
    if (!this.client || !this.userEmail) return;

    try {
      const oauth1 = this.client.client.oauth1Token;
      const oauth2 = this.client.client.oauth2Token;

      if (oauth1 && oauth2) {
        await saveTokens(this.userEmail, { oauth1, oauth2 });
        console.log('[GarminService] Tokens persisted for session restoration');
      }
    } catch (error) {
      console.error('[GarminService] Failed to persist tokens:', error);
    }
  }

  /**
   * Restore session from stored tokens (no MFA required)
   */
  async restoreSession(email: string): Promise<LoginResult> {
    try {
      const tokens = await loadTokens(email);
      if (!tokens) {
        return { success: false, error: 'No stored session found' };
      }

      // Create client and load tokens
      this.client = new GarminConnect({
        username: email,
        password: '', // Not needed when restoring from tokens
      });

      this.client.loadToken(tokens.oauth1, tokens.oauth2);
      this.userEmail = email;

      // Verify the session works by fetching user profile
      const userProfile = await this.client.getUserProfile();

      // Re-persist tokens (they may have been refreshed)
      await this.persistTokens();

      return {
        success: true,
        session: {
          isAuthenticated: true,
          displayName: userProfile?.displayName ?? userProfile?.fullName ?? email,
          userId: userProfile?.profileId?.toString(),
        },
      };
    } catch (error) {
      // Session restore failed - clear invalid tokens
      await deleteTokens(email);
      this.client = null;
      this.userEmail = null;

      const message = error instanceof Error ? error.message : 'Session restore failed';
      return { success: false, error: message };
    }
  }

  /**
   * Get current user email (for token operations)
   */
  getUserEmail(): string | null {
    return this.userEmail;
  }

  /**
   * Fetch comprehensive health data for the specified number of days.
   */
  async fetchHealthData(days: number = 7): Promise<GarminHealthData> {
    if (!this.client) {
      throw new Error('Not authenticated. Please login first.');
    }

    const { start, end, dates } = getDateRange(days);

    // Fetch sleep data first as it contains stress and body battery info
    const sleepDataRaw = await this.fetchSleepDataRaw(dates);

    // Extract sleep, stress, and body battery from the raw sleep data
    const sleepData = this.extractSleepData(sleepDataRaw);
    const stressData = this.extractStressFromSleep(sleepDataRaw);
    const bodyBatteryData = this.extractBodyBatteryFromSleep(sleepDataRaw);

    // Fetch remaining data in parallel
    const [activities, heartRateData] = await Promise.all([
      this.fetchActivities(days),
      this.fetchHeartRateData(dates),
    ]);

    // If we didn't get stress/body battery from sleep, try dedicated endpoints
    const finalStressData = stressData.length > 0 ? stressData : await this.fetchStressData(dates);
    const finalBodyBatteryData = bodyBatteryData.length > 0 ? bodyBatteryData : await this.fetchBodyBatteryData(dates);

    return {
      dateRange: { start, end },
      sleep: sleepData,
      stress: finalStressData,
      bodyBattery: finalBodyBatteryData,
      activities,
      heartRate: heartRateData,
    };
  }

  private async fetchSleepDataRaw(dates: string[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();

    for (const date of dates) {
      try {
        const dateObj = new Date(date);
        const data = await this.client!.getSleepData(dateObj);
        if (data) {
          results.set(date, data);
          console.log(`[SleepRaw] ${date}: has dailySleepDTO=${!!data.dailySleepDTO}, bodyBatteryChange=${data.bodyBatteryChange}, avgSleepStress=${data.dailySleepDTO?.avgSleepStress}`);
        }
      } catch (error) {
        console.error(`[SleepRaw] ${date} error:`, error instanceof Error ? error.message : error);
      }
    }

    return results;
  }

  private extractSleepData(rawData: Map<string, unknown>): SleepData[] {
    const results: SleepData[] = [];

    for (const [date, data] of rawData) {
      const sleepData = data as { dailySleepDTO?: Record<string, unknown>; restingHeartRate?: number };
      if (sleepData?.dailySleepDTO) {
        const dto = sleepData.dailySleepDTO;
        results.push({
          date,
          sleepTimeSeconds: (dto.sleepTimeSeconds as number) ?? 0,
          deepSleepSeconds: (dto.deepSleepSeconds as number) ?? 0,
          lightSleepSeconds: (dto.lightSleepSeconds as number) ?? 0,
          remSleepSeconds: (dto.remSleepSeconds as number) ?? 0,
          awakeSleepSeconds: (dto.awakeSleepSeconds as number) ?? 0,
          sleepScore: (dto.sleepScores as { overall?: { value?: number } })?.overall?.value ?? null,
          restingHeartRate: sleepData.restingHeartRate ?? null,
        });
      }
    }

    return results;
  }

  private extractStressFromSleep(rawData: Map<string, unknown>): StressData[] {
    const results: StressData[] = [];

    for (const [date, data] of rawData) {
      const sleepData = data as { dailySleepDTO?: { avgSleepStress?: number; sleepScores?: { stress?: { qualifierKey?: string } } } };
      if (sleepData?.dailySleepDTO?.avgSleepStress !== undefined) {
        const dto = sleepData.dailySleepDTO;
        // avgSleepStress is typically 0-100, we'll use it as the overall stress
        results.push({
          date,
          overallStressLevel: dto.avgSleepStress ?? 0,
          restStressLevel: 0,
          lowStressLevel: 0,
          mediumStressLevel: 0,
          highStressLevel: 0,
          stressQualifier: dto.sleepScores?.stress?.qualifierKey ?? 'unknown',
        });
      }
    }

    return results;
  }

  private extractBodyBatteryFromSleep(rawData: Map<string, unknown>): BodyBatteryData[] {
    const results: BodyBatteryData[] = [];

    for (const [date, data] of rawData) {
      const sleepData = data as {
        bodyBatteryChange?: number;
        sleepBodyBattery?: Array<{ value?: number; startGMT?: number }>;
      };

      if (sleepData?.bodyBatteryChange !== undefined || sleepData?.sleepBodyBattery?.length) {
        const bbArray = sleepData.sleepBodyBattery ?? [];
        const values = bbArray.map(b => b.value ?? 0).filter(v => v > 0);

        results.push({
          date,
          charged: sleepData.bodyBatteryChange ?? 0,
          drained: 0,
          startLevel: values.length > 0 ? values[0] : 0,
          endLevel: values.length > 0 ? values[values.length - 1] : 0,
          highestLevel: values.length > 0 ? Math.max(...values) : 0,
          lowestLevel: values.length > 0 ? Math.min(...values) : 0,
        });
      }
    }

    return results;
  }

  private async fetchStressData(dates: string[]): Promise<StressData[]> {
    const results: StressData[] = [];

    for (const date of dates) {
      try {
        // Try the user summary service endpoint (used by Garmin web app)
        const data = await this.client!.get<{
          calendarDate?: string;
          overallStressLevel?: number;
          restStressDuration?: number;
          lowStressDuration?: number;
          mediumStressDuration?: number;
          highStressDuration?: number;
          stressQualifier?: string;
          avgStressLevel?: number;
          maxStressLevel?: number;
        }>(`/usersummary-service/usersummary/daily/${date}?calendarDate=${date}`);

        console.log(`[Stress] ${date}:`, JSON.stringify(data).slice(0, 300));

        if (data && (data.overallStressLevel !== undefined || data.avgStressLevel !== undefined)) {
          results.push({
            date,
            overallStressLevel: data.overallStressLevel ?? data.avgStressLevel ?? 0,
            restStressLevel: data.restStressDuration ?? 0,
            lowStressLevel: data.lowStressDuration ?? 0,
            mediumStressLevel: data.mediumStressDuration ?? 0,
            highStressLevel: data.highStressDuration ?? 0,
            stressQualifier: data.stressQualifier ?? 'unknown',
          });
        }
      } catch (error) {
        console.error(`[Stress] ${date} error:`, error instanceof Error ? error.message : error);
      }
    }

    return results;
  }

  private async fetchBodyBatteryData(dates: string[]): Promise<BodyBatteryData[]> {
    const results: BodyBatteryData[] = [];

    // Fetch all body battery data at once using date range with query params
    if (dates.length === 0) return results;

    const startDate = dates[dates.length - 1]; // Earliest date
    const endDate = dates[0]; // Latest date

    try {
      // Use query parameters as the API expects
      const data = await this.client!.get<Array<{
        date?: string;
        charged?: number;
        drained?: number;
        startTimestampGMT?: number;
        endTimestampGMT?: number;
        startTimestampLocal?: number;
        endTimestampLocal?: number;
      }>>(`/wellness-service/wellness/bodyBattery/reports/daily?startDate=${startDate}&endDate=${endDate}`);

      console.log(`[BodyBattery] range ${startDate} to ${endDate}:`, JSON.stringify(data).slice(0, 500));

      if (Array.isArray(data)) {
        for (const dayData of data) {
          if (dayData.date) {
            results.push({
              date: dayData.date,
              charged: dayData.charged ?? 0,
              drained: dayData.drained ?? 0,
              startLevel: 0,
              endLevel: 0,
              highestLevel: 0,
              lowestLevel: 0,
            });
          }
        }
      }
    } catch (error) {
      console.error(`[BodyBattery] range error:`, error instanceof Error ? error.message : error);

      // Fallback: try individual date requests with events endpoint
      for (const date of dates) {
        try {
          const eventData = await this.client!.get<{
            date?: string;
            bodyBatteryStatList?: Array<{
              statsType?: string;
              statsValue?: number;
            }>;
          }>(`/wellness-service/wellness/bodyBattery/events/${date}`);

          console.log(`[BodyBattery events] ${date}:`, JSON.stringify(eventData).slice(0, 300));

          if (eventData) {
            const stats = eventData.bodyBatteryStatList ?? [];
            const getValue = (type: string): number => {
              const stat = stats.find((s) => s.statsType === type);
              return stat?.statsValue ?? 0;
            };

            results.push({
              date,
              charged: getValue('charged') || getValue('CHARGED'),
              drained: getValue('drained') || getValue('DRAINED'),
              startLevel: getValue('startLevel') || getValue('START'),
              endLevel: getValue('endLevel') || getValue('END'),
              highestLevel: getValue('highest') || getValue('MAX'),
              lowestLevel: getValue('lowest') || getValue('MIN'),
            });
          }
        } catch (eventError) {
          console.error(`[BodyBattery events] ${date} error:`, eventError instanceof Error ? eventError.message : eventError);
        }
      }
    }

    return results;
  }

  private async fetchActivities(days: number): Promise<ActivityData[]> {
    try {
      const activities = await this.client!.getActivities(0, days * 3);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return (activities ?? [])
        .filter((a: { startTimeLocal?: string }) => {
          if (!a.startTimeLocal) return false;
          return new Date(a.startTimeLocal) >= cutoffDate;
        })
        .map((a: {
          activityId?: number;
          activityName?: string;
          activityType?: { typeKey?: string };
          startTimeLocal?: string;
          duration?: number;
          distance?: number;
          calories?: number;
          averageHR?: number;
          maxHR?: number;
          averageSpeed?: number;
        }) => ({
          activityId: a.activityId ?? 0,
          activityName: a.activityName ?? 'Unnamed Activity',
          activityType: a.activityType?.typeKey ?? 'unknown',
          startTimeLocal: a.startTimeLocal ?? '',
          duration: a.duration ?? 0,
          distance: a.distance ?? null,
          calories: a.calories ?? 0,
          averageHR: a.averageHR ?? null,
          maxHR: a.maxHR ?? null,
          averageSpeed: a.averageSpeed ?? null,
        }));
    } catch {
      return [];
    }
  }

  private async fetchHeartRateData(dates: string[]): Promise<HeartRateData[]> {
    const results: HeartRateData[] = [];

    for (const date of dates) {
      try {
        const dateObj = new Date(date);
        const data = await this.client!.getHeartRate(dateObj);
        if (data) {
          results.push({
            date,
            restingHeartRate: data.restingHeartRate ?? 0,
            minHeartRate: data.minHeartRate ?? 0,
            maxHeartRate: data.maxHeartRate ?? 0,
          });
        }
      } catch {
        // Skip days without heart rate data
      }
    }

    return results;
  }
}

// Singleton instance
export const garminService = new GarminService();
