import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSubscriptionTier, type SubscriptionTierInfo, type LimitCheckResult } from '../services/api';
import { checkReportLimit, checkChatLimit, checkSnapshotLimit } from '../services/api';
import { getTierLimits, type SubscriptionTier, type TierLimits } from '../types/subscription';

interface SubscriptionContextValue {
  // Current tier info
  tierInfo: SubscriptionTierInfo | null;
  isLoading: boolean;
  error: Error | null;

  // Computed helpers
  tier: SubscriptionTier;
  limits: TierLimits;
  maxDataDays: number;

  // Feature checks
  canChat: boolean;
  canUseSnapshot: boolean;
  reportsRemaining: number;
  snapshotsRemaining: number;
  llmCommunicationsRemaining?: number; // For paid tier

  // Actions
  refreshTier: () => void;
  checkReportAllowed: () => Promise<LimitCheckResult>;
  checkChatAllowed: (reportId: string) => Promise<LimitCheckResult>;
  checkSnapshotAllowed: () => Promise<LimitCheckResult>;
}

const defaultLimits: TierLimits = getTierLimits('free');

const defaultContext: SubscriptionContextValue = {
  tierInfo: null,
  isLoading: true,
  error: null,
  tier: 'free',
  limits: defaultLimits,
  maxDataDays: 30,
  canChat: false,
  canUseSnapshot: false,
  reportsRemaining: 1,
  snapshotsRemaining: 0,
  refreshTier: () => {},
  checkReportAllowed: async () => ({ allowed: true }),
  checkChatAllowed: async () => ({ allowed: false, reason: 'Not initialized' }),
  checkSnapshotAllowed: async () => ({ allowed: false, reason: 'Not initialized' }),
};

const SubscriptionContext = createContext<SubscriptionContextValue>(defaultContext);

interface SubscriptionProviderProps {
  userId: string | null;
  children: ReactNode;
}

export function SubscriptionProvider({ userId, children }: SubscriptionProviderProps) {
  const queryClient = useQueryClient();

  const {
    data: tierInfo,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => (userId ? fetchSubscriptionTier(userId) : null),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const refreshTier = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['subscription', userId] });
    }
  }, [userId, queryClient]);

  const checkReportAllowed = useCallback(async (): Promise<LimitCheckResult> => {
    if (!userId) return { allowed: false, reason: 'Not logged in' };
    try {
      return await checkReportLimit(userId);
    } catch {
      // Fail open for UX
      return { allowed: true };
    }
  }, [userId]);

  const checkChatAllowed = useCallback(async (reportId: string): Promise<LimitCheckResult> => {
    if (!userId) return { allowed: false, reason: 'Not logged in' };
    try {
      return await checkChatLimit(userId, reportId);
    } catch {
      return { allowed: true };
    }
  }, [userId]);

  const checkSnapshotAllowed = useCallback(async (): Promise<LimitCheckResult> => {
    if (!userId) return { allowed: false, reason: 'Not logged in' };
    try {
      return await checkSnapshotLimit(userId);
    } catch {
      return { allowed: true };
    }
  }, [userId]);

  // Compute derived values
  const tier = tierInfo?.tier ?? 'free';
  const limits = tierInfo?.limits ?? defaultLimits;
  const maxDataDays = tierInfo?.maxDataDays ?? 30;
  const canChat = tierInfo?.usage?.chatEnabled ?? false;
  const canUseSnapshot = tierInfo?.usage?.snapshotEnabled ?? false;
  const reportsRemaining = tierInfo?.usage?.reportsRemaining ?? 1;
  const snapshotsRemaining = tierInfo?.usage?.snapshotsRemaining ?? 0;
  const llmCommunicationsRemaining = tierInfo?.usage?.llmCommunicationsRemaining;

  const value: SubscriptionContextValue = {
    tierInfo: tierInfo ?? null,
    isLoading,
    error: error as Error | null,
    tier,
    limits,
    maxDataDays,
    canChat,
    canUseSnapshot,
    reportsRemaining,
    snapshotsRemaining,
    llmCommunicationsRemaining,
    refreshTier,
    checkReportAllowed,
    checkChatAllowed,
    checkSnapshotAllowed,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Helper hook for tier badge display
export function useTierBadge(): { label: string; color: string } {
  const { tier } = useSubscription();

  if (tier === 'paid') {
    return { label: 'Pro', color: 'bg-blue-500' };
  }

  return { label: 'Free', color: 'bg-slate-500' };
}
