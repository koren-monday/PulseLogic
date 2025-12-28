import { Check } from 'lucide-react';
import type { WizardStep } from '../types';

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
}

const steps: { key: WizardStep; label: string; number: number }[] = [
  { key: 'config', label: 'Configuration', number: 1 },
  { key: 'data', label: 'Fetch Data', number: 2 },
  { key: 'analysis', label: 'AI Analysis', number: 3 },
];

export function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {steps.map((step, index) => {
        const isActive = currentStep === step.key;
        const isCompleted = completedSteps.has(step.key);

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  transition-colors duration-200
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-garmin-blue text-white'
                    : 'bg-slate-700 text-slate-400'}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.number}
              </div>
              <span
                className={`mt-2 text-sm ${
                  isActive ? 'text-white font-medium' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 ${
                  completedSteps.has(steps[index + 1].key) || completedSteps.has(step.key)
                    ? 'bg-green-500'
                    : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
