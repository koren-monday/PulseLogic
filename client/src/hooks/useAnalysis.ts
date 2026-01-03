import { useMutation, useQuery } from '@tanstack/react-query';
import {
  analyzeHealthData,
  chatAboutHealth,
  fetchAvailableModels,
  generateDailyInsight,
} from '../services/api';
import type { GarminHealthData, ChatMessage, LifeContext } from '../types';

interface AnalyzeParams {
  userId: string;
  healthData: GarminHealthData;
  useAdvancedModel?: boolean;
  customPrompt?: string;
  lifeContexts?: LifeContext[];
}

interface ChatParams {
  userId: string;
  reportId: string;
  healthData: GarminHealthData;
  useAdvancedModel?: boolean;
  messages: ChatMessage[];
}

interface DailyInsightParams {
  userId: string;
  healthData: GarminHealthData;
}

export function useAvailableModels() {
  return useQuery({
    queryKey: ['availableModels'],
    queryFn: fetchAvailableModels,
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change often
  });
}

export function useAnalysis() {
  return useMutation({
    mutationFn: ({ userId, healthData, useAdvancedModel, customPrompt, lifeContexts }: AnalyzeParams) =>
      analyzeHealthData({
        userId,
        healthData,
        useAdvancedModel,
        customPrompt,
        lifeContexts,
      }),
  });
}

export function useChat() {
  return useMutation({
    mutationFn: ({ userId, reportId, healthData, useAdvancedModel, messages }: ChatParams) =>
      chatAboutHealth({
        userId,
        reportId,
        healthData,
        useAdvancedModel,
        messages,
      }),
  });
}

export function useDailyInsightGeneration() {
  return useMutation({
    mutationFn: ({ userId, healthData }: DailyInsightParams) =>
      generateDailyInsight({
        userId,
        healthData,
      }),
  });
}
