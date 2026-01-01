import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  loginToGarmin,
  logoutFromGarmin,
  checkGarminStatus,
  fetchGarminData,
  submitMFACode,
  restoreGarminSession,
} from '../services/api';
import type { GarminCredentials } from '../types';
import { clearGarminAuth } from '../utils/storage';

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
    mutationFn: ({ mfaSessionId, code, email }: { mfaSessionId: string; code: string; email: string }) =>
      submitMFACode(mfaSessionId, code, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garmin', 'status'] });
    },
  });
}

export function useGarminRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => restoreGarminSession(email),
    onSuccess: (data) => {
      if (data?.isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['garmin', 'status'] });
      }
    },
  });
}

export function useGarminLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clearStoredTokens: boolean = false) => logoutFromGarmin(clearStoredTokens),
    onSuccess: () => {
      clearGarminAuth();
      queryClient.invalidateQueries({ queryKey: ['garmin'] });
    },
  });
}

export function useGarminData(days: number = 7) {
  return useMutation({
    mutationFn: () => fetchGarminData(days),
  });
}
