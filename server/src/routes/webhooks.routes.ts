import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import { updateUserSubscription } from '../services/firestore.service.js';

const router = Router();

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

/**
 * Verify RevenueCat webhook signature.
 * See: https://www.revenuecat.com/docs/webhooks#signature-verification
 */
function verifyRevenueCatSignature(payload: string, signature: string | undefined): boolean {
  if (!REVENUECAT_WEBHOOK_SECRET || !signature) {
    // If no secret configured, skip verification (dev mode)
    console.warn('RevenueCat webhook secret not configured - skipping verification');
    return true;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * RevenueCat webhook event types we care about.
 */
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'SUBSCRIBER_ALIAS';

interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  is_sandbox?: boolean;
  store?: string;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

/**
 * POST /webhooks/revenuecat
 * Handle subscription events from RevenueCat.
 */
router.post(
  '/revenuecat',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get raw body for signature verification
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers['x-revenuecat-signature'] as string | undefined;

      // Verify signature
      if (!verifyRevenueCatSignature(rawBody, signature)) {
        console.error('Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const payload = req.body as RevenueCatWebhookPayload;
      const { event } = payload;

      if (!event || !event.app_user_id) {
        console.error('Invalid webhook payload - missing event or app_user_id');
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      // The app_user_id is the Firebase UID we set when logging in to RevenueCat
      const userId = event.app_user_id;
      const eventType = event.type;

      console.log(`RevenueCat webhook: ${eventType} for user ${userId}`);

      // Skip sandbox events in production
      if (process.env.NODE_ENV === 'production' && event.is_sandbox) {
        console.log('Skipping sandbox event in production');
        res.json({ success: true, skipped: true });
        return;
      }

      // Handle event types
      switch (eventType) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'UNCANCELLATION':
          // Grant pro access
          await updateUserSubscription(userId, {
            tier: 'paid',
            status: 'active',
            currentPeriodEnd: event.expiration_at_ms
              ? new Date(event.expiration_at_ms).toISOString()
              : undefined,
          });
          console.log(`User ${userId} upgraded to paid tier`);
          break;

        case 'CANCELLATION':
          // User cancelled but may still have access until period ends
          await updateUserSubscription(userId, {
            status: 'cancelled',
            cancelAtPeriodEnd: true,
            currentPeriodEnd: event.expiration_at_ms
              ? new Date(event.expiration_at_ms).toISOString()
              : undefined,
          });
          console.log(`User ${userId} subscription cancelled (active until period end)`);
          break;

        case 'EXPIRATION':
        case 'BILLING_ISSUE':
          // Subscription has ended - revert to free tier
          await updateUserSubscription(userId, {
            tier: 'free',
            status: eventType === 'BILLING_ISSUE' ? 'past_due' : 'active',
            currentPeriodEnd: undefined,
            cancelAtPeriodEnd: undefined,
          });
          console.log(`User ${userId} reverted to free tier (${eventType})`);
          break;

        case 'PRODUCT_CHANGE':
          // User changed subscription plan - handled by RENEWAL
          console.log(`User ${userId} changed subscription plan`);
          break;

        case 'SUBSCRIBER_ALIAS':
          // User aliases merged - no action needed
          console.log(`User ${userId} aliases merged`);
          break;

        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      next(error);
    }
  }
);

export default router;
