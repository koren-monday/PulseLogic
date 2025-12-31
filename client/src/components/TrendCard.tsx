import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendCardProps {
  label: string;
  current: number;
  previous: number;
  showDelta?: boolean;
}

export function TrendCard({ label, current, previous, showDelta = true }: TrendCardProps) {
  const delta = current - previous;
  const percentChange = previous !== 0 ? Math.round((delta / previous) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTrendIcon = () => {
    if (delta > 2) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (delta < -2) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getDeltaColor = () => {
    if (delta > 2) return 'text-green-400';
    if (delta < -2) return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{label}</span>
        {showDelta && getTrendIcon()}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${getScoreColor(current)}`}>
          {current}
        </span>
        {showDelta && (
          <span className={`text-sm ${getDeltaColor()}`}>
            {delta > 0 ? '+' : ''}{delta}
            {percentChange !== 0 && (
              <span className="text-xs ml-1">({percentChange > 0 ? '+' : ''}{percentChange}%)</span>
            )}
          </span>
        )}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Previous: {previous}
      </div>
    </div>
  );
}
