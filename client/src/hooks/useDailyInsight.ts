import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as storage from '../services/storage.service';

// ============================================================================
// Daily Insight Hooks
// ============================================================================

export function useTodayInsight() {
  return useQuery({
    queryKey: ['insight', 'today'],
    queryFn: () => storage.getTodayInsight(),
  });
}

export function useMarkInsightShown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.markInsightShown,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight'] });
    },
  });
}

export function useMarkInsightActed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.markInsightActed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.dismissInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight'] });
    },
  });
}
