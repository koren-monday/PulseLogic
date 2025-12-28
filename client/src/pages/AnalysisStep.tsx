import { useState, useEffect } from 'react';
import { Brain, Sparkles, RefreshCw, ChevronLeft, Copy, Check, Cpu } from 'lucide-react';
import { useAnalysis, useModelRegistry } from '../hooks';
import { Alert } from '../components/Alert';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getApiKey } from '../utils/storage';
import type { GarminHealthData, LLMProvider, AnalysisResponse } from '../types';

interface AnalysisStepProps {
  healthData: GarminHealthData;
  selectedProvider: LLMProvider;
  selectedModel: string;
  onBack: () => void;
  onReset: () => void;
}

export function AnalysisStep({
  healthData,
  selectedProvider,
  selectedModel,
  onBack,
  onReset,
}: AnalysisStepProps) {
  const [activeProvider, setActiveProvider] = useState<LLMProvider>(selectedProvider);
  const [activeModel, setActiveModel] = useState<string>(selectedModel);
  const [customPrompt, setCustomPrompt] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: modelRegistry, isLoading: modelsLoading } = useModelRegistry();
  const analysisMutation = useAnalysis();

  // Update active model when provider changes
  useEffect(() => {
    if (modelRegistry && activeProvider) {
      const config = modelRegistry[activeProvider];
      // Keep current model if it's valid for this provider, otherwise use default
      const isValidModel = config.models.some(m => m.id === activeModel);
      if (!isValidModel) {
        setActiveModel(config.defaultModel);
      }
    }
  }, [activeProvider, modelRegistry, activeModel]);

  const handleAnalyze = async () => {
    const apiKey = getApiKey(activeProvider);
    if (!apiKey) {
      alert(`No API key found for ${modelRegistry?.[activeProvider]?.name || activeProvider}`);
      return;
    }

    try {
      const result = await analysisMutation.mutateAsync({
        provider: activeProvider,
        apiKey,
        healthData,
        model: activeModel,
        customPrompt: customPrompt || undefined,
      });
      setAnalysis(result);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    if (analysis) {
      await navigator.clipboard.writeText(analysis.analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-garmin-blue" />
          <h2 className="text-lg font-semibold">AI Health Analysis</h2>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Select an LLM provider and model to generate personalized insights from your health data.
        </p>

        {/* Provider Selection */}
        <div className="flex gap-2 mb-4">
          {(['openai', 'anthropic', 'google'] as LLMProvider[]).map(provider => {
            const hasKey = !!getApiKey(provider);
            const providerName = modelRegistry?.[provider]?.name || provider;
            return (
              <button
                key={provider}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${activeProvider === provider
                    ? 'bg-garmin-blue text-white'
                    : hasKey
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                `}
                onClick={() => hasKey && setActiveProvider(provider)}
                disabled={!hasKey}
              >
                {providerName}
                {!hasKey && ' (no key)'}
              </button>
            );
          })}
        </div>

        {/* Model Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Model</label>
          {modelsLoading ? (
            <LoadingSpinner size="sm" message="Loading models..." />
          ) : modelRegistry ? (
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <select
                className="input-field flex-1"
                value={activeModel}
                onChange={e => setActiveModel(e.target.value)}
              >
                {modelRegistry[activeProvider].models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Alert type="error" message="Failed to load models" />
          )}
        </div>

        {/* Custom Prompt */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Custom Analysis Request (optional)
          </label>
          <textarea
            className="input-field min-h-[80px]"
            placeholder="e.g., Focus on my marathon training progress and recovery patterns..."
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
          />
        </div>

        {analysisMutation.isError && (
          <Alert
            type="error"
            message={analysisMutation.error?.message || 'Analysis failed'}
          />
        )}

        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleAnalyze}
          disabled={analysisMutation.isPending}
        >
          {analysisMutation.isPending ? (
            <LoadingSpinner size="sm" message="Analyzing with AI..." />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {analysis ? 'Re-analyze' : 'Generate Analysis'}
            </>
          )}
        </button>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold">Analysis Results</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {analysis.model} {analysis.tokensUsed && `• ${analysis.tokensUsed} tokens`}
              </span>
              <button
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <div className="prose prose-invert prose-sm max-w-none">
            <div
              className="text-slate-300 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: analysis.analysis
                  .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
                  .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
                  .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                  .replace(/^\- (.*$)/gm, '<li class="ml-4">$1</li>')
                  .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>'),
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Data
        </button>
        <button
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
          onClick={onReset}
        >
          <RefreshCw className="w-4 h-4" />
          Start Over
        </button>
      </div>
    </div>
  );
}
