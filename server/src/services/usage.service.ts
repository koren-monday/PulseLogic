/**
 * Usage tracking and tier enforcement service.
 * Provides business logic for checking limits and enforcing tier restrictions.
 *
 * Simplified: No BYOK - server provides all API keys.
 * Free tier: 1 report/week, 1 follow-up per report
 * Paid tier: 10 LLM communications/day (reports + chat combined)
 */

import {
  getUserSubscription,
  getUserUsage,
  incrementUsage,
  getReportChatCount,
  incrementReportChatCount,
} from './firestore.service.js';
import {
  getTierLimits,
  isModelAllowed,
  getDefaultModelForTier,
  type SubscriptionTier,
  type TierLimits,
} from '../types/subscription.js';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number | 'unlimited';
  upgradeRequired?: boolean;
}

export interface TierInfo {
  tier: SubscriptionTier;
  limits: TierLimits;
  usage: {
    // Free tier tracking
    reportsThisWeek: number;
    // Paid tier tracking
    llmCommunicationsToday: number;
    // Both tiers
    snapshotsToday: number;
  };
}

/**
 * Get the effective tier information for a user.
 */
export async function getEffectiveTier(userId: string): Promise<TierInfo> {
  const [subscription, usage] = await Promise.all([
    getUserSubscription(userId),
    getUserUsage(userId),
  ]);

  const limits = getTierLimits(subscription.tier);

  return {
    tier: subscription.tier,
    limits,
    usage: {
      reportsThisWeek: usage.reportsThisWeek || 0,
      llmCommunicationsToday: usage.llmCommunicationsToday || 0,
      snapshotsToday: usage.snapshotsUsed || 0,
    },
  };
}

/**
 * Check if user can create a new report.
 */
export async function canCreateReport(userId: string): Promise<LimitCheckResult> {
  const tierInfo = await getEffectiveTier(userId);
  const { limits, usage, tier } = tierInfo;

  if (tier === 'paid') {
    // Paid tier: check daily LLM communication limit
    const maxPerDay = limits.maxLLMCommunicationsPerDay || 10;
    const remaining = maxPerDay - usage.llmCommunicationsToday;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'Daily limit reached. Try again tomorrow.',
        remaining: 0,
        upgradeRequired: false,
      };
    }
    return { allowed: true, remaining };
  } else {
    // Free tier: check weekly report limit
    const maxPerWeek = limits.maxReportsPerWeek || 1;
    const remaining = maxPerWeek - usage.reportsThisWeek;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'Weekly report limit reached. Upgrade to Pro for more reports.',
        remaining: 0,
        upgradeRequired: true,
      };
    }
    return { allowed: true, remaining };
  }
}

/**
 * Check if user can send a chat message for a specific report.
 */
export async function canSendChatMessage(
  userId: string,
  reportId: string
): Promise<LimitCheckResult> {
  const tierInfo = await getEffectiveTier(userId);
  const { limits, usage, tier } = tierInfo;

  if (tier === 'paid') {
    // Paid tier: check daily LLM communication limit
    const maxPerDay = limits.maxLLMCommunicationsPerDay || 10;
    const remaining = maxPerDay - usage.llmCommunicationsToday;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'Daily limit reached. Try again tomorrow.',
        remaining: 0,
        upgradeRequired: false,
      };
    }
    return { allowed: true, remaining };
  } else {
    // Free tier: check per-report chat limit
    const maxPerReport = limits.maxChatMessagesPerReport || 1;
    const chatCount = await getReportChatCount(userId, reportId);
    const remaining = maxPerReport - chatCount;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'You\'ve used your follow-up question for this report. Upgrade to Pro for more.',
        remaining: 0,
        upgradeRequired: true,
      };
    }
    return { allowed: true, remaining };
  }
}

/**
 * Check if user can use the daily snapshot feature.
 */
