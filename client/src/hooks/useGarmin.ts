import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  loginToGarmin,
  logoutFromGarmin,
  checkGarminStatus,
  fetchGarminData,
  submitMFACode,
} from '../services/api';
import type { GarminCredentials } from '../types';
import { clearSession } from '../utils/storage';

export function useGarminStatus() {
  return useQuery({
    queryKey: ['garmin', 'status'],
    queryFn: checkGarminStatus,
    retry: false,
    staleTime: 30000, // 30 seconds
  });
}

export function useGarminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: GarminCredentials) => loginToGarmin(credentials),
    onSuccess: (data) => {
      // Only invalidate if fully authenticated (not in MFA pending state)
      if (data.isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['garmin', 'status'] });
      }
    },
  });
}

export function useGarminMFA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mfaSessionId, code }: { mfaSessionId: string; code: string }) =>
      submitMFACode(mfaSessionId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garmin', 'status'] });
    },
  });
}

export function useGarminLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutFromGarmin,
    onSuccess: () => {
      clearSession();
      queryClient.invalidateQueries({ queryKey: ['garmin'] });
    },
  });
}

export function useGarminData(days: number = 7) {
  return useMutation({
    mutationFn: () => fetchGarminData(days),
  });
}
