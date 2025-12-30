import { useState, useRef, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import type {
  LifeContext,
  LifeContextType,
  DietChangeContext,
  StressEventContext,
  IllnessContext,
  TrainingGoalContext,
} from '../types';
import { LIFE_CONTEXT_LABELS } from '../types';

interface LifeContextSelectorProps {
  contexts: LifeContext[];
  onChange: (contexts: LifeContext[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function LifeContextSelector({ contexts, onChange }: LifeContextSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(contexts.length > 0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addContext = (type: LifeContextType) => {
    const id = generateId();
    let newContext: LifeContext;

    switch (type) {
      case 'new_baby':
        newContext = { id, type, birthDate: '' };
        break;
      case 'pregnancy':
        newContext = { id, type };
        break;
      case 'diet_change':
        newContext = { id, type, dietType: 'other', startDate: '' };
        break;
      case 'stress_event':
        newContext = { id, type, category: 'other', severity: 'moderate', description: '' };
        break;
      case 'illness':
        newContext = { id, type, illnessType: 'other', startDate: '' };
        break;
      case 'travel':
        newContext = { id, type, startDate: '' };
        break;
      case 'training_goal':
        newContext = { id, type, eventType: 'other' };
        break;
      case 'medication':
        newContext = { id, type, medicationName: '', startDate: '' };
        break;
      case 'other':
        newContext = { id, type, description: '' };
        break;
    }

    onChange([...contexts, newContext]);
    setEditingId(id);
    setShowDropdown(false);
    setIsExpanded(true);
  };

  const updateContext = (id: string, updates: Record<string, unknown>) => {
    onChange(contexts.map(ctx => (ctx.id === id ? { ...ctx, ...updates } as LifeContext : ctx)));
  };

  const removeContext = (id: string) => {
    onChange(contexts.filter(ctx => ctx.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const contextTypes = Object.keys(LIFE_CONTEXT_LABELS) as LifeContextType[];

  return (
    <div className="mb-4">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between text-sm font-medium mb-2 text-slate-300 hover:text-white transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-400" />
          <span>Life Context</span>
          {contexts.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-300 rounded-full">
              {contexts.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400">
            Add personal circumstances that may affect your health metrics for more relevant analysis.
          </p>

          {/* Context Cards */}
          {contexts.map(ctx => (
            <ContextCard
              key={ctx.id}
              context={ctx}
              isEditing={editingId === ctx.id}
              onEdit={() => setEditingId(editingId === ctx.id ? null : ctx.id)}
              onUpdate={(updates) => updateContext(ctx.id, updates)}
              onRemove={() => removeContext(ctx.id)}
            />
          ))}

          {/* Add Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Plus className="w-4 h-4" />
              Add Context
            </button>

            {showDropdown && (
              <div className="absolute z-10 mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1">
                {contextTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors"
                    onClick={() => addContext(type)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{LIFE_CONTEXT_LABELS[type].icon}</span>
                      <div>
                        <div className="text-sm text-white">{LIFE_CONTEXT_LABELS[type].label}</div>
                        <div className="text-xs text-slate-400">{LIFE_CONTEXT_LABELS[type].description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ContextCardProps {
  context: LifeContext;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onRemove: () => void;
}

function ContextCard({ context, isEditing, onEdit, onUpdate, onRemove }: ContextCardProps) {
  const meta = LIFE_CONTEXT_LABELS[context.type];

  const getSummary = (): string => {
    switch (context.type) {
      case 'new_baby':
        return context.birthDate ? `Born ${formatDate(context.birthDate)}` : 'Add birth date';
      case 'pregnancy':
        if (context.currentWeek) return `Week ${context.currentWeek}`;
        if (context.dueDate) return `Due ${formatDate(context.dueDate)}`;
        return 'Add details';
      case 'diet_change':
        return formatDietType(context.dietType, context.customDietType);
      case 'stress_event':
        return context.description || `${context.category} stress (${context.severity})`;
      case 'illness':
        return formatIllnessType(context.illnessType, context.customIllnessType);
      case 'travel':
        return context.timezoneChange || (context.startDate ? `From ${formatDate(context.startDate)}` : 'Add details');
      case 'training_goal':
        return formatEventType(context.eventType, context.customEventType, context.eventDate);
      case 'medication':
        return context.medicationName || 'Add medication name';
      case 'other':
        return context.description || 'Add description';
    }
  };

  return (
    <div className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-700/70 transition-colors"
        onClick={onEdit}
      >
        <div className="flex items-center gap-2">
          <span>{meta.icon}</span>
          <span className="text-sm font-medium text-white">{meta.label}</span>
          <span className="text-xs text-slate-400">- {getSummary()}</span>
        </div>
        <button
          type="button"
          className="p-1 hover:bg-slate-600 rounded transition-colors"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
        </button>
      </div>

      {/* Card Form */}
      {isEditing && (
        <div className="px-3 py-3 border-t border-slate-600 space-y-3">
          <ContextForm context={context} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

interface ContextFormProps {
  context: LifeContext;
  onUpdate: (updates: Record<string, unknown>) => void;
}

function ContextForm({ context, onUpdate }: ContextFormProps) {
  const inputClass = "w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded focus:border-garmin-blue focus:outline-none";
  const selectClass = "w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded focus:border-garmin-blue focus:outline-none";
  const labelClass = "block text-xs text-slate-400 mb-1";

  switch (context.type) {
    case 'new_baby':
      return (
        <>
          <div>
            <label className={labelClass}>Birth Date</label>
            <input
              type="date"
              className={inputClass}
              value={context.birthDate}
              onChange={(e) => onUpdate({ birthDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., First child, twins..."
              value={context.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </>
      );

    case 'pregnancy':
      return (
        <>
          <div>
            <label className={labelClass}>Current Week</label>
            <input
              type="number"
              className={inputClass}
              min={1}
              max={42}
              placeholder="e.g., 28"
              value={context.currentWeek || ''}
              onChange={(e) => onUpdate({ currentWeek: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className={labelClass}>Or Due Date</label>
            <input
              type="date"
              className={inputClass}
              value={context.dueDate || ''}
              onChange={(e) => onUpdate({ dueDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., High-risk, gestational diabetes..."
              value={context.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </>
      );

    case 'diet_change':
      return (
        <>
          <div>
            <label className={labelClass}>Diet Type</label>
            <select
              className={selectClass}
              value={context.dietType}
              onChange={(e) => onUpdate({ dietType: e.target.value as DietChangeContext['dietType'] })}
            >
              <option value="keto">Keto</option>
              <option value="low_carb">Low Carb</option>
              <option value="vegan">Vegan</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="fasting">Intermittent Fasting</option>
              <option value="calorie_restriction">Calorie Restriction</option>
              <option value="other">Other</option>
            </select>
          </div>
          {context.dietType === 'other' && (
            <div>
              <label className={labelClass}>Describe Diet</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., Whole30, Carnivore..."
                value={context.customDietType || ''}
                onChange={(e) => onUpdate({ customDietType: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={context.startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., For weight loss, medical reasons..."
              value={context.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </>
      );

    case 'stress_event':
      return (
        <>
          <div>
            <label className={labelClass}>Category</label>
            <select
              className={selectClass}
              value={context.category}
              onChange={(e) => onUpdate({ category: e.target.value as StressEventContext['category'] })}
            >
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="health">Health</option>
              <option value="financial">Financial</option>
              <option value="relationship">Relationship</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Severity</label>
            <select
              className={selectClass}
              value={context.severity}
              onChange={(e) => onUpdate({ severity: e.target.value as StressEventContext['severity'] })}
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Brief description of the stressor..."
              value={context.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>When did it start? (optional)</label>
            <input
              type="date"
              className={inputClass}
              value={context.startDate || ''}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
          </div>
        </>
      );

    case 'illness':
      return (
        <>
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={selectClass}
              value={context.illnessType}
              onChange={(e) => onUpdate({ illnessType: e.target.value as IllnessContext['illnessType'] })}
            >
              <option value="cold_flu">Cold/Flu</option>
              <option value="injury">Injury</option>
              <option value="surgery">Surgery</option>
              <option value="covid">COVID-19</option>
              <option value="chronic">Chronic Condition</option>
              <option value="other">Other</option>
            </select>
          </div>
          {context.illnessType === 'other' && (
            <div>
              <label className={labelClass}>Describe</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., Migraine, allergy..."
                value={context.customIllnessType || ''}
                onChange={(e) => onUpdate({ customIllnessType: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={context.startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>End Date (leave blank if ongoing)</label>
            <input
              type="date"
              className={inputClass}
              value={context.endDate || ''}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Additional details..."
              value={context.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </>
      );

    case 'travel':
      return (
        <>
          <div>
            <label className={labelClass}>Timezone Change (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., EST to PST, +8 hours..."
              value={context.timezoneChange || ''}
              onChange={(e) => onUpdate({ timezoneChange: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Travel Start</label>
            <input
              type="date"
              className={inputClass}
              value={context.startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Travel End (optional)</label>
            <input
              type="date"
              className={inputClass}
              value={context.endDate || ''}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., Red-eye flight, jet lag..."
              value={context.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </>
      );

    case 'training_goal':
      return (
        <>
          <div>
            <label className={labelClass}>Event Type</label>
            <select
              className={selectClass}
              value={context.eventType}
              onChange={(e) => onUpdate({ eventType: e.target.value as TrainingGoalContext['eventType'] })}
            >
              <option value="marathon">Marathon</option>
              <option value="half_marathon">Half Marathon</option>
              <option value="triathlon">Triathlon</option>
              <option value="5k_10k">5K/10K</option>
              <option value="competition">Competition</option>
              <option value="other">Other</option>
            </select>
          </div>
          {context.eventType === 'other' && (
            <div>
              <label className={labelClass}>Describe Event</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., Cycling race, CrossFit competition..."
                value={context.customEventType || ''}
                onChange={(e) => onUpdate({ customEventType: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Event Date (optional)</label>
            <input
              type="date"
              className={inputClass}
              value={context.eventDate || ''}
              onChange={(e) => onUpdate({ eventDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., First marathon, target time..."
              value={context.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </>
      );

    case 'medication':
      return (
        <>
          <div>
            <label className={labelClass}>Medication Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., Beta blockers, sleep aids..."
              value={context.medicationName}
              onChange={(e) => onUpdate({ medicationName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={context.startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>End Date (leave blank if ongoing)</label>
            <input
              type="date"
              className={inputClass}
              value={context.endDate || ''}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., Dosage, side effects noticed..."
              value={context.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </>
      );

    case 'other':
      return (
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={`${inputClass} min-h-[60px]`}
            placeholder="Describe any relevant life circumstances..."
            value={context.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      );
  }
}

// Helper functions
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDietType(dietType: string, custom?: string): string {
  if (dietType === 'other' && custom) return custom;
  const labels: Record<string, string> = {
    keto: 'Keto',
    low_carb: 'Low Carb',
    vegan: 'Vegan',
    vegetarian: 'Vegetarian',
    fasting: 'Intermittent Fasting',
    calorie_restriction: 'Calorie Restriction',
    other: 'Other diet',
  };
  return labels[dietType] || dietType;
}

function formatIllnessType(illnessType: string, custom?: string): string {
  if (illnessType === 'other' && custom) return custom;
  const labels: Record<string, string> = {
    cold_flu: 'Cold/Flu',
    injury: 'Injury',
    surgery: 'Surgery',
    covid: 'COVID-19',
    chronic: 'Chronic Condition',
    other: 'Other illness',
  };
  return labels[illnessType] || illnessType;
}

function formatEventType(eventType: string, custom?: string, eventDate?: string): string {
  let label: string;
  if (eventType === 'other' && custom) {
    label = custom;
  } else {
    const labels: Record<string, string> = {
      marathon: 'Marathon',
      half_marathon: 'Half Marathon',
      triathlon: 'Triathlon',
      '5k_10k': '5K/10K',
      competition: 'Competition',
      other: 'Training goal',
    };
    label = labels[eventType] || eventType;
  }
  if (eventDate) {
    label += ` on ${formatDate(eventDate)}`;
  }
  return label;
}
