import { useState } from 'react';
import { Zap, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Lightbulb, RefreshCw } from 'lucide-react';
import { useDailyInsightGeneration } from '../hooks';
import { LoadingSpinner } from './LoadingSpinner';
import { Alert } from './Alert';
import type { GarminHealthData, LLMProvider, DailyInsightData, DailyInsightComparison } from '../types';

interface QuickDailyInsightProps {
  healthData: GarminHealthData;
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

function TrendIcon({ trend }: { trend: DailyInsightComparison['trend'] }) {
  switch (trend) {
    case 'better':
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'worse':
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    default:
      return <Minus className="w-4 h-4 text-slate-400" />;
  }
}

function MetricLabel({ metric }: { metric: DailyInsightComparison['metric'] }) {
  const labels: Record<DailyInsightComparison['metric'], string> = {
    sleep: 'Sleep',
    stress: 'Stress',
    heartRate: 'Heart Rate',
    bodyBattery: 'Body Battery',
    activity: 'Activity',
  };
  return <span>{labels[metric]}</span>;
}

export function QuickDailyInsight({ healthData, provider, apiKey, model }: QuickDailyInsightProps) {
  const [expanded, setExpanded] = useState(false);
  const [insight, setInsight] = useState<DailyInsightData | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const dailyInsightMutation = useDailyInsightGeneration();

  const handleGenerate = async () => {
    try {
      const result = await dailyInsightMutation.mutateAsync({
        provider,
        apiKey,
        healthData,
        model,
      });
      setInsight(result.insight);
      setHasGenerated(true);
    } catch {
      // Error handled by mutation
    }
  };

  // Show generate button if not yet generated
  if (!hasGenerated && !dailyInsightMutation.isPending) {
    return (
      <div className="card bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="text-2xl">&#x26A1;</div>
          <div className="flex-1">
            <h3 className="font-medium text-white">Quick Daily Snapshot</h3>
            <p className="text-sm text-slate-400">
              Get an AI-powered comparison of yesterday vs your averages
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="btn-primary flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (dailyInsightMutation.isPending) {
    return (
      <div className="card bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
        <LoadingSpinner size="sm" message="Generating daily insight..." />
      </div>
    );
  }

  // Show error state
  if (dailyInsightMutation.isError) {
    return (
      <div className="card">
        <Alert type="error" message={dailyInsightMutation.error?.message || 'Failed to generate insight'} />
        <button
          onClick={handleGenerate}
          className="mt-3 btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // No insight data (parsing failed)
  if (!insight) {
    return (
      <div className="card bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
        <p className="text-slate-400">Could not generate daily insight. Try running full analysis.</p>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
      {/* Header with emoji and headline */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl flex-shrink-0">{insight.moodEmoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Daily Snapshot
            </span>
            <span className="text-xs text-slate-500">
              {insight.lastDay.date}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{insight.headline}</h3>
          <p className="text-slate-300 mt-1">{insight.topInsight}</p>
        </div>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-3"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Hide details
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            View comparisons & tips
          </>
        )}
      </button>

      {expanded && (
        <div className="space-y-4 pt-3 border-t border-slate-700/50">
          {/* Metric comparisons */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Yesterday vs Period Average</h4>
            <div className="grid gap-2">
              {insight.comparisons.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2">
                  <TrendIcon trend={comp.trend} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <MetricLabel metric={comp.metric} />
                      <span className="text-slate-400">
                        {comp.lastDayValue} <span className="text-slate-600">vs</span> {comp.periodAverage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{comp.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick tips */}
          {insight.quickTips.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-medium text-slate-300">Quick Tips</h4>
              </div>
              <ul className="space-y-1">
                {insight.quickTips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-slate-600">-</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
