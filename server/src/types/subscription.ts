// Subscription tier types for monetization
// Simplified: 2 tiers only (free/paid), no BYOK - server provides all API keys

export type SubscriptionTier = 'free' | 'paid';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  userId: string;
  date: string; // YYYY-MM-DD format for daily tracking
  llmCommunicationsToday: number; // Combined: reports + chat messages
  snapshotsUsed: number;
  weekStartDate?: string; // For weekly reset tracking (free tier)
  reportsThisWeek?: number; // For free tier weekly limit
}

export interface EffectiveTier {
  tier: SubscriptionTier;
  limits: TierLimits;
}

export interface TierLimits {
  maxDataDays: number;
  // Free tier: uses weekly report limit + per-report chat limit
  // Paid tier: uses daily LLM communication pool
  maxReportsPerWeek?: number; // For free tier
  maxChatMessagesPerReport?: number; // For free tier
  maxLLMCommunicationsPerDay?: number; // For paid tier (reports + chat combined)
  maxSnapshotsPerDay: number;
  allowedModels: string[];
  canViewReportHistory: boolean;
}

// Available Gemini models
export const GEMINI_MODELS = {
  FLASH: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview',
} as const;

// Tier configuration - single source of truth
export const TIER_CONFIGS: Record<SubscriptionTier, TierLimits> = {
  'free': {
    maxDataDays: 30, // Can choose 7 or 30
    maxReportsPerWeek: 1,
    maxChatMessagesPerReport: 1, // 1 follow-up per report
    maxSnapshotsPerDay: 0, // No snapshots
    allowedModels: [GEMINI_MODELS.FLASH],
    canViewReportHistory: false, // Only latest report
  },
  'paid': {
    maxDataDays: 360, // Can choose 7, 30, 180, or 360
    maxLLMCommunicationsPerDay: 10, // Reports + chat combined
    maxSnapshotsPerDay: 1,
    allowedModels: [GEMINI_MODELS.FLASH, GEMINI_MODELS.PRO],
    canViewReportHistory: true,
  },
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIGS[tier];
}

// Check if a model is allowed for this tier
export function isModelAllowed(tier: SubscriptionTier, modelId: string): boolean {
  const limits = getTierLimits(tier);
  return limits.allowedModels.includes(modelId);
}

// Get the default model for a tier
export function getDefaultModelForTier(_tier: SubscriptionTier): string {
  // All tiers default to Flash model
  return GEMINI_MODELS.FLASH;
}
