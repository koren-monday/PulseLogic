import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './pages/LoginPage';
import { DataStep } from './pages/DataStep';
import { AnalysisStep } from './pages/AnalysisStep';
import {
  getUserSettings,
  storeUserSettings,
  storeCurrentUserId,
  getCurrentUserId,
  clearSession,
  type UserSettings,
} from './utils/storage';
import type { GarminHealthData, LLMProvider } from './types';

type AppStep = 'data' | 'analysis';

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  // App state
  const [currentStep, setCurrentStep] = useState<AppStep>('data');
  const [healthData, setHealthData] = useState<GarminHealthData | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  const handleLoginSuccess = (newUserId: string, newDisplayName: string) => {
    setUserId(newUserId);
    setDisplayName(newDisplayName);
    storeCurrentUserId(newUserId);
    setUserSettings(getUserSettings(newUserId));
    setIsLoggedIn(true);

    // Check if user has API key configured, if not show settings
    const settings = getUserSettings(newUserId);
    const hasApiKey = Object.values(settings.apiKeys).some(Boolean);
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

  const handleSettingsSave = (newSettings: UserSettings) => {
    if (userId) {
      storeUserSettings(userId, newSettings);
      setUserSettings(newSettings);
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
          onSettingsClick={() => setShowSettings(true)}
          onLogout={handleLogout}
        />

        {currentStep === 'data' && (
          <DataStep
            onComplete={handleDataComplete}
            onBack={handleLogout}
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
