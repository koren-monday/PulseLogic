import { useQuery } from '@tanstack/react-query';
import * as storage from '../services/storage.service';

// ============================================================================
// Trend Comparison Hooks
// ============================================================================

export function useMetricHistory(limit = 10) {
  return useQuery({
    queryKey: ['metrics', limit],
    queryFn: () => storage.getMetricHistory(limit),
  });
}

export function useLatestMetrics() {
  return useQuery({
    queryKey: ['metrics', 'latest'],
    queryFn: () => storage.getLatestMetrics(),
  });
}

export function useTrendComparison() {
  return useQuery({
    queryKey: ['trends', 'comparison'],
    queryFn: () => storage.getTrendComparison(),
  });
}
