import { useState } from 'react';
import { Lightbulb, X, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useTodayInsight, useMarkInsightShown, useMarkInsightActed, useDismissInsight } from '../hooks';
import { LoadingSpinner } from './LoadingSpinner';
import type { QueuedInsight } from '../db/schema';

interface DailyInsightProps {
  onViewReport?: (reportId: string) => void;
}

export function DailyInsight({ onViewReport }: DailyInsightProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: insight, isLoading } = useTodayInsight();
  const markShownMutation = useMarkInsightShown();
  const markActedMutation = useMarkInsightActed();
  const dismissMutation = useDismissInsight();

  // Mark as shown when first displayed
  const handleShow = (insightData: QueuedInsight) => {
    if (insightData.status === 'pending') {
      markShownMutation.mutate(insightData.id);
    }
  };

  const handleAct = () => {
    if (insight) {
      markActedMutation.mutate(insight.id);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    if (insight) {
      dismissMutation.mutate(insight.id);
      setDismissed(true);
    }
  };

  const handleViewReport = () => {
    if (insight && onViewReport) {
      onViewReport(insight.reportId);
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
        <LoadingSpinner size="sm" message="Loading today's insight..." />
      </div>
    );
  }

  if (!insight || dismissed) {
    return null;
  }

  // Mark as shown on first render
  if (insight.status === 'pending') {
    handleShow(insight);
  }

  const categoryIcons: Record<string, string> = {
    tip: '💡',
    observation: '👁️',
    achievement: '🏆',
    warning: '⚠️',
  };

  const categoryColors: Record<string, string> = {
    tip: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
    observation: 'from-purple-500/10 to-pink-500/10 border-purple-500/30',
    achievement: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30',
    warning: 'from-orange-500/10 to-red-500/10 border-orange-500/30',
  };

  const category = insight.insight.category || 'tip';
  const icon = categoryIcons[category] || '💡';
  const colorClass = categoryColors[category] || categoryColors.tip;

  return (
    <div className={`card bg-gradient-to-r ${colorClass} border`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0 mt-0.5">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Today's Insight
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-white font-medium">{insight.insight.text}</p>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="mb-3">
                <div className="text-xs text-slate-400 mb-1">Type</div>
                <p className="text-sm text-slate-300 capitalize">{insight.insight.category}</p>
              </div>

              {insight.insight.actionable && (
                <div className="mb-3">
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    Actionable
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAct}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
                >
                  <Check className="w-3 h-3" />
                  I'll try this
                </button>

                {onViewReport && (
                  <button
                    onClick={handleViewReport}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View full report
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expand/collapse button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Learn more & take action
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
