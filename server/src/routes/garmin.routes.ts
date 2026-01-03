import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { GarminService, type LoginResult } from '../services/garmin.service.js';
import { tokensExist } from '../services/token-storage.js';
import { recordUserLogin } from '../services/firestore.service.js';
import { validate, AppError } from '../middleware/index.js';
import { GarminLoginSchema, FetchDataRequestSchema, type ApiResponse, type GarminHealthData } from '../types/index.js';
import { getMaxDataDays } from '../services/usage.service.js';

const router = Router();

// Store Garmin service instances per session (in-memory for simplicity)
interface SessionData {
  service: GarminService;
  email?: string; // Store email for recording login after MFA
}
const sessions = new Map<string, SessionData>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getSession(req: Request): { id: string; data: SessionData } {
  let sessionId = req.headers['x-garmin-session'] as string;

  if (sessionId && sessions.has(sessionId)) {
    return { id: sessionId, data: sessions.get(sessionId)! };
  }

  sessionId = generateSessionId();
  const data: SessionData = { service: new GarminService() };
  sessions.set(sessionId, data);

  return { id: sessionId, data };
}

// Response type for login that includes MFA info
interface LoginResponse {
  sessionId: string;
  isAuthenticated: boolean;
  displayName?: string;
  userId?: string;
  requiresMFA?: boolean;
  mfaSessionId?: string;
}

/**
 * POST /api/garmin/login
 * Authenticate with Garmin Connect. If MFA is required, returns mfaSessionId.
 */
router.post(
  '/login',
  validate(GarminLoginSchema),
  async (req: Request, res: Response<ApiResponse<LoginResponse>>, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const { id, data } = getSession(req);

      // Store email for later use (after MFA if needed)
      data.email = username;

      const result: LoginResult = await data.service.login({ username, password });

      if (result.success && result.session) {
        // Record login in Firestore (stores email for easy identification)
        if (result.session.userId) {
          recordUserLogin(result.session.userId, username).catch(err => {
            console.error('Failed to record login:', err);
          });
        }

        res.json({
          success: true,
          data: {
            sessionId: id,
            isAuthenticated: true,
            displayName: result.session.displayName,
            userId: result.session.userId,
          },
        });
      } else if (result.requiresMFA && result.mfaSessionId) {
        // MFA required - return session info for code submission
        res.json({
          success: true,
          data: {
            sessionId: id,
            isAuthenticated: false,
            requiresMFA: true,
            mfaSessionId: result.mfaSessionId,
          },
        });
      } else {
        throw new AppError(401, result.error || 'Login failed');
      }
    } catch (error) {
      next(error);
    }
  }
);

// Schema for MFA code submission
const MFACodeSchema = z.object({
  mfaSessionId: z.string().min(1, 'MFA session ID required'),
  code: z.string().min(4, 'MFA code required').max(10),
});

/**
 * POST /api/garmin/mfa
 * Submit MFA code to complete authentication
 */
router.post(
  '/mfa',
  validate(MFACodeSchema),
  async (req: Request, res: Response<ApiResponse<LoginResponse>>, next: NextFunction) => {
    try {
      const { mfaSessionId, code } = req.body;
      const { id, data } = getSession(req);

      const result = await data.service.submitMFACode(mfaSessionId, code);

      if (result.success && result.session) {
        // Record login in Firestore (stores email for easy identification)
        if (result.session.userId && data.email) {
          recordUserLogin(result.session.userId, data.email).catch(err => {
            console.error('Failed to record login:', err);
          });
        }

        res.json({
          success: true,
          data: {
            sessionId: id,
            isAuthenticated: true,
            displayName: result.session.displayName,
            userId: result.session.userId,
          },
        });
      } else {
        throw new AppError(401, result.error || 'MFA verification failed');
      }
    } catch (error) {
      next(error);
    }
  }
);

// Schema for session restore
const RestoreSessionSchema = z.object({
  email: z.string().email('Valid email required'),
});

/**
 * POST /api/garmin/restore
 * Restore session from stored OAuth tokens (no MFA required)
 */
router.post(
  '/restore',
  validate(RestoreSessionSchema),
  async (req: Request, res: Response<ApiResponse<LoginResponse>>, next: NextFunction) => {
    try {
      const { email } = req.body;
      const { id, data } = getSession(req);

      data.email = email;
      const result = await data.service.restoreSession(email);

      if (result.success && result.session) {
        // Record login in Firestore (stores email for easy identification)
        if (result.session.userId) {
          recordUserLogin(result.session.userId, email).catch(err => {
            console.error('Failed to record login:', err);
          });
        }

        res.json({
          success: true,
          data: {
            sessionId: id,
            isAuthenticated: true,
            displayName: result.session.displayName,
            userId: result.session.userId,
          },
        });
      } else {
        // Return success: false but not as an error - let frontend handle gracefully
        res.json({
          success: false,
          error: result.error || 'Session restore failed',
        } as ApiResponse<LoginResponse>);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Schema for checking if restore is possible
const CheckRestoreSchema = z.object({
  email: z.string().email('Valid email required'),
});

/**
 * POST /api/garmin/can-restore
 * Check if stored tokens exist for a user
 */
router.post(
  '/can-restore',
  validate(CheckRestoreSchema),
  async (req: Request, res: Response<ApiResponse<{ canRestore: boolean }>>, next: NextFunction) => {
    try {
      const { email } = req.body;
      const canRestore = await tokensExist(email);

      res.json({
        success: true,
        data: { canRestore },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/garmin/logout
 * Clear the Garmin session
 */
router.post('/logout', (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    const sessionId = req.headers['x-garmin-session'] as string;
    const clearStoredTokens = req.body?.clearStoredTokens ?? false;

    if (sessionId && sessions.has(sessionId)) {
      const sessionData = sessions.get(sessionId)!;
      sessionData.service.logout(clearStoredTokens);
      sessions.delete(sessionId);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/garmin/status
 * Check authentication status
 */
router.get('/status', (req: Request, res: Response<ApiResponse<{ authenticated: boolean }>>, next: NextFunction) => {
  try {
    const sessionId = req.headers['x-garmin-session'] as string;
    const authenticated = sessionId ? sessions.get(sessionId)?.service.isAuthenticated() ?? false : false;

    res.json({
      success: true,
      data: { authenticated },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/garmin/data
 * Fetch health data for the specified number of days
 * Enforces tier-based data range limits
 */
router.post(
  '/data',
  validate(FetchDataRequestSchema),
  async (req: Request, res: Response<ApiResponse<GarminHealthData & { cappedDays?: number }>>, next: NextFunction) => {
    try {
      const sessionId = req.headers['x-garmin-session'] as string;

      if (!sessionId || !sessions.has(sessionId)) {
        throw new AppError(401, 'Not authenticated. Please login first.');
      }

      const sessionData = sessions.get(sessionId)!;
      if (!sessionData.service.isAuthenticated()) {
        throw new AppError(401, 'Session expired. Please login again.');
      }

      let { days } = req.body;
      const { userId } = req.body;

      // Enforce tier-based data range limit
      let cappedDays: number | undefined;
      if (userId) {
        const maxDays = await getMaxDataDays(userId);
        if (days > maxDays) {
          cappedDays = maxDays;
          days = maxDays;
        }
      }

      const healthData = await sessionData.service.fetchHealthData(days);

      res.json({
        success: true,
        data: {
          ...healthData,
          ...(cappedDays !== undefined && { cappedDays }),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
