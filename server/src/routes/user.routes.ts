import { Router, type Request, type Response } from 'express';
import {
  getUserData,
  saveUserSettings,
  saveLifeContexts,
  isFirestoreEnabled,
  deleteUserAccount,
  saveReport,
  getReports,
  getReport,
  deleteReport,
  saveAction,
  saveActions,
  getActions,
  updateAction,
  saveStatistics,
  getLatestStatistics,
  getStatisticsHistory,
  type UserSettings,
  type LifeContext,
  type CloudReport,
  type CloudAction,
} from '../services/firestore.service.js';
import { deleteTokens } from '../services/token-storage.js';
import { calculateStatistics, compareDayToStats } from '../services/statistics.service.js';
import type { GarminHealthData } from '../types/index.js';

const router = Router();

/**
 * GET /api/user/sync-status
 * Check if cloud sync is available
 */
router.get('/sync-status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      enabled: isFirestoreEnabled(),
    },
  });
});

/**
 * POST /api/user/delete-account
 * Delete user account and all associated data
 */
router.post('/delete-account', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  // Delete Firestore data and Firebase Auth user
  const firestoreSuccess = await deleteUserAccount(userId);

  // Delete Garmin tokens (userId is email)
  await deleteTokens(userId);

  if (!firestoreSuccess) {
    res.status(500).json({ success: false, error: 'Failed to delete account' });
    return;
  }

  res.json({ success: true });
});

/**
 * POST /api/user/data
 * Get all user data (settings + life contexts)
 */
router.post('/data', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const data = await getUserData(userId);

  res.json({
    success: true,
    data: data || { settings: null, lifeContexts: [] },
  });
});

/**
 * POST /api/user/settings
 * Save user settings
 */
router.post('/settings', async (req: Request, res: Response) => {
  const { userId, settings } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const success = await saveUserSettings(userId, settings as UserSettings);

  if (!success) {
    res.status(500).json({ success: false, error: 'Failed to save settings' });
    return;
  }

  res.json({ success: true });
});

/**
 * POST /api/user/life-contexts
 * Save life contexts
 */
router.post('/life-contexts', async (req: Request, res: Response) => {
  const { userId, lifeContexts } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const success = await saveLifeContexts(userId, lifeContexts as LifeContext[]);

  if (!success) {
    res.status(500).json({ success: false, error: 'Failed to save life contexts' });
    return;
  }

  res.json({ success: true });
});

// ============================================================================
// Reports Routes
// ============================================================================

/**
 * POST /api/user/reports
 * Get all reports for a user
 */
router.post('/reports', async (req: Request, res: Response) => {
  const { userId, limit } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const reports = await getReports(userId, limit || 20);
  res.json({ success: true, data: reports });
});

/**
 * POST /api/user/reports/get
 * Get a single report
 */
router.post('/reports/get', async (req: Request, res: Response) => {
  const { userId, reportId } = req.body;

  if (!userId || !reportId) {
    res.status(400).json({ success: false, error: 'userId and reportId required' });
    return;
  }

  const report = await getReport(userId, reportId);
  res.json({ success: true, data: report });
});

/**
 * POST /api/user/reports/save
 * Save a report
 */
router.post('/reports/save', async (req: Request, res: Response) => {
  const { userId, report } = req.body;

  if (!userId || !report) {
    res.status(400).json({ success: false, error: 'userId and report required' });
    return;
  }

  const success = await saveReport(userId, report as CloudReport);

  if (!success) {
    res.status(500).json({ success: false, error: 'Failed to save report' });
    return;
  }

  res.json({ success: true });
});

/**
 * POST /api/user/reports/delete
 * Delete a report and its actions
 */
router.post('/reports/delete', async (req: Request, res: Response) => {
  const { userId, reportId } = req.body;

  if (!userId || !reportId) {
    res.status(400).json({ success: false, error: 'userId and reportId required' });
    return;
  }

  const success = await deleteReport(userId, reportId);

  if (!success) {
    res.status(500).json({ success: false, error: 'Failed to delete report' });
    return;
  }

  res.json({ success: true });
});

