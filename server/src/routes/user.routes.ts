import { Router, type Request, type Response } from 'express';
import {
  getUserData,
  saveUserSettings,
  saveLifeContexts,
  isFirestoreEnabled,
  saveReport,
  getReports,
  getReport,
  deleteReport,
  saveAction,
  saveActions,
  getActions,
  updateAction,
  type UserSettings,
  type LifeContext,
  type CloudReport,
  type CloudAction,
} from '../services/firestore.service.js';

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

export default router;
