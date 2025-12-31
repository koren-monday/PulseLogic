import { useState } from 'react';
import { CheckCircle2, Circle, X, Clock, RotateCcw, Flame, ChevronDown, ChevronUp } from 'lucide-react';
import type { TrackedAction } from '../db/schema';

interface ActionCardProps {
  action: TrackedAction;
  onLogProgress: (actionId: string, completed: boolean, notes?: string) => void;
  onComplete: (actionId: string) => void;
  onDismiss: (actionId: string) => void;
  onSnooze: (actionId: string) => void;
  onReactivate: (actionId: string) => void;
}

export function ActionCard({
  action,
  onLogProgress,
  onComplete,
  onDismiss,
  onSnooze,
  onReactivate,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayEntry = action.trackingHistory.find(h => h.date === today);
  const isCompletedToday = todayEntry?.completed === true;

  const priorityColors = {
    high: 'border-red-500/50 bg-red-500/5',
    medium: 'border-yellow-500/50 bg-yellow-500/5',
    low: 'border-green-500/50 bg-green-500/5',
  };

  const priorityBadgeColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };

  const categoryIcons: Record<string, string> = {
    sleep: '😴',
    stress: '🧘',
    activity: '🏃',
    recovery: '💪',
    lifestyle: '🌟',
  };

  const handleToggleToday = () => {
    onLogProgress(action.id, !isCompletedToday, notes || undefined);
    setNotes('');
  };

  if (action.status !== 'active') {
    return (
      <div className="p-3 bg-slate-700/30 rounded-lg opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {action.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            )}
            {action.status === 'dismissed' && (
              <X className="w-4 h-4 text-slate-400" />
            )}
            {action.status === 'snoozed' && (
              <Clock className="w-4 h-4 text-yellow-400" />
            )}
            <span className="text-sm text-slate-400 line-through">
              {action.recommendation.text}
            </span>
          </div>
          {action.status === 'snoozed' && (
            <button
              onClick={() => onReactivate(action.id)}
              className="p-1 text-slate-400 hover:text-white"
              title="Reactivate"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        border rounded-lg overflow-hidden transition-all
        ${priorityColors[action.recommendation.priority]}
      `}
    >
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Toggle Button */}
          <button
            onClick={handleToggleToday}
            className={`
              flex-shrink-0 mt-0.5 transition-colors
              ${isCompletedToday
                ? 'text-green-400 hover:text-green-300'
                : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            {isCompletedToday ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">
                {categoryIcons[action.recommendation.category] || '📋'}
              </span>
              <span
                className={`
                  text-sm font-medium
                  ${isCompletedToday ? 'text-slate-400 line-through' : 'text-white'}
                `}
              >
                {action.recommendation.text}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded ${priorityBadgeColors[action.recommendation.priority]}`}>
                {action.recommendation.priority}
              </span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                {action.recommendation.trackingType}
              </span>
              {action.currentStreak > 0 && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {action.currentStreak} day streak
                </span>
              )}
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-white"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
          {/* Evidence */}
          <div className="mt-3">
            <div className="text-xs text-slate-400 mb-1">Why this matters</div>
            <p className="text-sm text-slate-300">{action.recommendation.evidence}</p>
          </div>

          {/* Notes input */}
          <div className="mt-3">
            <input
              type="text"
              className="input-field text-sm"
              placeholder="Add notes for today..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onLogProgress(action.id, true, notes);
                  setNotes('');
                }
              }}
            />
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400">Current Streak</div>
              <div className="text-white font-semibold">{action.currentStreak} days</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400">Longest Streak</div>
              <div className="text-white font-semibold">{action.longestStreak} days</div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2 justify-end">
            <button
              onClick={() => onSnooze(action.id)}
              className="text-xs px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Snooze
            </button>
            <button
              onClick={() => onDismiss(action.id)}
              className="text-xs px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => onComplete(action.id)}
              className="text-xs px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
            >
              Mark Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
