import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './pages/LoginPage';
import { DataStep } from './pages/DataStep';
import { AnalysisStep } from './pages/AnalysisStep';
import { ReportHistory } from './components/ReportHistory';
import { ReportViewer } from './components/ReportViewer';
import { ActionTracker } from './components/ActionTracker';
import { TrendComparison } from './components/TrendComparison';
import { QuickDailySnapshot } from './components/QuickDailySnapshot';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import {
  getUserSettings,
  storeUserSettings,
  storeCurrentUserId,
  getCurrentUserId,
  clearSession,
  type UserSettings,
} from './utils/storage';
import { syncOnLogin, syncReportsAndActionsOnLogin } from './services/sync.service';
import { clearAllData } from './services/storage.service';
import type { GarminHealthData } from './types';
import type { SavedReport } from './db/schema';

type AppStep = 'data' | 'analysis' | 'history' | 'actions' | 'trends';

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  // App state
  const [currentStep, setCurrentStep] = useState<AppStep>('data');
  const [healthData, setHealthData] = useState<GarminHealthData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);

  // User settings (loaded after login)
  // Note: With simplified tiers, settings only include model preference
  const [userSettings, setUserSettings] = useState<UserSettings>({
    preferAdvancedModel: false,
  });

  // Check for existing session on mount
  useEffect(() => {
    const storedUserId = getCurrentUserId();
    if (storedUserId) {
      setUserId(storedUserId);
      setDisplayName(storedUserId); // Use userId as fallback display name
      setUserSettings(getUserSettings(storedUserId));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = async (newUserId: string, newDisplayName: string) => {
    setUserId(newUserId);
    setDisplayName(newDisplayName);
    storeCurrentUserId(newUserId);

    // Sync with cloud (only life contexts now - no API key settings)
    const syncedSettings = await syncOnLogin(newUserId);
    setUserSettings(syncedSettings);
    setIsLoggedIn(true);

    // Sync reports and actions from cloud in background
    syncReportsAndActionsOnLogin(newUserId);
  };

  const handleLogout = async () => {
    clearSession();
    // Clear IndexedDB to prevent data leaking between accounts
    await clearAllData();
    setIsLoggedIn(false);
    setUserId(null);
    setDisplayName('');
    setCurrentStep('data');
    setHealthData(null);
    setUserSettings({
      preferAdvancedModel: false,
    });
  };

  const handleSettingsSave = async (newSettings: UserSettings) => {
    if (userId) {
      storeUserSettings(userId, newSettings);
      setUserSettings(newSettings);
      // Note: Settings are now stored locally only (no cloud sync needed for preferences)
    }
  };

  const handleDataComplete = (data: GarminHealthData) => {
    setHealthData(data);
    setCurrentStep('analysis');
  };

  const handleReset = () => {
    setCurrentStep('data');
    setHealthData(null);
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Main app content (logged in)
  return (
    <SubscriptionProvider userId={userId}>
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 pb-12">
          <Header
            displayName={displayName}
            onSnapshotClick={() => setShowSnapshot(true)}
            onHistoryClick={() => {
              setViewingReport(null);
              setCurrentStep('history');
            }}
            onActionsClick={() => setCurrentStep('actions')}
            onTrendsClick={() => setCurrentStep('trends')}
            onSettingsClick={() => setShowSettings(true)}
            onLogout={handleLogout}
          />

          {currentStep === 'data' && userId && (
            <DataStep
              onComplete={handleDataComplete}
              onBack={handleLogout}
              userId={userId}
              preferAdvancedModel={userSettings.preferAdvancedModel}
            />
          )}

          {currentStep === 'analysis' && healthData && userId && (
            <AnalysisStep
              healthData={healthData}
              userId={userId}
              preferAdvancedModel={userSettings.preferAdvancedModel}
              onBack={() => setCurrentStep('data')}
              onReset={handleReset}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}

          {currentStep === 'history' && (
            viewingReport ? (
              <ReportViewer
                report={viewingReport}
                onClose={() => setViewingReport(null)}
              />
            ) : (
              <div className="space-y-6">
                <ReportHistory
                  onViewReport={(report) => setViewingReport(report)}
                />
                <button
                  className="btn-secondary w-full"
                  onClick={() => setCurrentStep('data')}
                >
                  Back to New Analysis
                </button>
              </div>
            )
          )}

          {currentStep === 'actions' && (
            <ActionTracker onClose={() => setCurrentStep('data')} />
          )}

          {currentStep === 'trends' && (
            <TrendComparison onClose={() => setCurrentStep('data')} />
          )}

          {userId && (
            <SettingsModal
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              userId={userId}
              settings={userSettings}
              onSave={handleSettingsSave}
            />
          )}

          {showSnapshot && (
            <QuickDailySnapshot onClose={() => setShowSnapshot(false)} />
          )}
        </div>
      </div>
    </SubscriptionProvider>
  );
}

export default App;
