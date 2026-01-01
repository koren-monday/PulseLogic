import { useState, useEffect } from 'react';
import { User, Key, Eye, EyeOff, LogIn, CheckCircle, Cpu, Shield, X } from 'lucide-react';
import { useGarminLogin, useGarminMFA, useGarminStatus, useModelRegistry } from '../hooks';
import { Alert } from '../components/Alert';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { storeApiKey, getApiKey } from '../utils/storage';
import type { LLMProvider, GarminCredentials } from '../types';

interface ConfigStepProps {
  onComplete: (config: {
    garminAuthenticated: boolean;
    llmApiKeys: Partial<Record<LLMProvider, string>>;
    selectedProvider: LLMProvider;
    selectedModel: string;
  }) => void;
}

export function ConfigStep({ onComplete }: ConfigStepProps) {
  // Garmin credentials
  const [garminCreds, setGarminCreds] = useState<GarminCredentials>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // MFA state
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  // LLM API keys
  const [apiKeys, setApiKeys] = useState<Partial<Record<LLMProvider, string>>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<LLMProvider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('openai');
  const [selectedModels, setSelectedModels] = useState<Partial<Record<LLMProvider, string>>>({});

  // Fetch model registry from server
  const { data: modelRegistry, isLoading: modelsLoading } = useModelRegistry();

  // Load saved API keys on mount
  useEffect(() => {
    const loadedKeys: Partial<Record<LLMProvider, string>> = {};
    const providerIds: LLMProvider[] = ['openai', 'anthropic', 'google'];
    providerIds.forEach(p => {
      const key = getApiKey(p);
      if (key) loadedKeys[p] = key;
    });
    setApiKeys(loadedKeys);
  }, []);

  // Set default models when registry loads
  useEffect(() => {
    if (modelRegistry) {
      const defaults: Partial<Record<LLMProvider, string>> = {};
      (Object.keys(modelRegistry) as LLMProvider[]).forEach(provider => {
        defaults[provider] = modelRegistry[provider].defaultModel;
      });
      setSelectedModels(defaults);
    }
  }, [modelRegistry]);

  // Garmin auth hooks
  const { data: garminStatus, isLoading: statusLoading } = useGarminStatus();
  const loginMutation = useGarminLogin();
  const mfaMutation = useGarminMFA();

  const handleGarminLogin = async () => {
    try {
      const result = await loginMutation.mutateAsync(garminCreds);
      // Check if MFA is required
      if (result.requiresMFA && result.mfaSessionId) {
        setMfaSessionId(result.mfaSessionId);
        setShowMFADialog(true);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleMFASubmit = async () => {
    if (!mfaSessionId || !mfaCode) return;
    try {
      await mfaMutation.mutateAsync({ mfaSessionId, code: mfaCode, email: garminCreds.username });
      setShowMFADialog(false);
      setMfaCode('');
      setMfaSessionId(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleMFACancel = () => {
    setShowMFADialog(false);
    setMfaCode('');
    setMfaSessionId(null);
  };

  const handleApiKeyChange = (provider: LLMProvider, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
    if (value) {
      storeApiKey(provider, value);
    }
  };

  const handleModelChange = (provider: LLMProvider, modelId: string) => {
    setSelectedModels(prev => ({ ...prev, [provider]: modelId }));
  };

  const handleContinue = () => {
    onComplete({
      garminAuthenticated: garminStatus?.authenticated ?? false,
      llmApiKeys: apiKeys,
      selectedProvider,
      selectedModel: selectedModels[selectedProvider] || modelRegistry?.[selectedProvider].defaultModel || '',
    });
  };

  const isGarminReady = garminStatus?.authenticated || mfaMutation.isSuccess || (loginMutation.isSuccess && loginMutation.data?.isAuthenticated);
  const hasSelectedApiKey = !!apiKeys[selectedProvider];
  const canContinue = isGarminReady && hasSelectedApiKey;

  return (
    <div className="space-y-6">
      {/* Garmin Authentication Section */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-garmin-blue" />
          <h2 className="text-lg font-semibold">Garmin Connect Authentication</h2>
        </div>

        {statusLoading ? (
          <LoadingSpinner message="Checking session..." size="sm" />
        ) : isGarminReady ? (
          <Alert type="success" message="Connected to Garmin Connect!" />
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-4">
              Enter your Garmin Connect credentials. These are sent securely to our server
              and are not stored.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={garminCreds.username}
                  onChange={e => setGarminCreds(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    value={garminCreds.password}
                    onChange={e => setGarminCreds(prev => ({ ...prev, password: e.target.value }))}
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
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={handleGarminLogin}
                disabled={!garminCreds.username || !garminCreds.password || loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Connect to Garmin
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* LLM Provider & Model Selection */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-garmin-blue" />
          <h2 className="text-lg font-semibold">LLM Provider & Model</h2>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Select a provider, model, and enter your API key. Keys are stored locally in your browser.
        </p>

        {modelsLoading ? (
          <LoadingSpinner message="Loading available models..." size="sm" />
        ) : modelRegistry ? (
          <div className="space-y-4">
            {(Object.keys(modelRegistry) as LLMProvider[]).map(providerId => {
              const config = modelRegistry[providerId];
              return (
                <div key={providerId} className="border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="radio"
                      id={`provider-${providerId}`}
                      name="provider"
                      checked={selectedProvider === providerId}
                      onChange={() => setSelectedProvider(providerId)}
                      className="text-garmin-blue"
                    />
                    <label htmlFor={`provider-${providerId}`} className="text-sm font-medium">
                      {config.name}
                    </label>
                    {apiKeys[providerId] && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>

                  {/* Model Selection */}
                  <div className="ml-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-400" />
                      <select
                        className="input-field text-sm flex-1"
                        value={selectedModels[providerId] || config.defaultModel}
                        onChange={e => handleModelChange(providerId, e.target.value)}
                      >
                        {config.models.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} - {model.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* API Key Input */}
                    <div className="relative">
                      <input
                        type={showApiKeys[providerId] ? 'text' : 'password'}
                        className="input-field pr-10 text-sm"
                        placeholder={`Enter ${config.name} API key...`}
                        value={apiKeys[providerId] || ''}
                        onChange={e => handleApiKeyChange(providerId, e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        onClick={() => setShowApiKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))}
                      >
                        {showApiKeys[providerId] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Alert type="error" message="Failed to load available models" />
        )}
      </div>

      {/* Continue Button */}
      <button
        className="btn-primary w-full text-lg py-3"
        onClick={handleContinue}
        disabled={!canContinue}
      >
        Continue to Data Fetching
      </button>

      {!canContinue && (
        <p className="text-center text-slate-400 text-sm">
          {!isGarminReady
            ? 'Please connect to Garmin first'
            : 'Please enter an API key for the selected provider'}
        </p>
      )}

      {/* MFA Dialog */}
      {showMFADialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-garmin-blue" />
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
              </div>
              <button
                onClick={handleMFACancel}
                className="text-slate-400 hover:text-white"
              >
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
                  {mfaMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