// ============================================================================
// Actions Routes
// ============================================================================

/**
 * POST /api/user/actions
 * Get all actions for a user
 */
router.post('/actions', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const actions = await getActions(userId);
  res.json({ success: true, data: actions });
});

/**
 * POST /api/user/actions/save
 * Save a single action
 */
router.post('/actions/save', async (req: Request, res: Response) => {
  const { userId, action } = req.body;

  if (!userId || !action) {
    res.status(400).json({ success: false, error: 'userId and action required' });
    return;
  }

  const success = await saveAction(userId, action as CloudAction);

  if (!success) {
    res.status(500).json({ success: false, error: 'Failed to save action' });
    return;
  }

  res.json({ success: true });
});

/**
 * POST /api/user/actions/save-bulk
 * Save multiple actions at once
 */
router.post('/actions/save-bulk', async (req: Request, res: Response) => {
  const { userId, actions } = req.body;

  if (!userId || !actions) {
    res.status(400).json({ success: false, error: 'userId and actions required' });
    return;
  }

  const success = await saveActions(userId, actions as CloudAction[]);

  if (!success) {
    res.status(500).json({ success: false, error: 'Failed to save actions' });
    return;
  }

  res.json({ success: true });
});

/**
 * POST /api/user/actions/update
 * Update an action
 */
router.post('/actions/update', async (req: Request, res: Response) => {
  const { userId, actionId, updates } = req.body;

  if (!userId || !actionId || !updates) {
    res.status(400).json({ success: false, error: 'userId, actionId, and updates required' });
    return;
  }

  const success = await updateAction(userId, actionId, updates as Partial<CloudAction>);

  if (!success) {
    res.status(500).json({ success: false, error: 'Failed to update action' });
    return;
  }

  res.json({ success: true });
});

// ============================================================================
// Statistics Routes
// ============================================================================

/**
 * POST /api/user/statistics
 * Get latest statistics for a user
 */
router.post('/statistics', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const stats = await getLatestStatistics(userId);
  res.json({ success: true, data: stats });
});

/**
 * POST /api/user/statistics/history
 * Get statistics history for a user
 */
router.post('/statistics/history', async (req: Request, res: Response) => {
  const { userId, limit } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  const history = await getStatisticsHistory(userId, limit || 10);
  res.json({ success: true, data: history });
});

/**
 * POST /api/user/statistics/calculate
 * Calculate and save statistics from health data
 */
router.post('/statistics/calculate', async (req: Request, res: Response) => {
  const { userId, healthData } = req.body;

  if (!userId || !healthData) {
    res.status(400).json({ success: false, error: 'userId and healthData required' });
    return;
  }

  try {
    const stats = calculateStatistics(healthData as GarminHealthData);
    const success = await saveStatistics(userId, stats);

    if (!success) {
      res.status(500).json({ success: false, error: 'Failed to save statistics' });
      return;
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Failed to calculate statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate statistics' });
  }
});

/**
 * POST /api/user/statistics/compare
 * Compare today's data against stored statistics
 */
router.post('/statistics/compare', async (req: Request, res: Response) => {
  const { userId, todayData } = req.body;

  if (!userId || !todayData) {
    res.status(400).json({ success: false, error: 'userId and todayData required' });
    return;
  }

  try {
    const stats = await getLatestStatistics(userId);
    if (!stats) {
      res.json({
        success: true,
        data: { comparisons: [], message: 'No stored statistics available' },
      });
      return;
    }

    const comparisons = compareDayToStats(todayData as GarminHealthData, stats);
    res.json({
      success: true,
      data: {
        comparisons,
        statisticsFrom: {
          calculatedAt: stats.calculatedAt,
          periodStart: stats.periodStart,
          periodEnd: stats.periodEnd,
          daysIncluded: stats.daysIncluded,
        },
      },
    });
  } catch (error) {
    console.error('Failed to compare statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to compare statistics' });
  }
});

export default router;
