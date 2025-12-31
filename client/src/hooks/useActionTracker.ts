import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as storage from '../services/storage.service';

// ============================================================================
// Action Tracking Hooks
// ============================================================================

export function useActiveActions() {
  return useQuery({
    queryKey: ['actions', 'active'],
    queryFn: () => storage.getActiveActions(),
  });
}

export function useAllActions() {
  return useQuery({
    queryKey: ['actions', 'all'],
    queryFn: () => storage.getAllActions(),
  });
}

export function useActionsByReport(reportId: string | null) {
  return useQuery({
    queryKey: ['actions', 'report', reportId],
    queryFn: () => (reportId ? storage.getActionsByReport(reportId) : []),
    enabled: !!reportId,
  });
}

export function useLogActionProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      completed,
      notes,
    }: {
      actionId: string;
      completed: boolean;
      notes?: string;
    }) => storage.logActionProgress(actionId, completed, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useCompleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.completeAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useDismissAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.dismissAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useSnoozeAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.snoozeAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useReactivateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storage.reactivateAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}
