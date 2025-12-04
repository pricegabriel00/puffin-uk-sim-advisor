import React, { useState, useRef, useEffect } from 'react';
import { UserInput } from '../types';
import { ArrowRight, Laptop, Tv, Plane, PiggyBank, Zap, Smartphone, Check, Sparkles, ChevronDown, ChevronUp, SlidersHorizontal, HelpCircle, User } from 'lucide-react';
import { buildProfileSummary } from '../utils/profileSummary';

interface LifestyleInputProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
}

const PROFILES = [
  {
    id: 'everyday',
    title: 'Everyday User',
    desc: 'Balanced & reliable',
    icon: User,
    suggestedText: 'A balanced user who wants a reliable plan without overthinking.',
    priorities: ['I want the best coverage', 'I care about customer service']
  },
  {
    id: 'remote',
    title: 'Remote Worker',
    desc: 'Hotspots laptop often',
    icon: Laptop,
    suggestedText: 'I hotspot my laptop often, work on the go, and need reliable tethering.',
    priorities: ['I hotspot my laptop', 'I want the best coverage']
  },
  {
    id: 'streamer',
    title: 'Heavy Streamer',
    desc: 'Netflix / YouTube',
    icon: Tv,
    suggestedText: 'I watch a lot of Netflix/YouTube, so I need plenty of data.',
    priorities: ['I hate running out of data', 'I want unlimited so I never think about it']
  },
  {
    id: 'travel',
    title: 'Frequent Traveller',
    desc: 'EU trips 2-5x/mo',
    icon: Plane,
    suggestedText: 'I travel to Europe often, so strong EU roaming is essential.',
    priorities: ['I travel in Europe often', 'I want the best coverage']
  },
  {
    id: 'budget',
    title: 'Budget Focused',
    desc: 'Light user, low cost',
    icon: PiggyBank,
    suggestedText: "I'm a light user and want to keep monthly costs low.",
    priorities: ['I want something cheap and simple', 'I barely use data']
  },
  {
    id: 'power',
    title: 'Power User',
    desc: 'Unlimited everything',
    icon: Zap,
    suggestedText: 'I use my phone heavily and want unlimited everything.',
    priorities: ['I want unlimited so I never think about it', 'I hate running out of data']
  },
  {
    id: 'social',
    title: 'Social Heavy',
    desc: 'TikTok / Instagram',
    icon: Smartphone,
    suggestedText: 'I use TikTok/Instagram a lot and need smooth performance for social media.',
    priorities: ['I want unlimited so I never think about it', 'I want no contract commitment']
  },
  {
    id: 'other',
    title: 'Other / Not Sure',
    desc: 'I\'ll decide later',
    icon: HelpCircle,
    suggestedText: '',
    priorities: []
  }
];

const SMART_SUGGESTIONS: Record<string, string[]> = {
  everyday: ["Strong 4G fallback", "No activation fees", "Rolling contracts"],
  remote: ["Data Rollover", "Strong 4G fallback", "Reliable peak-time speeds"],
  streamer: ["HD Streaming Support", "5G Priority", "Zero-rated Socials"],
  travel: ["EU Roaming Boost", "Global Roaming", "Multi-sim support"],
  budget: ["£5-£8 options", "Rolling contracts", "No activation fees"],
  power: ["Fast unlimited data", "Top-tier 5G coverage", "Priority speeds"],
  social: ["Social media data pass", "Upload speed priority", "Video optimization"],
  other: []
};

// Map friendly labels for the UI
const SMART_FEATURE_KEY_MAP: Record<string, string> = {
  "Data Rollover": "DATA_ROLLOVER",
  "Strong 4G fallback": "STRONG_4G",
  "Reliable peak-time speeds": "PEAK_RELIABILITY",
  "HD Streaming Support": "HD_STREAMING",
  "5G Priority": "FIVE_G_PRIORITY",
  "Zero-rated Socials": "ZERO_RATED_SOCIALS",
  "EU Roaming Boost": "EU_ROAMING_BOOST",
  "Global Roaming": "GLOBAL_ROAMING",
  "Multi-sim support": "MULTI_SIM",
  "£5-£8 options": "LOW_COST_TIER",
  "Rolling contracts": "ROLLING_CONTRACT",
  "No activation fees": "NO_FEES",
  "Fast unlimited data": "FAST_UNLIMITED",
  "Top-tier 5G coverage": "TOP_TIER_5G",
  "Priority speeds": "PRIORITY_SPEEDS",
  "Social media data pass": "SOCIAL_PASS",
  "Upload speed priority": "UPLOAD_SPEED",
  "Video optimization": "VIDEO_OPT"
};

