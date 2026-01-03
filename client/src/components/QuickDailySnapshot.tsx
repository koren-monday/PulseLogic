import { useState, useEffect } from 'react';
import { X, RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle, Database, Zap, Lock } from 'lucide-react';
import { fetchGarminData, compareDayToStatistics, calculateAndSaveStatistics } from '../services/api';
import { getCurrentUserId } from '../utils/storage';
import { useSubscription } from '../contexts/SubscriptionContext';
import { LoadingOverlay } from './LoadingOverlay';
import type { DailyComparison } from '../types';

interface QuickDailySnapshotProps {
  onClose: () => void;
}

export function QuickDailySnapshot({ onClose }: QuickDailySnapshotProps) {
  const { canUseSnapshot, snapshotsRemaining, tier } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<DailyComparison[]>([]);
  const [statsInfo, setStatsInfo] = useState<{
    calculatedAt: string;
    periodStart: string;
    periodEnd: string;
    daysIncluded: number;
  } | null>(null);
  const [noStats, setNoStats] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);

  const userId = getCurrentUserId();

  const fetchSnapshot = async () => {
    if (!userId) {
      setError('Not logged in');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch last 1 day of data
      const todayData = await fetchGarminData(1);

      // Compare to stored statistics
      const result = await compareDayToStatistics(userId, todayData);

      if (result.message || result.comparisons.length === 0) {
        setNoStats(true);
        setComparisons([]);
      } else {
        setNoStats(false);
        setComparisons(result.comparisons);
        setStatsInfo(result.statisticsFrom || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch snapshot');
    } finally {
      setLoading(false);
    }
  };

  const updateBaselineStats = async () => {
    if (!userId) return;

    setUpdatingStats(true);
    try {
      // Fetch 30 days of data for baseline
      const healthData = await fetchGarminData(30);
      await calculateAndSaveStatistics(userId, healthData);
      // Refresh the snapshot
      await fetchSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update statistics');
    } finally {
      setUpdatingStats(false);
    }
  };

  useEffect(() => {
    if (canUseSnapshot) {
      fetchSnapshot();
    } else {
      setLoading(false);
    }
  }, [canUseSnapshot]);

  const getTrendIcon = (trend: 'better' | 'worse' | 'same') => {
    switch (trend) {
      case 'better':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'worse':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      default:
        return <Minus className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTrendColor = (trend: 'better' | 'worse' | 'same') => {
    switch (trend) {
      case 'better':
        return 'text-green-400';
      case 'worse':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getTrendBg = (trend: 'better' | 'worse' | 'same') => {
    switch (trend) {
      case 'better':
        return 'bg-green-500/10 border-green-500/20';
      case 'worse':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Daily Snapshot</h2>
            {canUseSnapshot && snapshotsRemaining !== undefined && (
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">
                {snapshotsRemaining} left today
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSnapshot}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`p-4 overflow-y-auto max-h-[calc(90vh-120px)] relative ${loading || updatingStats ? 'min-h-[200px] pointer-events-none' : ''}`}>
          <LoadingOverlay
            isLoading={loading || updatingStats}
            type={updatingStats ? 'syncing' : 'fetching'}
            message={updatingStats ? 'Calculating baseline statistics...' : undefined}
          />
          {!canUseSnapshot ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="w-12 h-12 text-slate-500 mb-4" />
              <h3 className="text-white font-medium mb-2">Feature Locked</h3>
              <p className="text-slate-400 text-sm mb-4">
                {tier === 'free' ? (
                  <>Daily Snapshot is a Pro feature. Upgrade to compare your daily metrics against your personal baselines.</>
                ) : (
                  <>You've used your daily snapshot. Try again tomorrow or add your own API key for unlimited access.</>
                )}
              </p>
              {tier === 'free' && (
                <button className="btn-primary">
                  Upgrade to Pro
                </button>
              )}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={fetchSnapshot}
                className="text-garmin-blue hover:underline text-sm"
              >
                Try again
              </button>
            </div>
          ) : noStats ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Database className="w-12 h-12 text-slate-500 mb-4" />
              <h3 className="text-white font-medium mb-2">No Baseline Statistics</h3>
              <p className="text-slate-400 text-sm mb-4">
                Create baseline statistics from your historical data to compare daily metrics.
              </p>
              <button
                onClick={updateBaselineStats}
                disabled={updatingStats}
                className="btn-primary flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Create from Last 30 Days
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Period Info */}
              {statsInfo && (
                <div className="text-xs text-slate-500 text-center mb-4">
                  Comparing to {statsInfo.daysIncluded}-day average ({formatDate(statsInfo.periodStart)} - {formatDate(statsInfo.periodEnd)})
                </div>
              )}

              {/* Comparisons */}
              <div className="space-y-3">
                {comparisons.map((comparison) => (
                  <div
                    key={comparison.metric}
                    className={`p-4 rounded-lg border ${getTrendBg(comparison.trend)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 font-medium">{comparison.label}</span>
                      {getTrendIcon(comparison.trend)}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {comparison.todayFormatted}
                        </div>
                        <div className="text-xs text-slate-500">
                          vs avg: {comparison.avgFormatted}
                        </div>
                      </div>
                      <div className={`text-lg font-semibold ${getTrendColor(comparison.trend)}`}>
                        {comparison.percentDiff > 0 ? '+' : ''}{comparison.percentDiff}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Update Stats Button */}
              <div className="pt-4 border-t border-slate-700">
                <button
                  onClick={updateBaselineStats}
                  disabled={updatingStats}
                  className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                >
                  <Database className="w-4 h-4" />
                  Update Baseline (Last 30 Days)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