export async function canUseSnapshot(userId: string): Promise<LimitCheckResult> {
  const tierInfo = await getEffectiveTier(userId);
  const { limits, usage } = tierInfo;

  // Snapshot not allowed for free tier
  if (limits.maxSnapshotsPerDay === 0) {
    return {
      allowed: false,
      reason: 'Daily Snapshot is a Pro feature. Upgrade to access it.',
      remaining: 0,
      upgradeRequired: true,
    };
  }

  // Check daily limit
  const remaining = limits.maxSnapshotsPerDay - usage.snapshotsToday;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: 'Daily snapshot used. Try again tomorrow.',
      remaining: 0,
      upgradeRequired: false,
    };
  }

  return { allowed: true, remaining };
}

/**
 * Get the maximum data days allowed for this user's tier.
 */
export async function getMaxDataDays(userId: string): Promise<number> {
  const tierInfo = await getEffectiveTier(userId);
  return tierInfo.limits.maxDataDays;
}

/**
 * Check if a specific model is allowed for this user's tier.
 * Returns the model to use (forced to Flash if not allowed).
 */
export async function checkModelAllowed(
  userId: string,
  modelId: string
): Promise<{ allowed: boolean; forcedModel?: string }> {
  const tierInfo = await getEffectiveTier(userId);

  if (isModelAllowed(tierInfo.tier, modelId)) {
    return { allowed: true };
  }

  // Not allowed - return the default model
  const forcedModel = getDefaultModelForTier(tierInfo.tier);
  return {
    allowed: false,
    forcedModel,
  };
}

/**
 * Record that a report was created.
 */
export async function recordReportCreated(userId: string): Promise<void> {
  await incrementUsage(userId, 'llm');
}

/**
 * Record that a chat message was sent for a report.
 */
export async function recordChatMessage(
  userId: string,
  reportId: string
): Promise<void> {
  // Increment report-specific chat count (for free tier per-report limit)
  await incrementReportChatCount(userId, reportId);
  // Increment daily LLM communications (for paid tier daily limit)
  await incrementUsage(userId, 'llm');
}

/**
 * Record that a snapshot was used.
 */
export async function recordSnapshotUsed(userId: string): Promise<void> {
  await incrementUsage(userId, 'snapshot');
}

/**
 * Get full tier info for API response.
 */
export async function getTierInfoForClient(userId: string): Promise<{
  tier: SubscriptionTier;
  limits: TierLimits;
  usage: {
    // Free tier
    reportsRemaining: number;
    chatEnabled: boolean;
    // Paid tier
    llmCommunicationsRemaining?: number;
    // Both
    snapshotEnabled: boolean;
    snapshotsRemaining: number;
  };
  maxDataDays: number;
  allowedModels: string[];
}> {
  const tierInfo = await getEffectiveTier(userId);
  const { limits, usage, tier } = tierInfo;

  let reportsRemaining = 0;
  let llmCommunicationsRemaining: number | undefined;

  if (tier === 'paid') {
    const maxPerDay = limits.maxLLMCommunicationsPerDay || 10;
    llmCommunicationsRemaining = Math.max(0, maxPerDay - usage.llmCommunicationsToday);
    reportsRemaining = llmCommunicationsRemaining; // Reports count against LLM pool
  } else {
    const maxPerWeek = limits.maxReportsPerWeek || 1;
    reportsRemaining = Math.max(0, maxPerWeek - usage.reportsThisWeek);
  }

  const snapshotsRemaining = Math.max(0, limits.maxSnapshotsPerDay - usage.snapshotsToday);

  return {
    tier,
    limits,
    usage: {
      reportsRemaining,
      chatEnabled: tier === 'paid' || (limits.maxChatMessagesPerReport || 0) > 0,
      llmCommunicationsRemaining,
      snapshotEnabled: limits.maxSnapshotsPerDay > 0,
      snapshotsRemaining,
    },
    maxDataDays: limits.maxDataDays,
    allowedModels: limits.allowedModels,
  };
}
