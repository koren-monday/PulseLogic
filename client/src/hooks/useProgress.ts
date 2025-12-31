import { useQuery } from '@tanstack/react-query';
import * as storage from '../services/storage.service';

// ============================================================================
// User Progress Hooks
// ============================================================================

export function useProgress() {
  return useQuery({
    queryKey: ['progress'],
    queryFn: () => storage.getProgress(),
  });
}

export function useDatabaseStats() {
  return useQuery({
    queryKey: ['database', 'stats'],
    queryFn: () => storage.getDatabaseStats(),
  });
}
