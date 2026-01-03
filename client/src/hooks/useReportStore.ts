import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as storage from '../services/storage.service';
import type { GarminHealthData, LifeContext, StructuredAnalysis } from '../types';

// ============================================================================
// Report Hooks
// ============================================================================

export function useReportHistory(limit = 20) {
  return useQuery({
    queryKey: ['reports', limit],
    queryFn: () => storage.getReports(limit),
  });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => (id ? storage.getReport(id) : undefined),
    enabled: !!id,
  });
}

export function useLatestReport() {
  return useQuery({
    queryKey: ['report', 'latest'],
    queryFn: () => storage.getLatestReport(),
  });
}

export function useSaveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      dateRange: { start: string; end: string };
      model: string;
      markdown: string;
      structured: StructuredAnalysis;
      healthData: GarminHealthData;
      lifeContexts?: LifeContext[];
    }) => storage.saveReport(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['insight'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}
