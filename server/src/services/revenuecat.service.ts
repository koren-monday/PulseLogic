/**
 * RevenueCat REST API Service
 * Queries RevenueCat for subscriber info to sync with Firestore
 */

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';

interface RevenueCatEntitlement {
  expires_date?: string | null;
  product_identifier: string;
  purchase_date: string;
}

interface RevenueCatSubscriber {
  request_date: string;
  subscriber: {
    entitlements: Record<string, RevenueCatEntitlement>;
    first_seen: string;
    last_seen: string;
    management_url: string | null;
    non_subscriptions: Record<string, unknown>;
    original_app_user_id: string;
    original_application_version: string | null;
    original_purchase_date: string | null;
    other_purchases: Record<string, unknown>;
    subscriptions: Record<string, unknown>;
  };
}

/**
 * Query RevenueCat API for subscriber information.
 * Returns the subscriber info if found, null if not found or on error.
 */
export async function getRevenueCatSubscriber(appUserId: string): Promise<RevenueCatSubscriber | null> {
  if (!REVENUECAT_API_KEY) {
    console.warn('RevenueCat: API key not configured, skipping sync');
    return null;
  }

  try {
    const response = await fetch(
      `${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`RevenueCat: Subscriber not found: ${appUserId}`);
        return null;
      }
      console.error(`RevenueCat API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as RevenueCatSubscriber;
    return data;
  } catch (error) {
    console.error('RevenueCat: Failed to fetch subscriber info:', error);
    return null;
  }
}

/**
 * Check if subscriber has active pro entitlement.
 * Returns 'paid' if active entitlement found, 'free' otherwise.
 */
export function getSubscriberTier(subscriber: RevenueCatSubscriber | null): 'free' | 'paid' {
  if (!subscriber) return 'free';

  const entitlements = subscriber.subscriber.entitlements;
  if (!entitlements || Object.keys(entitlements).length === 0) {
    return 'free';
  }

  // Check for 'pro' or 'premium' entitlement
  const proEntitlement = entitlements['pro'] || entitlements['premium'];
  if (!proEntitlement) return 'free';

  // Check if entitlement is expired
  if (proEntitlement.expires_date) {
    const expiresAt = new Date(proEntitlement.expires_date);
    if (expiresAt < new Date()) {
      console.log(`RevenueCat: Pro entitlement expired at ${proEntitlement.expires_date}`);
      return 'free';
    }
  }

  return 'paid';
}

/**
 * Get subscription expiration date from entitlements.
 * Returns ISO string if found, undefined otherwise.
 */
export function getSubscriptionExpiration(subscriber: RevenueCatSubscriber | null): string | undefined {
  if (!subscriber) return undefined;

  const entitlements = subscriber.subscriber.entitlements;
  if (!entitlements) return undefined;

  const proEntitlement = entitlements['pro'] || entitlements['premium'];
  if (!proEntitlement || !proEntitlement.expires_date) return undefined;

  return new Date(proEntitlement.expires_date).toISOString();
}
