import React, { useState } from 'react';
import { QuickNeeds } from '../types';
import { ArrowRight, BarChart3, Plane, Wallet } from 'lucide-react';

interface QuickNeedsSelectorProps {
  onSubmit: (needs: QuickNeeds) => void;
}

interface OptionButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({ 
  label, 
  isSelected, 
  onClick 
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 w-full md:w-auto ${
      isSelected
        ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-[1.02]'
        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
);

const QuickNeedsSelector: React.FC<QuickNeedsSelectorProps> = ({ onSubmit }) => {
  const [dataUsage, setDataUsage] = useState<QuickNeeds['dataUsage'] | null>(null);
  const [euTravel, setEuTravel] = useState<QuickNeeds['euTravel'] | null>(null);
  const [priority, setPriority] = useState<QuickNeeds['priority'] | null>(null);

  const isComplete = dataUsage && euTravel && priority;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComplete) {
      onSubmit({
        dataUsage: dataUsage!,
        euTravel: euTravel!,
        priority: priority!
      });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100 animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Just a few quick questions</h2>
        <p className="text-gray-500">Since you're not sure, let's narrow down the basics.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Q1: Data */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <BarChart3 className="w-4 h-4 text-brand-orange" />
            1. How much data do you typically use?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Low', 'Medium', 'High', 'Unlimited'].map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                isSelected={dataUsage === opt}
                onClick={() => setDataUsage(opt as any)}
              />
            ))}
          </div>
        </div>

        {/* Q2: Travel */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Plane className="w-4 h-4 text-brand-orange" />
            2. How often do you travel to the EU?
          </label>
          <div className="flex flex-wrap gap-2">
            {['Never', 'Sometimes', 'Often'].map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                isSelected={euTravel === opt}
                onClick={() => setEuTravel(opt as any)}
              />
            ))}
          </div>
        </div>

        {/* Q3: Priorities */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Wallet className="w-4 h-4 text-brand-orange" />
            3. What matters more right now?
          </label>
          <div className="grid grid-cols-2 gap-3">
             <OptionButton
                label="Flexibility (1-month rolling)"
                isSelected={priority === 'Flexibility'}
                onClick={() => setPriority('Flexibility')}
              />
              <OptionButton
                label="Long-term Savings (Cheaper)"
                isSelected={priority === 'Savings'}
                onClick={() => setPriority('Savings')}
              />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isComplete}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 mt-8 ${
            !isComplete
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-brand-orange hover:bg-orange-600 hover:shadow-xl transform active:scale-[0.98]'
          }`}
        >
          See Results <ArrowRight className="w-5 h-5" />
        </button>

      </form>
    </div>
  );
};

export default QuickNeedsSelector;