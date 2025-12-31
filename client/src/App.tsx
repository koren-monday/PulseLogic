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
import {
  getUserSettings,
  storeUserSettings,
  storeCurrentUserId,
  getCurrentUserId,
  clearSession,
  type UserSettings,
} from './utils/storage';
import { syncOnLogin, pushSettingsToCloud, syncReportsAndActionsOnLogin } from './services/sync.service';
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
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);

  // User settings (loaded after login)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    selectedProvider: 'openai',
    selectedModel: 'gpt-5.2',
    apiKeys: {},
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

    // Sync with cloud and get merged settings
    const syncedSettings = await syncOnLogin(newUserId);
    setUserSettings(syncedSettings);
    setIsLoggedIn(true);

    // Sync reports and actions from cloud in background
    syncReportsAndActionsOnLogin(newUserId);

    // Check if user has API key configured, if not show settings
    const hasApiKey = Object.values(syncedSettings.apiKeys).some(Boolean);
    if (!hasApiKey) {
      setShowSettings(true);
    }
  };

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setUserId(null);
    setDisplayName('');
    setCurrentStep('data');
    setHealthData(null);
    setUserSettings({
      selectedProvider: 'openai',
      selectedModel: 'gpt-5.2',
      apiKeys: {},
    });
  };

  const handleSettingsSave = async (newSettings: UserSettings) => {
    if (userId) {
      storeUserSettings(userId, newSettings);
      setUserSettings(newSettings);
      // Sync to cloud in background
      pushSettingsToCloud(userId, newSettings);
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
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <Header
          displayName={displayName}
          onHistoryClick={() => {
            setViewingReport(null);
            setCurrentStep('history');
          }}
          onActionsClick={() => setCurrentStep('actions')}
          onTrendsClick={() => setCurrentStep('trends')}
          onSettingsClick={() => setShowSettings(true)}
          onLogout={handleLogout}
        />

        {currentStep === 'data' && (
          <DataStep
            onComplete={handleDataComplete}
            onBack={handleLogout}
            userSettings={userSettings}
          />
        )}

        {currentStep === 'analysis' && healthData && (
          <AnalysisStep
            healthData={healthData}
            selectedProvider={userSettings.selectedProvider}
            selectedModel={userSettings.selectedModel}
            userSettings={userSettings}
            onBack={() => setCurrentStep('data')}
            onReset={handleReset}
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

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={userSettings}
          onSave={handleSettingsSave}
        />
      </div>
    </div>
  );
}

export default App;
