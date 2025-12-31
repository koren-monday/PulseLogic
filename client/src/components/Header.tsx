import { Activity, Settings, LogOut, User, History, Target, TrendingUp } from 'lucide-react';

interface HeaderProps {
  displayName?: string;
  onSettingsClick?: () => void;
  onHistoryClick?: () => void;
  onActionsClick?: () => void;
  onTrendsClick?: () => void;
  onLogout?: () => void;
}

export function Header({ displayName, onSettingsClick, onHistoryClick, onActionsClick, onTrendsClick, onLogout }: HeaderProps) {
  const isLoggedIn = !!displayName;

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
          </div>

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
