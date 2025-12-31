import { Router, type Request, type Response } from 'express';
import {
  getUserData,
  saveUserSettings,
  saveLifeContexts,
  isFirestoreEnabled,
  type UserSettings,
  type LifeContext,
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

export default router;
