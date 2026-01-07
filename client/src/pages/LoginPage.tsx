import { useState, useEffect } from 'react';
import { Activity, User, Eye, EyeOff, LogIn, Shield, X, CheckCircle, RefreshCw } from 'lucide-react';
import { useGarminLogin, useGarminMFA, useGarminRestore } from '../hooks';
import { Alert } from '../components/Alert';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { getGarminEmail } from '../utils/storage';
import { clearAllAuthData } from '../utils/storage';
import { signInWithToken } from '../config/firebase';
import type { GarminCredentials } from '../types';

interface LoginPageProps {
  onLoginSuccess: (userId: string, displayName: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  // Check for stored email to pre-fill and attempt restore
  const storedEmail = getGarminEmail();

  const [credentials, setCredentials] = useState<GarminCredentials>({
    username: storedEmail || '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isRestoring, setIsRestoring] = useState(!!storedEmail);
  const [restoreAttempted, setRestoreAttempted] = useState(false);

  // MFA state
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const loginMutation = useGarminLogin();
  const mfaMutation = useGarminMFA();
  const restoreMutation = useGarminRestore();

  // Attempt to restore session on mount if we have a stored email
  useEffect(() => {
    if (storedEmail && !restoreAttempted) {
      setRestoreAttempted(true);

      // Set up a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.warn('Session restore timed out');
        clearAllAuthData();
        setIsRestoring(false);
      }, 5000); // 5 second timeout

      restoreMutation.mutate(storedEmail, {
        onSuccess: async (session) => {
          clearTimeout(timeout);
          if (session?.isAuthenticated) {
            // Sign in to Firebase with custom token (silent - user doesn't see this)
            if (session.firebaseToken) {
              await signInWithToken(session.firebaseToken).catch(err => {
                console.warn('Firebase sign-in failed, continuing with Garmin auth:', err);
              });
            }
            onLoginSuccess(session.userId || session.sessionId, session.displayName || storedEmail);
          } else {
            // Restore failed - clear stored data to force fresh login
            clearAllAuthData();
            setIsRestoring(false);
          }
        },
        onError: (error) => {
          clearTimeout(timeout);
          console.error('Session restore failed:', error);
          // Clear all stored auth data on restore failure
          clearAllAuthData();
          setIsRestoring(false);
        },
      });
    } else if (!storedEmail) {
      setIsRestoring(false);
    }
  }, [storedEmail, restoreAttempted, restoreMutation, onLoginSuccess]);

  const handleLogin = async () => {
    try {
      const result = await loginMutation.mutateAsync(credentials);

      if (result.requiresMFA && result.mfaSessionId) {
        setMfaSessionId(result.mfaSessionId);
        setShowMFADialog(true);
      } else if (result.isAuthenticated) {
        // Sign in to Firebase with custom token (silent - user doesn't see this)
        if (result.firebaseToken) {
          await signInWithToken(result.firebaseToken).catch(err => {
            console.warn('Firebase sign-in failed, continuing with Garmin auth:', err);
          });
        }
        onLoginSuccess(result.userId || result.sessionId, result.displayName || credentials.username);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleMFASubmit = async () => {
    if (!mfaSessionId || !mfaCode) return;
    try {
      const result = await mfaMutation.mutateAsync({ mfaSessionId, code: mfaCode, email: credentials.username });
      if (result.isAuthenticated) {
        // Sign in to Firebase with custom token (silent - user doesn't see this)
        if (result.firebaseToken) {
          await signInWithToken(result.firebaseToken).catch(err => {
            console.warn('Firebase sign-in failed, continuing with Garmin auth:', err);
          });
        }
        setShowMFADialog(false);
        onLoginSuccess(result.userId || result.sessionId, result.displayName || credentials.username);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleMFACancel = () => {
    setShowMFADialog(false);
    setMfaCode('');
    setMfaSessionId(null);
  };

  // Show restoring session UI while attempting to restore
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Activity className="w-12 h-12 text-garmin-blue" />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Garmin Insights</h1>
              <p className="text-slate-400 text-sm">AI-Powered Health Analysis</p>
            </div>
          </div>
          <div className="card flex flex-col items-center py-8">
            <RefreshCw className="w-8 h-8 text-garmin-blue animate-spin mb-4" />
            <p className="text-lg font-medium">Restoring your session...</p>
            <p className="text-slate-400 text-sm mt-2">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Activity className="w-12 h-12 text-garmin-blue" />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Garmin Insights</h1>
            <p className="text-slate-400 text-sm">AI-Powered Health Analysis</p>
          </div>
        </div>

        {/* Login Card */}
        <div className={`card relative ${loginMutation.isPending ? 'pointer-events-none' : ''}`}>
          <LoadingOverlay isLoading={loginMutation.isPending} type="syncing" message="Signing in to Garmin..." />
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-garmin-blue" />
            <h2 className="text-lg font-semibold">Sign in with Garmin Connect</h2>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            Enter your Garmin Connect credentials. We use these to securely fetch your health data.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={credentials.username}
                onChange={e => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginMutation.isError && (
              <Alert type="error" message={loginMutation.error?.message || 'Login failed'} />
            )}

            <button
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              onClick={handleLogin}
              disabled={!credentials.username || !credentials.password || loginMutation.isPending}
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
          </div>

          <p className="text-slate-500 text-xs text-center mt-4">
            Your credentials are sent securely to Garmin and are not stored.
          </p>
        </div>

        {/* MFA Dialog */}
        {showMFADialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className={`bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 border border-slate-700 relative ${mfaMutation.isPending ? 'pointer-events-none' : ''}`}>
              <LoadingOverlay isLoading={mfaMutation.isPending} type="syncing" message="Verifying code..." />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-garmin-blue" />
                  <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                </div>
                <button onClick={handleMFACancel} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-400 text-sm mb-4">
                Enter the verification code from your authenticator app or SMS.
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  className="input-field text-center text-2xl tracking-widest"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleMFASubmit()}
                />

                {mfaMutation.isError && (
                  <Alert type="error" message={mfaMutation.error?.message || 'MFA verification failed'} />
                )}

                <div className="flex gap-3">
                  <button
                    className="btn-secondary flex-1"
                    onClick={handleMFACancel}
                    disabled={mfaMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    onClick={handleMFASubmit}
                    disabled={mfaCode.length < 4 || mfaMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
