// Subscription tier types for monetization (client-side mirror)
// Simplified: 2 tiers only (free/paid), no BYOK - server provides all API keys

export type SubscriptionTier = 'free' | 'paid';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface UsageInfo {
  reportsRemaining: number;
  chatEnabled: boolean;
  llmCommunicationsRemaining?: number; // For paid tier
  snapshotEnabled: boolean;
  snapshotsRemaining: number;
}

export interface TierLimits {
  maxDataDays: number;
  // Free tier: uses weekly report limit + per-report chat limit
  maxReportsPerWeek?: number;
  maxChatMessagesPerReport?: number;
  // Paid tier: uses daily LLM communication pool
  maxLLMCommunicationsPerDay?: number;
  maxSnapshotsPerDay: number;
  allowedModels: string[];
  canViewReportHistory: boolean;
}

export interface EffectiveTier {
  tier: SubscriptionTier;
  limits: TierLimits;
  usage: UsageInfo;
}

// Model tier identifiers (internal - do not expose to UI)
export const MODEL_IDS = {
  DEFAULT: 'gemini-3-flash-preview',
  ADVANCED: 'gemini-3-pro-preview',
} as const;

// Tier configuration - mirrors server config
export const TIER_CONFIGS: Record<SubscriptionTier, TierLimits> = {
  'free': {
    maxDataDays: 30, // Can choose 7 or 30
    maxReportsPerWeek: 1,
    maxChatMessagesPerReport: 1, // 1 follow-up per report
    maxSnapshotsPerDay: 0, // No snapshots
    allowedModels: [MODEL_IDS.DEFAULT],
    canViewReportHistory: false, // Only latest report
  },
  'paid': {
    maxDataDays: 360, // Can choose 7, 30, 180, or 360
    maxLLMCommunicationsPerDay: 10, // Reports + chat combined
    maxSnapshotsPerDay: 1,
    allowedModels: [MODEL_IDS.DEFAULT, MODEL_IDS.ADVANCED],
    canViewReportHistory: true,
  },
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIGS[tier];
}

export function canChat(tier: SubscriptionTier): boolean {
  const limits = getTierLimits(tier);
  // Paid tier can always chat (within daily limit)
  // Free tier can chat if they have per-report allowance
  return tier === 'paid' || (limits.maxChatMessagesPerReport || 0) > 0;
}

export function canUseSnapshot(tier: SubscriptionTier): boolean {
  const limits = getTierLimits(tier);
  return limits.maxSnapshotsPerDay > 0;
}

export function isModelAllowed(tier: SubscriptionTier, modelId: string): boolean {
  const limits = getTierLimits(tier);
  return limits.allowedModels.includes(modelId);
}

export function canUseAdvancedModel(tier: SubscriptionTier): boolean {
  return isModelAllowed(tier, MODEL_IDS.ADVANCED);
}
