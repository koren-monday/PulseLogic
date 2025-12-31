interface ScoreCardProps {
  label: string;
  score: number;
  delta?: number;
  isPrimary?: boolean;
}

export function ScoreCard({ label, score, delta, isPrimary = false }: ScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-400';
    if (delta < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const formatDelta = (delta: number) => {
    if (delta > 0) return `+${delta}`;
    return delta.toString();
  };

  return (
    <div
      className={`
        rounded-lg p-3 text-center
        ${isPrimary ? 'bg-garmin-blue/20 border border-garmin-blue/30' : 'bg-slate-700/50'}
      `}
    >
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
        {score}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className={`text-xs mt-1 ${getDeltaColor(delta)}`}>
          {formatDelta(delta)}
        </div>
      )}
    </div>
  );
}
