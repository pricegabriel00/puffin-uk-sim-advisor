
import React, { useState } from 'react';
import { UserInput } from '../types';
import { 
  ArrowRight, 
  Check, 
  Zap, 
  Plane, 
  PiggyBank, 
  User, 
  Laptop, 
  Smartphone, 
  HelpCircle
} from 'lucide-react';

interface LifestyleInputProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
}

interface ProfileOption {
  id: string;
  title: string;
  desc: string;
  icon: any;
  priority: string | null;
}

const PROFILES: ProfileOption[] = [
  { 
    id: 'everyday', 
    title: 'Everyday User', 
    desc: 'Calls, messages, browsing', 
    icon: User,
    priority: null 
  },
  { 
    id: 'heavy-data', 
    title: 'Heavy Data User', 
    desc: 'Streaming, hotspot, lots of data', 
    icon: Zap,
    priority: 'I hate running out of data' 
  },
  { 
    id: 'travel', 
    title: 'Frequent Traveller', 
    desc: 'EU roaming matters to me', 
    icon: Plane,
    priority: 'I travel in Europe often' 
  },
  { 
    id: 'budget', 
    title: 'Budget Focused', 
    desc: 'I don’t want to overpay', 
    icon: PiggyBank,
    priority: 'I want something cheap and simple' 
  },
  { 
    id: 'remote', 
    title: 'Remote Worker', 
    desc: 'I rely on my phone for work', 
    icon: Laptop,
    priority: 'I hotspot my laptop' 
  },
  { 
    id: 'social', 
    title: 'Social Heavy', 
    desc: 'Most of my time is on apps', 
    icon: Smartphone,
    priority: null 
  },
  { 
    id: 'power', 
    title: 'Power User', 
    desc: 'I want the best performance', 
    icon: Zap,
    priority: 'I want unlimited so I never think about it' 
  },
  { 
    id: 'other', 
    title: 'Other / Not sure', 
    desc: 'Just show me good options', 
    icon: HelpCircle,
    priority: null 
  },
];

const LifestyleInput: React.FC<LifestyleInputProps> = ({ onSubmit, isLoading }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleProfile = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Aggregating priorities from all selected profiles
    const selectedProfiles = PROFILES.filter(p => selectedIds.includes(p.id));
    const priorities = selectedProfiles
      .map(p => p.priority)
      .filter((p): p is string => p !== null);

    // Using the first selected profile as the primary lifestyle hint, or 'everyday'
    const lifestyleId = selectedIds.length > 0 ? selectedIds[0] : 'everyday';
    
    onSubmit({
      description: selectedProfiles.map(p => p.title).join(', ') || "General usage",
      priority: Array.from(new Set(priorities)),
      lifestyleId: lifestyleId,
      preFilter: {
        contract: 'Any',
        data: 'Any',
        roaming: 'Any'
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
          Let’s find you a SIM that actually fits you
        </h2>
        <p className="text-gray-500 text-lg font-medium">
          A couple of quick taps is enough — you can fine-tune your results later.
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-12">
        {/* Main Interaction */}
        <section className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Tap anything that sounds like you</h3>
            <p className="text-sm text-gray-400">You can pick more than one — or skip this.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROFILES.map((profile) => {
              const Icon = profile.icon;
              const isSelected = selectedIds.includes(profile.id);
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => toggleProfile(profile.id)}
                  className={`flex flex-col items-center text-center p-6 rounded-3xl border-2 transition-all duration-300 relative group h-full ${
                    isSelected 
                      ? 'border-brand-orange bg-orange-50/40 shadow-sm scale-[1.02]' 
                      : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
                  }`}
                >
                  <div className={`p-4 rounded-2xl mb-4 transition-colors ${
                    isSelected ? 'bg-brand-orange text-white' : 'bg-gray-50 text-gray-400 group-hover:text-gray-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-gray-900 mb-1 text-base">{profile.title}</div>
                  <div className="text-xs text-gray-500 leading-tight">{profile.desc}</div>
                  
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-brand-orange text-white rounded-full p-1 shadow-sm">
                      <Check className="w-4 h-4" strokeWidth={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-4 pt-6">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full max-w-md py-5 rounded-3xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-xl ${
              isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-brand-orange text-white hover:bg-orange-600 hover:shadow-brand-orange/30 transform hover:-translate-y-1 active:scale-95'
            }`}
          >
            {isLoading ? 'Finding your matches...' : 'Show me my matches'}
            {!isLoading && <ArrowRight className="w-6 h-6" />}
          </button>
          <p className="text-sm text-gray-400 font-medium text-center">
            You’ll be able to adjust price, data, and roaming next.
          </p>
        </div>
      </form>
    </div>
  );
};

export default LifestyleInput;
