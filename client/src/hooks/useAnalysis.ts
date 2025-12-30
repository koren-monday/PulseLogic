import { useMutation, useQuery } from '@tanstack/react-query';
import { analyzeHealthData, chatAboutHealth, fetchModelRegistry } from '../services/api';
import type { GarminHealthData, LLMProvider, ChatMessage, LifeContext } from '../types';

interface AnalyzeParams {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  customPrompt?: string;
  lifeContexts?: LifeContext[];
}

interface ChatParams {
  provider: LLMProvider;
  apiKey: string;
  healthData: GarminHealthData;
  model?: string;
  messages: ChatMessage[];
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
    mutationFn: ({ provider, apiKey, healthData, model, customPrompt, lifeContexts }: AnalyzeParams) =>
      analyzeHealthData({
        provider,
        apiKey,
        healthData,
        model,
        customPrompt,
        lifeContexts,
      }),
  });
}

export function useChat() {
  return useMutation({
    mutationFn: ({ provider, apiKey, healthData, model, messages }: ChatParams) =>
      chatAboutHealth({
        provider,
        apiKey,
        healthData,
        model,
        messages,
      }),
  });
}
