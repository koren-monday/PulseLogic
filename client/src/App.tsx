import { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Activity } from 'lucide-react';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { Paywall } from './components/Paywall';
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
  storeUserSettings,
  storeCurrentUserId,
  getCurrentUserId,
  hasValidStoredSession,
  getGarminEmail,
  type UserSettings,
} from './utils/storage';
import { syncOnLogin, syncReportsAndActionsOnLogin } from './services/sync.service';
import { loginToPurchases } from './services/purchases';
import { performLogout, validateSessionWithServer } from './utils/auth-helpers';
import { AUTH_ERROR_EVENT, restoreGarminSession } from './services/api';
import { signInWithToken } from './config/firebase';
import type { GarminHealthData } from './types';
import type { SavedReport } from './db/schema';

type AppStep = 'data' | 'analysis' | 'history' | 'actions' | 'trends';

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isValidatingSession, setIsValidatingSession] = useState(true);

  // App state
  const [currentStep, setCurrentStep] = useState<AppStep>('data');
  const [healthData, setHealthData] = useState<GarminHealthData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);

  // User settings (loaded after login)
  // Note: With simplified tiers, settings only include model preference
  const [userSettings, setUserSettings] = useState<UserSettings>({
    preferAdvancedModel: false,
  });

  // Listen for auth errors from API and trigger logout
  useEffect(() => {
    const handleAuthError = () => {
      console.warn('Auth error detected - logging out');
      handleLogout();
    };

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for existing session on mount and restore with full sync
  useEffect(() => {
    const validateAndRestoreSession = async () => {
      try {
        // Check if we have stored session data
        if (!hasValidStoredSession()) {
          setIsValidatingSession(false);
          return;
        }

        const storedUserId = getCurrentUserId();
        const storedEmail = getGarminEmail();

        if (!storedUserId || !storedEmail) {
          setIsValidatingSession(false);
          return;
        }

        // First, do a quick validation check
        const isValid = await validateSessionWithServer();

        if (!isValid) {
          console.warn('Stored session is invalid or expired');
          await performLogout();
          setIsValidatingSession(false);
          return;
        }

        // Session is valid - now restore with full sync
        try {
          const session = await restoreGarminSession(storedEmail);

          if (session?.isAuthenticated) {
            // Sign in to Firebase with custom token
            if (session.firebaseToken) {
              await signInWithToken(session.firebaseToken).catch(err => {
                console.warn('Firebase sign-in failed, continuing with Garmin auth:', err);
              });
            }

            // Set auth state
            setUserId(storedUserId);
            setDisplayName(session.displayName || storedUserId);

            // Login to RevenueCat
            loginToPurchases(storedUserId).catch(console.error);

            // Sync user data from cloud (life contexts, etc.)
            const syncedSettings = await syncOnLogin(storedUserId);
            setUserSettings(syncedSettings);
            setIsLoggedIn(true);

            // Sync reports and actions in background
            syncReportsAndActionsOnLogin(storedUserId);
          } else {
            // Restore failed
            console.warn('Session restore failed');
            await performLogout();
          }
        } catch (restoreError) {
          console.error('Full session restore failed:', restoreError);
          await performLogout();
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        await performLogout();
      } finally {
        setIsValidatingSession(false);
      }
    };

    validateAndRestoreSession();
  }, []);

  // Handle Android back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // Close modals first
      if (showPaywall) {
        setShowPaywall(false);
        return;
      }
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showSnapshot) {
        setShowSnapshot(false);
        return;
      }
      if (viewingReport) {
        setViewingReport(null);
        return;
      }

      // Navigate within app
      if (currentStep !== 'data') {
        setCurrentStep('data');
        setHealthData(null);
        return;
      }

      // At root - use browser history or exit
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [currentStep, showPaywall, showSettings, showSnapshot, viewingReport]);

  const handleLoginSuccess = async (newUserId: string, newDisplayName: string) => {
    setUserId(newUserId);
    setDisplayName(newDisplayName);
    storeCurrentUserId(newUserId);

    // Login to RevenueCat with the userId (Firebase UID or email)
    loginToPurchases(newUserId).catch(console.error);

    // Sync with cloud (only life contexts now - no API key settings)
    const syncedSettings = await syncOnLogin(newUserId);
    setUserSettings(syncedSettings);
    setIsLoggedIn(true);

    // Sync reports and actions from cloud in background
    syncReportsAndActionsOnLogin(newUserId);
  };

  const handleLogout = async () => {
    // Perform comprehensive logout (clears local state immediately)
    await performLogout();

    // Update UI state
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

  // Show loading while validating session
  if (isValidatingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-garmin-blue animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Validating session...</p>
        </div>
      </div>
    );
  }

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
            onUpgradeClick={() => setShowPaywall(true)}
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
              onDeleteAccount={async () => {
                setShowSettings(false);
                await handleLogout();
              }}
            />
          )}

          {showSnapshot && (
            <QuickDailySnapshot onClose={() => setShowSnapshot(false)} />
          )}

          <Paywall
            isOpen={showPaywall}
            onClose={() => setShowPaywall(false)}
            onSubscribed={() => {
              // Refresh subscription context on successful subscription
              window.location.reload();
            }}
          />
        </div>
      </div>
    </SubscriptionProvider>
  );
}

export default App;
