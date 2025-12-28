import { useMutation, useQuery } from '@tanstack/react-query';
import { analyzeHealthData, fetchModelRegistry } from '../services/api';
import type { GarminHealthData, LLMProvider } from '../types';

interface AnalyzeParams {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  customPrompt?: string;
}

export function useModelRegistry() {
  return useQuery({
    queryKey: ['modelRegistry'],
    queryFn: fetchModelRegistry,
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change often
  });
}

export function useAnalysis() {
  return useMutation({
    mutationFn: ({ provider, apiKey, healthData, model, customPrompt }: AnalyzeParams) =>
      analyzeHealthData({
        provider,
        apiKey,
        healthData,
        model,
        customPrompt,
      }),
  });
}
