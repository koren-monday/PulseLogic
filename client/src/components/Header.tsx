import { Activity, Settings, LogOut, User, History, Target, TrendingUp, Zap } from 'lucide-react';
import { useTierBadge } from '../contexts/SubscriptionContext';

interface HeaderProps {
  displayName?: string;
  onSettingsClick?: () => void;
  onHistoryClick?: () => void;
  onActionsClick?: () => void;
  onTrendsClick?: () => void;
  onSnapshotClick?: () => void;
  onLogout?: () => void;
}

export function Header({ displayName, onSettingsClick, onHistoryClick, onActionsClick, onTrendsClick, onSnapshotClick, onLogout }: HeaderProps) {
  const isLoggedIn = !!displayName;
  const tierBadge = useTierBadge();

  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-garmin-blue" />
        <div>
          <h1 className="text-xl font-bold text-white">Garmin Insights Engine</h1>
          <p className="text-slate-400 text-xs">AI-Powered Health Analysis</p>
        </div>
      </div>

      {isLoggedIn && (
        <div className="flex items-center gap-3">
          {/* User Info */}
          <div className="flex items-center gap-2 text-slate-400">
            <User className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{displayName}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded text-white ${tierBadge.color}`}>
              {tierBadge.label}
            </span>
          </div>

          {/* Quick Snapshot Button - Primary action */}
          {onSnapshotClick && (
            <button
              onClick={onSnapshotClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 rounded-lg transition-colors"
              title="Quick Daily Snapshot"
            >
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Today</span>
            </button>
          )}

          {/* History Button */}
          {onHistoryClick && (
            <button
              onClick={onHistoryClick}
              className="p-2 text-slate-400 hover:text-garmin-blue hover:bg-slate-700 rounded-lg transition-colors"
              title="Report History"
            >
              <History className="w-5 h-5" />
            </button>
          )}

          {/* Actions Button */}
          {onActionsClick && (
            <button
              onClick={onActionsClick}
              className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
              title="Action Tracker"
            >
              <Target className="w-5 h-5" />
            </button>
          )}

          {/* Trends Button */}
          {onTrendsClick && (
            <button
              onClick={onTrendsClick}
              className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded-lg transition-colors"
              title="Trend Analysis"
            >
              <TrendingUp className="w-5 h-5" />
            </button>
          )}

          {/* Settings Button */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
