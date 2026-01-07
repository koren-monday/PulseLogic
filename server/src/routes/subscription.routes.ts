import { Router, type Request, type Response } from 'express';
import {
  getTierInfoForClient,
  canCreateReport,
  canSendChatMessage,
  canUseSnapshot,
  getMaxDataDays,
} from '../services/usage.service.js';
import {
  getUserSubscription,
  setUserSubscription,
  getUserProfile,
  syncRevenueCatSubscription,
} from '../services/firestore.service.js';
import { hasServerKeys, AVAILABLE_MODELS } from '../services/llm/models.js';
import type { SubscriptionTier } from '../types/subscription.js';

// Admin secret is read at runtime to ensure dotenv has loaded
const getAdminSecret = () => process.env.ADMIN_SECRET || '';

const router = Router();

/**
 * POST /api/subscription/tier
 * Get the user's effective tier information including limits and usage
 */
router.post('/tier', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  try {
    console.log(`[/tier] Fetching subscription for user: ${userId}`);

    // Get current subscription from Firestore
    let subscription = await getUserSubscription(userId);
    console.log(`[/tier] Firestore subscription:`, subscription);

    // Sync with RevenueCat to ensure we have the latest data
    // This helps catch cases where webhooks failed or user was just upgraded
    const syncedSubscription = await syncRevenueCatSubscription(userId);
    if (syncedSubscription) {
      subscription = syncedSubscription;
      console.log(`[/tier] Synced with RevenueCat:`, subscription);
    }

    const tierInfo = await getTierInfoForClient(userId);

    res.json({
      success: true,
      data: {
        ...tierInfo,
        subscription: {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
        serverReady: hasServerKeys(),
        availableModels: AVAILABLE_MODELS,
      },
    });
  } catch (error) {
    console.error('Failed to get tier info:', error);
    res.status(500).json({ success: false, error: 'Failed to get subscription info' });
  }
});

/**
 * POST /api/subscription/check-report
 * Check if user can create a report
 */
router.post('/check-report', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  try {
    const result = await canCreateReport(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to check report limit:', error);
    res.status(500).json({ success: false, error: 'Failed to check limit' });
  }
});

/**
 * POST /api/subscription/check-chat
 * Check if user can send a chat message for a specific report
 */
router.post('/check-chat', async (req: Request, res: Response) => {
  const { userId, reportId } = req.body;

  if (!userId || !reportId) {
    res.status(400).json({ success: false, error: 'userId and reportId required' });
    return;
  }

  try {
    const result = await canSendChatMessage(userId, reportId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to check chat limit:', error);
    res.status(500).json({ success: false, error: 'Failed to check limit' });
  }
});

/**
 * POST /api/subscription/check-snapshot
 * Check if user can use the daily snapshot
 */
router.post('/check-snapshot', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  try {
    const result = await canUseSnapshot(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to check snapshot limit:', error);
    res.status(500).json({ success: false, error: 'Failed to check limit' });
  }
});

/**
 * POST /api/subscription/max-days
 * Get maximum data days allowed for user's tier
 */
router.post('/max-days', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }

  try {
    const maxDays = await getMaxDataDays(userId);
    res.json({ success: true, data: { maxDays } });
  } catch (error) {
    console.error('Failed to get max days:', error);
    res.status(500).json({ success: false, error: 'Failed to get max days' });
  }
});

/**
 * POST /api/subscription/admin/set-tier
 * Admin endpoint to manually set a user's subscription tier
 * Requires ADMIN_SECRET in x-admin-secret header
 */
router.post('/admin/set-tier', async (req: Request, res: Response) => {
  const adminSecret = req.headers['x-admin-secret'] as string;
  const secret = getAdminSecret();

  if (!secret || adminSecret !== secret) {
    res.status(403).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { userId, tier } = req.body as { userId: string; tier: SubscriptionTier };

  if (!userId || !tier) {
    res.status(400).json({ success: false, error: 'userId and tier required' });
    return;
  }

  if (tier !== 'free' && tier !== 'paid') {
    res.status(400).json({ success: false, error: 'tier must be "free" or "paid"' });
    return;
  }

  try {
    // Get user profile and existing subscription
    const [profile, existingSubscription] = await Promise.all([
      getUserProfile(userId),
      getUserSubscription(userId),
    ]);

    // Update subscription while preserving existing fields
    const now = new Date().toISOString();
    await setUserSubscription(userId, {
      ...existingSubscription,
      tier,
      status: 'active',
      updatedAt: now,
      createdAt: existingSubscription.createdAt || now,
    });

    res.json({
      success: true,
      data: {
        userId,
        tier,
        email: profile?.email || 'unknown',
        message: `User tier set to ${tier}`,
      },
    });
  } catch (error) {
    console.error('Failed to set user tier:', error);
    res.status(500).json({ success: false, error: 'Failed to set tier' });
  }
});

/**
 * GET /api/subscription/admin/user/:userId
 * Admin endpoint to get user info including email and subscription
 */
router.get('/admin/user/:userId', async (req: Request, res: Response) => {
  const adminSecret = req.headers['x-admin-secret'] as string;
  const secret = getAdminSecret();

  if (!secret || adminSecret !== secret) {
    res.status(403).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { userId } = req.params;

  try {
    const [profile, subscription] = await Promise.all([
      getUserProfile(userId),
      getUserSubscription(userId),
    ]);

    res.json({
      success: true,
      data: {
        userId,
        email: profile?.email || 'unknown',
        displayName: profile?.displayName,
        createdAt: profile?.createdAt,
        lastLoginAt: profile?.lastLoginAt,
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get user info:', error);
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
});

export default router;
