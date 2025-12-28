import { useState } from 'react';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { ConfigStep } from './pages/ConfigStep';
import { DataStep } from './pages/DataStep';
import { AnalysisStep } from './pages/AnalysisStep';
import type { WizardStep, GarminHealthData, LLMProvider } from './types';

function App() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('config');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

  // State passed between steps
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [healthData, setHealthData] = useState<GarminHealthData | null>(null);

  const markCompleted = (step: WizardStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const handleConfigComplete = (config: {
    garminAuthenticated: boolean;
    llmApiKeys: Partial<Record<LLMProvider, string>>;
    selectedProvider: LLMProvider;
    selectedModel: string;
  }) => {
    setSelectedProvider(config.selectedProvider);
    setSelectedModel(config.selectedModel);
    markCompleted('config');
    setCurrentStep('data');
  };

  const handleDataComplete = (data: GarminHealthData) => {
    setHealthData(data);
    markCompleted('data');
    setCurrentStep('analysis');
  };

  const handleReset = () => {
    setCurrentStep('config');
    setCompletedSteps(new Set());
    setHealthData(null);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <Header />
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        {currentStep === 'config' && <ConfigStep onComplete={handleConfigComplete} />}

        {currentStep === 'data' && (
          <DataStep
            onComplete={handleDataComplete}
            onBack={() => setCurrentStep('config')}
          />
        )}

        {currentStep === 'analysis' && healthData && (
          <AnalysisStep
            healthData={healthData}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onBack={() => setCurrentStep('data')}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

export default App;