const PRIORITIES_LIST = [
  "I hate running out of data",
  "I travel in Europe often",
  "I want something cheap and simple",
  "I hotspot my laptop",
  "I want unlimited so I never think about it",
  "I barely use data",
  "I care about customer service",
  "I want no contract commitment",
  "I want the best coverage"
];

const LifestyleInput: React.FC<LifestyleInputProps> = ({ onSubmit, isLoading }) => {
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [priority, setPriority] = useState<string[]>([]);
  const [smartFeatures, setSmartFeatures] = useState<string[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Pre-filters State
  const [pfContract, setPfContract] = useState('Any');
  const [pfData, setPfData] = useState('Any');
  const [pfRoaming, setPfRoaming] = useState('Any');

  const [errors, setErrors] = useState<{ description?: string }>({});
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If no description is entered/autofilled, provide a fallback
    const finalDescription = description.trim() || (activeProfileId && activeProfileId !== 'other' ? PROFILES.find(p => p.id === activeProfileId)?.suggestedText : "") || "General usage pattern.";
    const parsedBudget = budget.trim() ? parseFloat(budget) : undefined;
    
    // Map smart features to stable keys
    const mappedSmartFeatures = smartFeatures.map(f => SMART_FEATURE_KEY_MAP[f] || f);

    // Merge pre-filters into priorities/smart features to influence scoring naturally
    const mergedPriorities = [...priority];
    const mergedSmartFeatures = [...mappedSmartFeatures];

    // Map Contract
    if (pfContract === '1 month') {
        if (!mergedPriorities.includes("I want no contract commitment")) mergedPriorities.push("I want no contract commitment");
        if (!mergedSmartFeatures.includes("ROLLING_CONTRACT")) mergedSmartFeatures.push("ROLLING_CONTRACT");
    }

    // Map Data
    if (pfData === 'Light') {
         if (!mergedPriorities.includes("I barely use data")) mergedPriorities.push("I barely use data");
    } else if (pfData === 'Heavy') {
         if (!mergedPriorities.includes("I hate running out of data")) mergedPriorities.push("I hate running out of data");
    } else if (pfData === 'Unlimited') {
         if (!mergedPriorities.includes("I want unlimited so I never think about it")) mergedPriorities.push("I want unlimited so I never think about it");
    }

    // Map Roaming
    if (pfRoaming === 'EU') {
         if (!mergedPriorities.includes("I travel in Europe often")) mergedPriorities.push("I travel in Europe often");
    } else if (pfRoaming === 'Global') {
         if (!mergedSmartFeatures.includes("GLOBAL_ROAMING")) mergedSmartFeatures.push("GLOBAL_ROAMING");
    }


    // If 'other' is selected, we pass 'other' explicitly so parent can handle flow. 
    // If not selected at all (skip), we pass undefined.
    const finalLifestyleId = activeProfileId === 'other' ? 'other' : (activeProfileId || undefined);

    onSubmit({
      description: finalDescription,
      budget: parsedBudget,
      priority: mergedPriorities,
      lifestyleId: finalLifestyleId,
      smartFeatures: mergedSmartFeatures,
      preFilter: {
        contract: pfContract,
        data: pfData,
        roaming: pfRoaming
      }
    });
  };

  const handleSkip = () => {
      // Just clear profile selection and let them continue manually
      setActiveProfileId(null);
      setDescription('');
      setPriority([]);
      setSmartFeatures([]);
      
      // Scroll to the preferences section
      const element = document.getElementById('preferences-section');
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const handleProfileSelect = (profileId: string) => {
    if (activeProfileId === profileId) {
      // Deselect
      setActiveProfileId(null);
      setDescription('');
      setPriority([]);
      setSmartFeatures([]);
    } else {
      // Select
      const profile = PROFILES.find(p => p.id === profileId);
      if (profile) {
        setActiveProfileId(profileId);
        setDescription(profile.suggestedText);
        setPriority(profile.priorities);
        setSmartFeatures([]); // Reset smart features on new profile
      }
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    // Auto-expand logic
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  const togglePriority = (option: string) => {
    setPriority(prev => {
      if (prev.includes(option)) {
        return prev.filter(p => p !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const toggleSmartFeature = (feature: string) => {
    setSmartFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  // Live Summary Logic using buildProfileSummary
  const currentInput = {
    description,
    budget: budget.trim() ? parseFloat(budget) : undefined,
    priority,
    lifestyleId: activeProfileId || undefined,
    smartFeatures,
    preFilter: { contract: pfContract, data: pfData, roaming: pfRoaming }
  };
  
  const { title: summaryTitle, subtitle: summarySubtitle } = buildProfileSummary(currentInput);
  const hasInputs = activeProfileId || priority.length > 0 || budget.trim() || description.trim() || pfContract !== 'Any' || pfData !== 'Any' || pfRoaming !== 'Any';

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 p-6 md:p-10 border border-white ring-1 ring-gray-100">
      <div className="text-center mb-10 pt-2">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Find your perfect UK SIM in 2 minutes
        </h2>
        <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto font-light">
          Smart, personalised UK SIM picks powered by Puffin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* 1. Lifestyle Profile Selection (Primary) */}
        <div>
           <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 ml-1">
              1. Pick what describes you best <span className="text-gray-400 font-normal normal-case ml-1 text-sm">(Optional)</span>
           </label>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {PROFILES.map((profile) => {
                   const Icon = profile.icon;
                   const isActive = activeProfileId === profile.id;
                   return (
                       <button
                          key={profile.id}
                          type="button"
                          onClick={() => handleProfileSelect(profile.id)}
                          disabled={isLoading}
                          className={`text-left p-5 rounded-2xl border transition-all duration-300 relative group flex flex-col h-full ${
                              isActive 
                              ? 'bg-orange-50 border-brand-orange ring-1 ring-brand-orange shadow-md scale-[1.02]' 
                              : 'bg-white border-gray-100 hover:border-brand-orange/50 hover:bg-orange-50/20 hover:shadow-md hover:scale-[1.01]'
                          }`}
                       >
                           <div className="flex justify-between items-start mb-3">
                               <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white' : 'bg-gray-50 group-hover:bg-white'}`}>
                                  <Icon className={`w-6 h-6 ${isActive ? 'text-brand-orange' : 'text-gray-400 group-hover:text-brand-orange/70'}`} />
                               </div>
                               {isActive && <Check className="w-5 h-5 text-brand-orange" />}
                           </div>
                           <div className={`font-bold text-base mb-1 ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                               {profile.title}
                           </div>
                           <div className="text-sm text-gray-500 leading-snug">
                               {profile.desc}
                           </div>
                       </button>
                   );
               })}
           </div>
           
           {activeProfileId === 'other' && (
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-sm font-medium rounded-xl border border-blue-100 flex items-center gap-3 animate-fade-in-up">
                  <HelpCircle className="w-5 h-5 flex-shrink-0" />
                  We’ll ask you 2 quick questions instead to pinpoint your needs.
              </div>
           )}

           <div className="mt-3 text-right">
              <button 
                type="button"
                onClick={handleSkip}
                className="text-xs font-semibold text-gray-400 hover:text-brand-orange hover:underline transition-colors py-2"
              >
                Continue without choosing a profile
              </button>
           </div>
        </div>
        
        <div id="preferences-section" className="space-y-10">
            {/* 2. Optional Detail (Secondary) */}
            <div>
            <button 
                type="button" 
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3 hover:text-brand-orange transition-colors group"
            >
                2. Add extra details <span className="text-gray-400 font-normal">(Optional)</span>
                <div className={`p-1 rounded-full bg-gray-100 group-hover:bg-orange-100 transition-colors ${showDetails ? 'rotate-180' : ''}`}>
                    {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
            </button>
            
            {showDetails && (
                <div className="relative animate-fade-in-up">
                    <textarea
                        ref={textareaRef}
                        value={description}
                        onChange={handleDescriptionChange}
                        rows={1}
                        className={`w-full px-5 py-4 border rounded-2xl outline-none transition-all resize-none overflow-hidden text-gray-700 placeholder-gray-400 bg-gray-50/50 focus:bg-white ${
                        errors.description 
                            ? 'border-red-300 focus:ring-2 focus:ring-red-200' 
                            : 'border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent shadow-sm'
                        }`}
                        placeholder="Add one extra detail (optional) e.g. ‘I hotspot daily’"
                        disabled={isLoading}
                        style={{ minHeight: '60px' }}
                    />
                </div>
            )}
            </div>

            {/* 3. Budget (Secondary) */}
            <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                    3. Monthly budget (£)
                </label>
                <p className="text-xs text-gray-500 mb-3">Optional — we’ll still show great value deals outside this.</p>
                <div className="relative max-w-[240px]">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <span className={`font-bold text-lg ${activeProfileId === 'budget' ? 'text-brand-orange' : 'text-gray-400'}`}>£</span>
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="e.g. 10"
                        className={`w-full pl-10 pr-5 py-3.5 border rounded-2xl outline-none transition-all font-bold text-gray-900 placeholder-gray-300 text-lg ${
                            activeProfileId === 'budget' 
                            ? 'border-brand-orange ring-1 ring-brand-orange bg-orange-50/20' 
                            : 'border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent bg-white shadow-sm'
                        }`}
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* 4. Priorities (Refinement) */}
            <div>
                <label className="block text-sm font-bold text-gray-900 mb-5">
                    4. Refine priorities <span className="text-gray-400 font-normal ml-1">Pick your top 2–3.</span>
                </label>
                <div className="flex flex-wrap gap-2.5 mb-5">
                    {PRIORITIES_LIST.map((option) => {
                        const isSelected = priority.includes(option);
                        const isDeemphasized = !isSelected && priority.length >= 3;

                        return (
                            <div key={option} className="relative group">
                                <button
                                    type="button"
                                    onClick={() => togglePriority(option)}
                                    disabled={isLoading}
                                    className={`px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer ${
                                        isSelected
                                        ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200 transform scale-[1.02]'
                                        : isDeemphasized 
                                            ? 'bg-white text-gray-400 border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-300' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    {option}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Smart Suggestions */}
                {activeProfileId && activeProfileId !== 'other' && SMART_SUGGESTIONS[activeProfileId] && (
                    <div className="animate-fade-in-up mt-6 pl-4 border-l-2 border-brand-orange/30 ml-2">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-brand-orange" />
                        <span className="text-xs font-bold text-brand-orange uppercase tracking-wider">Smart Suggestions for you</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {SMART_SUGGESTIONS[activeProfileId].map((suggestion) => {
                            const isActive = smartFeatures.includes(suggestion);
                            return (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => toggleSmartFeature(suggestion)}
                                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                                        : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-white hover:border-gray-300'
                                    }`}
                                >
                                    {isActive && <span className="mr-1.5 font-bold">✓</span>}
                                    {suggestion}
                                </button>
                            );
                        })}
                    </div>
                    </div>
                )}
            </div>

            {/* 5. Pre-Filters */}
            <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <label className="block text-sm font-bold text-gray-900 mb-4">
                    5. Specific requirements <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 block ml-1">Contract Length</span>
                        <div className="relative">
                            <select 
                                value={pfContract}
                                onChange={(e) => setPfContract(e.target.value)}
                                className="w-full text-sm p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none appearance-none shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="Any">Any length</option>
                                <option value="1 month">1 month rolling</option>
                                <option value="12 months">12 months</option>
                                <option value="24 months">24 months</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 block ml-1">Data Needs</span>
                        <div className="relative">
                            <select 
                                value={pfData}
                                onChange={(e) => setPfData(e.target.value)}
                                className="w-full text-sm p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none appearance-none shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="Any">Any amount</option>
                                <option value="Light">Light (&lt;15GB)</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Heavy">Heavy (50GB+)</option>
                                <option value="Unlimited">Unlimited</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 block ml-1">Roaming</span>
                        <div className="relative">
                            <select 
                                value={pfRoaming}
                                onChange={(e) => setPfRoaming(e.target.value)}
                                className="w-full text-sm p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none appearance-none shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
                            >
                                <option value="Any">Any preference</option>
                                <option value="UK Only">UK Only</option>
                                <option value="EU">EU Included</option>
                                <option value="Global">Global Included</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Live Summary Section */}
        {hasInputs && (
          <div className="animate-fade-in-up mt-8 mb-4 border-t border-gray-100 pt-6">
             <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
                <h3 className="text-xs font-bold text-brand-orange uppercase tracking-widest">Your profile so far</h3>
             </div>
             <div className="bg-white border border-orange-100 shadow-sm rounded-2xl p-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                 <span className="text-base font-bold text-gray-900">{summaryTitle}:</span>
                 <span className="text-base text-gray-600 leading-snug">{summarySubtitle}</span>
             </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-5 rounded-2xl text-white font-bold text-xl shadow-xl shadow-brand-orange/20 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] mt-6 ${
            isLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-brand-orange hover:bg-orange-600 hover:shadow-2xl hover:shadow-orange-300/40'
          }`}
        >
          {isLoading ? (
            <>Analysing...</>
          ) : (
            <>Show my matches <ArrowRight className="w-6 h-6" /></>
          )}
        </button>
      </form>
    </div>
  );
};

export default LifestyleInput;