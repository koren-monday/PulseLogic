import { TrendingUp, Calendar, ChevronLeft, BarChart3 } from 'lucide-react';
import { useTrendComparison, useMetricHistory } from '../hooks';
import { LoadingSpinner } from './LoadingSpinner';
import { TrendCard } from './TrendCard';

interface TrendComparisonProps {
  onClose?: () => void;
  compact?: boolean;
}

export function TrendComparison({ onClose, compact = false }: TrendComparisonProps) {
  const { data: comparison, isLoading: comparisonLoading } = useTrendComparison();
  const { data: history, isLoading: historyLoading } = useMetricHistory(10);

  const isLoading = comparisonLoading || historyLoading;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="card">
        <LoadingSpinner size="sm" message="Loading trends..." />
      </div>
    );
  }

  if (!comparison?.hasTrend) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-garmin-blue" />
          <h3 className="font-semibold">Trends</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Generate at least 2 reports to see how your metrics are trending over time.
        </p>
      </div>
    );
  }

  if (compact) {
    // Compact widget view
    const { current, deltas } = comparison;
    const overallTrend = deltas?.overallScore || 0;

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-garmin-blue" />
            <h3 className="font-semibold">Trends</h3>
          </div>
          <span className="text-xs text-slate-400">
            vs {formatDate(comparison.previous?.date || '')}
          </span>
        </div>

        <div className="text-center mb-4">
          <div className={`text-4xl font-bold ${
            current!.metrics.overallScore >= 80 ? 'text-green-400' :
            current!.metrics.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {current!.metrics.overallScore}
          </div>
          <div className={`text-sm ${
            overallTrend > 0 ? 'text-green-400' : overallTrend < 0 ? 'text-red-400' : 'text-slate-400'
          }`}>
            {overallTrend > 0 ? '+' : ''}{overallTrend} from last report
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { label: 'Sleep', delta: deltas?.sleepScore || 0 },
            { label: 'Stress', delta: deltas?.stressScore || 0 },
            { label: 'Recovery', delta: deltas?.recoveryScore || 0 },
            { label: 'Activity', delta: deltas?.activityScore || 0 },
          ].map(({ label, delta }) => (
            <div key={label} className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400">{label}</div>
              <div className={`font-semibold ${
                delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-slate-400'
              }`}>
                {delta > 0 ? '+' : ''}{delta}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full view
  const { current, previous, deltas } = comparison;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-garmin-blue" />
            <h2 className="text-lg font-semibold">Trend Analysis</h2>
          </div>
          <div className="text-sm text-slate-400">
            <Calendar className="w-4 h-4 inline mr-1" />
            {formatDate(previous!.date)} → {formatDate(current!.date)}
          </div>
        </div>

        <p className="text-slate-400 text-sm">
          Comparing your latest metrics with the previous report to track progress.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendCard
          label="Overall Score"
          current={current!.metrics.overallScore}
          previous={previous!.metrics.overallScore}
        />
        <TrendCard
          label="Sleep Score"
          current={current!.metrics.sleepScore}
          previous={previous!.metrics.sleepScore}
        />
        <TrendCard
          label="Stress Score"
          current={current!.metrics.stressScore}
          previous={previous!.metrics.stressScore}
        />
        <TrendCard
          label="Recovery Score"
          current={current!.metrics.recoveryScore}
          previous={previous!.metrics.recoveryScore}
        />
        <TrendCard
          label="Activity Score"
          current={current!.metrics.activityScore}
          previous={previous!.metrics.activityScore}
        />
      </div>

      {/* History Chart (simple text-based) */}
      {history && history.length > 2 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-garmin-blue" />
            <h3 className="font-semibold">Score History</h3>
          </div>

          <div className="space-y-3">
            {history.slice(0, 5).map((snapshot, idx) => {
              const score = snapshot.metrics.overallScore;
              const maxScore = 100;
              const widthPercent = (score / maxScore) * 100;

              return (
                <div key={snapshot.id} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-slate-400 flex-shrink-0">
                    {formatDate(snapshot.date)}
                  </div>
                  <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        score >= 80 ? 'bg-green-500' :
                        score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      } ${idx === 0 ? 'animate-pulse' : ''}`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <div className={`w-8 text-sm font-semibold text-right ${
                    score >= 80 ? 'text-green-400' :
                    score >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="card">
        <h3 className="font-semibold mb-3">Key Takeaways</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          {deltas && Object.entries(deltas).map(([key, delta]) => {
            if (Math.abs(delta) < 3) return null;
            const label = key.replace('Score', '');
            const direction = delta > 0 ? 'improved' : 'declined';
            const icon = delta > 0 ? '📈' : '📉';

            return (
              <li key={key} className="flex items-start gap-2">
                <span>{icon}</span>
                <span>
                  Your <strong className="text-white capitalize">{label}</strong> score has{' '}
                  {direction} by <strong className={delta > 0 ? 'text-green-400' : 'text-red-400'}>
                    {Math.abs(delta)} points
                  </strong>
                </span>
              </li>
            );
          }).filter(Boolean)}
          {deltas && Object.values(deltas).every(d => Math.abs(d) < 3) && (
            <li className="text-slate-400">
              Your metrics are relatively stable compared to your last report.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
