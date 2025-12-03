
import React, { useState, useMemo, useEffect } from 'react';
import { AnalysisResult, UserInput, PlanRecommendation as UIPlan, Plan, PlanFiltersState } from '../types';
import { Check, ArrowRight, TrendingUp, Signal, Globe, Wifi, Calendar, Smartphone, Info, Sparkles, X, AlertTriangle, Filter, Loader2, RefreshCw, ExternalLink, ShieldCheck, Tag } from 'lucide-react';
import PlanFilters from './PlanFilters';
import { buildPlanExplanation, buildTopAnalysisCopy } from '../utils/explanations';
import { getMatchLabel } from '../utils/matchLabel';
import { getSortedPlans, SortOption } from '../utils/sorting';
import { computeMatchScore } from '../utils/scoring';
import { handlePlanClick } from '../utils/planClicks';
import { fetchSimPlans } from '../services/planService';

interface PlanRecommendationProps {
  analysis: AnalysisResult;
  userInput: UserInput;
  onReset: () => void;
}

const PROFILE_TAGS: Record<string, string[]> = {
    remote: ["Great for tethering", "Reliable coverage"],
    streamer: ["Strong for video streaming", "Fast speeds"],
    travel: ["Excellent EU roaming", "Big EU caps"],
    budget: ["Low monthly cost", "Great value"],
    power: ["Unlimited data", "Top-tier speeds"],
    social: ["Perfect for TikTok/Instagram", "Smooth social usage"],
    everyday: ["Balanced choice", "Reliable network"]
};

const PROFILE_SORT_ORDER: Record<string, SortOption[]> = {
    remote: ['Recommended', 'Most Data', 'Best Coverage', 'Price', 'Best Budget Fit'],
    streamer: ['Recommended', 'Most Data', 'Price', 'Best Budget Fit', 'Best EU Roaming'],
    travel: ['Recommended', 'Best EU Roaming', 'Price', 'Most Data', 'Best Budget Fit'],
    budget: ['Best Budget Fit', 'Price', 'Recommended', 'Most Data', 'Best EU Roaming'],
    power: ['Most Data', 'Recommended', 'Best Coverage', 'Price', 'Best Budget Fit'],
    social: ['Recommended', 'Most Data', 'Price', 'Best Budget Fit', 'Best EU Roaming'],
    everyday: ['Recommended', 'Price', 'Most Data', 'Best Coverage', 'Best EU Roaming']
};

const DEFAULT_SORT_ORDER: SortOption[] = ['Recommended', 'Price', 'Most Data', 'Best EU Roaming', 'Best Budget Fit'];

// --- Reusable Components ---

const ScoreTooltip = () => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-xl p-3 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-2xl z-20">
      <div className="font-bold mb-1 text-gray-200">Match Score Breakdown</div>
      <p className="leading-snug text-gray-400">Your Match Score combines price, data, roaming, reliability, and contract length based on what you told us. Higher is better.</p>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 transform rotate-45"></div>
    </div>
);

const generateComparativeFooter = (plan: Plan, allPlans: UIPlan[], currentScore: number) => {
    const topPlan = allPlans[0];
    const cheapestPlan = allPlans.reduce((min, p) => p.monthlyCost < min.monthlyCost ? p : min, allPlans[0]);
    
    if (plan.id === topPlan.id) {
        if (cheapestPlan.id !== plan.id) {
             return `Alternative for lower price: ${cheapestPlan.provider} (£${cheapestPlan.monthlyCost}/mo), but with trade-offs.`;
        }
        return "This is your #1 match and best value option.";
    }

    if (currentScore < 50) {
        return `Stronger all-rounder: ${topPlan.provider} matches your priorities much better.`;
    }

    if (plan.monthlyPrice < topPlan.monthlyCost) {
        return `Cheaper than our top pick, but lacks ${topPlan.dataAllowanceGB === -1 ? "unlimited data" : "premium features"}.`;
    }

    if (plan.monthlyPrice > topPlan.monthlyCost) {
        if (plan.network === 'EE' && topPlan.network !== 'EE') {
             return `Alternative for max coverage: Stick with this if you need the absolute best signal.`;
        }
        return `Note: ${topPlan.provider} offers similar features for £${plan.monthlyPrice - topPlan.monthlyCost} less.`;
    }

    return `Consider ${topPlan.provider} for a better overall balance of features.`;
};

// --- Provider Logo Component ---
const ProviderLogo = ({ provider, className = "w-8 h-8" }: { provider: string, className?: string }) => {
    const p = provider.toLowerCase();
    let content = <span className="text-[10px]">{provider.slice(0, 2)}</span>;
    let styleClass = "bg-gray-100 text-gray-600";

    if (p.includes('ee')) {
        styleClass = "bg-[#007B85] text-white"; // EE Teal
        content = <span>EE</span>;
    } else if (p.includes('vodafone')) {
        styleClass = "bg-[#E60000] text-white"; // Vodafone Red
        content = <span>VF</span>;
    } else if (p.includes('three')) {
        styleClass = "bg-black text-white";
        content = <span>3</span>;
    } else if (p.includes('o2')) {
        styleClass = "bg-[#032B5A] text-white"; // O2 Blue
        content = <span>O2</span>;
    } else if (p.includes('voxi')) {
        styleClass = "bg-black text-white font-extrabold";
        content = <span className="text-[8px]">VOXI</span>;
    } else if (p.includes('smarty')) {
        styleClass = "bg-[#121520] text-[#00D95F]"; // Smarty Dark + Green
        content = <span className="text-[8px]">SM</span>;
    } else if (p.includes('id') || p.includes('id mobile')) {
        styleClass = "bg-[#252525] text-[#71C7BA]"; // iD Mobile
        content = <span>iD</span>;
    } else if (p.includes('lebara')) {
        styleClass = "bg-[#00A4E4] text-white"; // Lebara Blue
        content = <span>LB</span>;
    }

    return (
        <div className={`flex items-center justify-center rounded-md shadow-sm font-bold select-none ${styleClass} ${className}`}>
            {content}
        </div>
    );
};

const PlansSkeleton = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mx-auto mb-8"></div>
        {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 h-64">
                <div className="flex gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-md"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="h-8 bg-gray-50 rounded"></div>
                    <div className="h-8 bg-gray-50 rounded"></div>
                    <div className="h-8 bg-gray-50 rounded"></div>
                    <div className="h-8 bg-gray-50 rounded"></div>
                </div>
                <div className="h-20 bg-gray-50 rounded"></div>
            </div>
        ))}
    </div>
);

const PlanRecommendation: React.FC<PlanRecommendationProps> = ({ analysis, userInput, onReset }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>('Recommended');
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<UIPlan | null>(null);
  
  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PlanFiltersState>({
    price: 'Any',
    data: 'Any',
    contract: 'Any',
    roaming: 'Any',
    network: 'Any',
    specialFeatures: []
  });
  
  const userPriorities = userInput.priority || [];
  const userBudget = userInput.budget;
  const profileId = userInput.lifestyleId;

  // Fetch plans on mount
  useEffect(() => {
      const loadPlans = async () => {
          setLoadState('loading');
          setLoadError(null);
          try {
              const fetchedPlans = await fetchSimPlans();
              setPlans(fetchedPlans);
              setLoadState('loaded');
          } catch (err: any) {
              setLoadState('error');
              setLoadError(err.message || 'Unknown error');
          }
      };
      loadPlans();
  }, []);

  useEffect(() => {
    if (profileId && PROFILE_SORT_ORDER[profileId]) {
        setSortBy(PROFILE_SORT_ORDER[profileId][0]);
    }
  }, [profileId]);

  const enrichedPlans = useMemo(() => {
    if (loadState !== 'loaded' || plans.length === 0) return [];

    try {
        const result = plans.map((plan: Plan) => {
            // --- CENTRAL SCORING ENGINE ---
            const { total: finalScore, subScores, debug } = computeMatchScore(plan, userInput);
            
            // Generate Features list
            const features = [...(plan.keyPerks || [])];
            if (plan.includes5G) features.push("5G Ready");
            if (plan.dataAllowanceGB === null) features.push("Unlimited Data");
            if (plan.euRoamingIncluded) features.push(plan.euRoamingCapGB ? `EU Roaming (${plan.euRoamingCapGB}GB cap)` : "Free EU Roaming");
            if (plan.speedCapMbps) features.push(`Speed Cap: ${plan.speedCapMbps}Mbps`);

            // Generate Structured Explanations
            const { primaryText, tradeoffText, bulletPoints } = buildPlanExplanation(plan, userInput);
            
            // Get Match Label (Centralized)
            const matchLabelInfo = getMatchLabel(finalScore);

            const tempUIPlan: UIPlan = {
                id: plan.id,
                category: 'Top Puffin Pick',
                provider: plan.provider,
                name: plan.planName,
                monthlyCost: plan.monthlyPrice,
                dataAllowanceGB: plan.dataAllowanceGB === null ? -1 : plan.dataAllowanceGB,
                contractLength: plan.contractLengthMonths === 1 ? "1 month rolling" : `${plan.contractLengthMonths} months`,
                euRoaming: plan.euRoamingIncluded ? "Included" : "Paid",
                hotspotRules: plan.hotspotPolicy === 'unlimited' ? "Unltd" : (plan.hotspotPolicy === 'not-allowed' ? "No tethering" : "Allowed"),
                network: `Runs on ${plan.network}`,
                coverageRating: plan.reliabilityRating,
                calculatedPuffinScore: finalScore,
                matchStrength: matchLabelInfo.label,
                scoreBreakdown: subScores,
                explanationPrimary: primaryText,
                explanationTradeOff: tradeoffText,
                explanationBullets: bulletPoints,
                features: features,
                planData: plan,
                debug // Dev only
            };

            return tempUIPlan;
        });

        const sortedResult = result.sort((a, b) => b.calculatedPuffinScore - a.calculatedPuffinScore);

        return sortedResult.map((plan, index, all) => {
            let category: 'Top Puffin Pick' | 'Best Value' | 'Cheapest Good Fit' = 'Top Puffin Pick';
            if (index === 0) category = 'Top Puffin Pick';
            else if (plan.monthlyCost < all[0].monthlyCost) category = 'Cheapest Good Fit';
            else category = 'Best Value';

            const footerNote = generateComparativeFooter(plan.planData, all, plan.calculatedPuffinScore);
            
            let alternative = null;
            if (index !== 0) {
                alternative = { label: 'top match', targetId: sortedResult[0].id, name: sortedResult[0].provider };
            }

            return {
                ...plan,
                category,
                footerNote: footerNote,
                alternative
            };
        });
    } catch (err) {
        console.error("Error computing plans:", err);
        return [];
    }
  }, [plans, loadState, userInput]);

  // --- Filtering & Sorting (Centralized) ---
  const { sortedPlans, isRelaxed } = useMemo(() => {
     return getSortedPlans(enrichedPlans, sortBy, filters);
  }, [enrichedPlans, filters, sortBy]);

  const getFiltersSummary = (f: PlanFiltersState) => {
      const active = [];
      if (f.price !== 'Any') active.push(f.price);
      if (f.data !== 'Any') active.push(f.data);
      if (f.contract !== 'Any') active.push(f.contract);
      if (f.roaming !== 'Any') active.push(f.roaming);
      if (f.network !== 'Any') active.push(f.network);
      if (f.specialFeatures.length > 0) active.push(f.specialFeatures.join(', '));
      return active.length > 0 ? active.join(', ') : 'None';
  };
  const filtersSummary = getFiltersSummary(filters);

  const onPlanClick = (plan: UIPlan, source: "heroCard" | "listCard" | "comparisonTable" | "modal") => {
      handlePlanClick(plan, {
          source,
          activeTab: sortBy,
          matchScore: plan.calculatedPuffinScore,
          filtersSummary
      });
  };

  // --- Hero Section Data ---
  const topHeroPlan = sortedPlans.length > 0 ? sortedPlans[0] : null;
  const topMatchScore = topHeroPlan ? topHeroPlan.calculatedPuffinScore : 0;
  
  // Dynamic Hero Analysis Text
  const topAnalysis = useMemo(() => buildTopAnalysisCopy({
      userProfile: profileId,
      priorities: userPriorities,
      budget: userBudget,
      activeTab: sortBy,
      topPlan: topHeroPlan?.planData,
      scoreBand: topHeroPlan ? getMatchLabel(topHeroPlan.calculatedPuffinScore).level : 'cautious'
  }), [profileId, userPriorities, userBudget, sortBy, topHeroPlan]);

  // Compute Last Updated
  const latestUpdatedDate = useMemo(() => {
      if (plans.length === 0) return null;
      // In a real scenario we'd sort dates, but if they all default to today or are the same from the sheet load, taking the first is fine.
      // If we want the max:
      return plans.reduce((max, p) => p.lastUpdated > max ? p.lastUpdated : max, plans[0].lastUpdated);
  }, [plans]);

  const activeSortOrder = profileId ? PROFILE_SORT_ORDER[profileId] : DEFAULT_SORT_ORDER;
  const appliedFilterCount = Object.values(filters).filter(v => v !== 'Any' && (!Array.isArray(v) || v.length > 0)).length;
  const heroPlans = sortedPlans.slice(0, 3);

  const renderProgressBar = (label: string, value: number, colorClass: string) => (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between text-[11px] uppercase font-bold text-gray-500 tracking-wider">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  const renderReliabilityBadge = (rawRating: number) => {
      let label = "Emerging";
      let colorClass = "bg-gray-100 text-gray-600 border-gray-200";
      
      if (rawRating >= 85) {
          label = "High";
          colorClass = "bg-purple-50 text-purple-700 border-purple-100";
      } else if (rawRating >= 70) {
          label = "Medium";
          colorClass = "bg-blue-50 text-blue-700 border-blue-100";
      }

      return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${colorClass}`}>
              <ShieldCheck className="w-3 h-3" />
              Provider reliability: {label}
          </div>
      );
  };

  const renderStars = (rating: number) => (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className={`w-2.5 h-2.5 rounded-full ${star <= rating ? 'bg-brand-orange' : 'bg-gray-200'}`} />
        ))}
      </div>
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPlan(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
      if (selectedPlan) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = 'unset';
      return () => { document.body.style.overflow = 'unset'; };
  }, [selectedPlan]);

  const resetAllFilters = () => {
      setFilters({ price: 'Any', data: 'Any', contract: 'Any', roaming: 'Any', network: 'Any', specialFeatures: [] });
      const listTop = document.getElementById('plans-list-top');
      if (listTop) listTop.scrollIntoView({ behavior: 'smooth' });
  };

  if (loadState === 'error') {
      return (
          <div className="w-full max-w-lg mx-auto mt-12 p-8 bg-red-50 rounded-2xl border border-red-100 text-center">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-900 mb-2">We couldn’t load the latest SIM deals right now.</h3>
              <p className="text-red-700 mb-6">{loadError || "Please check your connection."}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold">Try again</button>
          </div>
      );
  }

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in-up pb-12 px-2 sm:px-0 relative">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Your Tailored SIM Picks</h2>
        <p className="text-gray-500 text-lg">These plans match your real habits — data, travel, and budget preferences.</p>
        
        <div className="flex flex-col items-center gap-1 mt-4">
             <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                 <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Data source: Puffin SIM dataset (Google Sheets v1)</span>
                 {latestUpdatedDate && (
                     <>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Updated: {latestUpdatedDate}</span>
                     </>
                 )}
             </div>
             <p className="text-[10px] text-gray-400 text-opacity-80 max-w-md mx-auto leading-tight italic">
                Beta notice: Plans are manually curated from provider websites. Prices are indicative and may change.
             </p>
        </div>
      </div>

      {loadState === 'loading' ? (
        <div className="text-center py-12">
           <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
           <h3 className="text-xl font-bold text-gray-900">Scanning the best SIM-only deals for you...</h3>
           <div className="mt-8">
              <PlansSkeleton />
           </div>
        </div>
      ) : (
      <>
      {/* Match Score & Explanation Block */}
      <div className="bg-gradient-to-br from-[#FFF7EE] to-white rounded-3xl border border-orange-100/50 p-6 md:p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
              <div className="flex-shrink-0 flex items-center gap-3 md:gap-0 md:flex-col md:items-center md:justify-center bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-orange-100 w-full md:w-40 shadow-sm group/tooltip relative cursor-help">
                   <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path className="text-orange-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          <path className="text-brand-orange transition-all duration-1000 ease-out" strokeDasharray={`${topMatchScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      </svg>
                      <span className="absolute text-lg md:text-2xl font-bold text-gray-900">{topMatchScore > 0 ? `${topMatchScore}%` : '--'}</span>
                   </div>
                   <div className="flex flex-col md:items-center">
                       <span className="text-xs font-bold text-gray-900 uppercase tracking-wide mt-2 text-center leading-tight">
                           {topMatchScore > 0 ? (topHeroPlan ? getMatchLabel(topMatchScore).label : "Top Score") : "No Match"}
                       </span>
                   </div>
                   <ScoreTooltip />
              </div>

              <div className="flex-grow space-y-3">
                   <div className="flex items-center gap-2 mb-1">
                       <div className="p-1.5 rounded-lg bg-brand-orange/10">
                          <Sparkles className="w-4 h-4 text-brand-orange" />
                       </div>
                       <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">
                          {topHeroPlan ? topAnalysis.headline : "No Exact Matches Found"}
                       </h3>
                   </div>
                   <p className="text-gray-600 leading-relaxed text-base">
                      {topHeroPlan ? topAnalysis.body : "We couldn't find any plans matching your exact filters. Try relaxing your budget or contract preferences."}
                   </p>
              </div>
          </div>
      </div>

      {/* Sorting Bar */}
      <div id="plans-list-top" className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-6 flex flex-col sticky top-20 z-30 backdrop-blur-md bg-white/95">
        <div className="flex flex-wrap gap-2 justify-center items-center">
            {activeSortOrder.map((option) => (
            <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                sortBy === option
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
            >
                {option === 'Best Budget Fit' ? 'Budget Fit' : option}
            </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                    showFilters || appliedFilterCount > 0
                    ? 'bg-orange-50 text-brand-orange border border-orange-100' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {appliedFilterCount > 0 && (
                   <span className="bg-brand-orange text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                     {appliedFilterCount}
                   </span>
                )}
            </button>
        </div>

        {showFilters && (
            <PlanFilters 
                filters={filters} 
                onChangeFilters={setFilters} 
                onClearFilters={resetAllFilters}
                appliedCount={appliedFilterCount}
            />
        )}
        
        {isRelaxed && sortedPlans.length > 0 && (
             <div className="mt-2 mx-1 p-2 bg-blue-50/50 text-blue-800 text-xs font-medium rounded-lg border border-blue-100 flex items-center justify-center gap-2 animate-fade-in-up">
                <Info className="w-3.5 h-3.5" />
                We relaxed some filters to show you the closest matches.
             </div>
        )}
      </div>

      {/* Helper Text */}
      {sortedPlans.length > 0 && (
        <div className="text-center text-xs text-gray-400 mb-4 animate-fade-in-up">
            When you’re ready, click ‘View deal’ to continue on the provider’s site.
        </div>
      )}

      {/* Plans List */}
      <div className="space-y-8">
        {sortedPlans.length === 0 ? (
             <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 animate-fade-in-up">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <RefreshCw className="w-6 h-6 text-gray-400" />
                 </div>
                 <h3 className="text-gray-900 font-bold text-xl mb-2">No perfect matches yet</h3>
                 <p className="text-gray-500 max-w-sm mx-auto mb-8">We couldn’t find any plans that match all your filters. Try relaxing your price, data, or contract length.</p>
                 <button 
                    onClick={resetAllFilters}
                    className="px-8 py-3 bg-gray-900 text-white rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-1"
                 >
                     Reset Filters
                 </button>
             </div>
        ) : (
          <>
            {heroPlans.map((plan) => {
              const isBudgetSet = userBudget !== undefined && userBudget > 0;
              const isWithinBudget = isBudgetSet && plan.monthlyCost <= userBudget!;
              const profileTags = profileId ? PROFILE_TAGS[profileId] : [];
              const matchInfo = getMatchLabel(plan.calculatedPuffinScore);
              
              return (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`bg-white rounded-3xl border border-gray-100 overflow-hidden transition-all duration-300 shadow-[0px_4px_24px_rgba(0,0,0,0.04)] cursor-pointer group hover:shadow-xl hover:-translate-y-1 ${
                    hoveredPlanId === plan.id ? 'ring-2 ring-brand-orange z-10' : ''
                  }`}
                >
                  <div className={`px-8 py-7 border-b border-gray-50 relative ${
                      plan.category === 'Top Puffin Pick' ? 'bg-gradient-to-r from-brand-orange/5 to-transparent' : ''
                  }`}>
                      {plan.category === 'Top Puffin Pick' && (
                          <div className="absolute top-0 right-0 bg-brand-orange text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-sm">
                              Best Match
                          </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                              <div className="flex items-center gap-3 mb-1.5 relative z-20">
                                 <div className="text-xs font-bold text-brand-orange uppercase tracking-wider">
                                    {plan.category}
                                 </div>
                                 
                                 <div className="group/tooltip relative cursor-help">
                                     <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${matchInfo.badgeClass}`}>
                                         {matchInfo.label}
                                     </div>
                                     <ScoreTooltip />
                                 </div>
                              </div>

                              <div className="flex items-center gap-4 mb-2">
                                <ProviderLogo provider={plan.provider} className="w-10 h-10 text-sm shrink-0 shadow-sm" />
                                <div className="flex items-baseline gap-3">
                                    <h3 className="text-3xl font-extrabold text-gray-900 leading-tight group-hover:text-brand-orange transition-colors">{plan.provider}</h3>
                                    <span className="text-gray-300 font-light text-xl">|</span>
                                    <span className="text-gray-700 font-semibold text-lg">{plan.name}</span>
                                </div>
                              </div>
                              
                              {profileTags && profileTags.length > 0 && (
                                 <div className="flex flex-wrap gap-2 mt-3 mb-3">
                                   {profileTags.map((tag, i) => (
                                     <div key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-100 uppercase tracking-wide">
                                       {tag}
                                     </div>
                                   ))}
                                 </div>
                              )}

                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                                 <Signal className="w-4 h-4 text-gray-400" />
                                 <span>{plan.network}</span>
                                 <span className="text-gray-300">•</span>
                                 {renderStars(plan.coverageRating)}
                              </div>
                          </div>
                          <div className="flex flex-col items-start sm:items-end flex-shrink-0 bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl mt-2 sm:mt-0">
                               <div className="text-4xl font-extrabold text-gray-900 tracking-tight">£{plan.monthlyCost}</div>
                               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">per month</div>
                               {isBudgetSet && (
                                  <div className={`mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                      isWithinBudget 
                                      ? 'bg-green-50 text-green-700 border-green-100' 
                                      : 'bg-orange-50 text-orange-700 border-orange-100'
                                  }`}>
                                      {isWithinBudget ? 'Within Budget' : 'Over Budget'}
                                  </div>
                               )}
                               
                               <div className="mt-3">
                                   {renderReliabilityBadge(plan.planData.rawRating)}
                               </div>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-50 divide-x divide-gray-50 pointer-events-none">
                     <div className="py-4 px-2 text-center group-hover:bg-gray-50/50 transition-colors">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Data</div>
                        <div className="font-extrabold text-gray-900 text-base flex items-center justify-center gap-1.5">
                          <Wifi className="w-4 h-4 text-blue-500" />
                          {plan.dataAllowanceGB === -1 ? "Unlimited" : `${plan.dataAllowanceGB} GB`}
                        </div>
                     </div>
                     <div className="py-4 px-2 text-center group-hover:bg-gray-50/50 transition-colors">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Contract</div>
                        <div className="font-extrabold text-gray-900 text-base flex items-center justify-center gap-1.5">
                          <Calendar className="w-4 h-4 text-purple-500" />
                          {plan.contractLength}
                        </div>
                     </div>
                     <div className="py-4 px-2 text-center group-hover:bg-gray-50/50 transition-colors">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Roaming</div>
                        <div className="font-extrabold text-gray-900 text-base flex items-center justify-center gap-1.5">
                          <Globe className="w-4 h-4 text-green-500" />
                          {plan.euRoaming.includes("Included") || plan.euRoaming.includes("Free") ? "Free EU" : "Paid"}
                        </div>
                     </div>
                     <div className="py-4 px-2 text-center group-hover:bg-gray-50/50 transition-colors">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Hotspot</div>
                        <div className="font-extrabold text-gray-900 text-base flex items-center justify-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-orange-500" />
                          {plan.hotspotRules.includes("Unlimited") ? "Unltd" : "Allowed"}
                        </div>
                     </div>
                  </div>

                  <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8 pointer-events-none">
                      <div className="md:col-span-7 space-y-4">
                          <div>
                              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  Why this fits you
                              </h4>
                              
                              {/* New Highlight Note Section */}
                              {plan.planData.highlightNote && (
                                  <div className="mb-3">
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-100">
                                          <Tag className="w-3 h-3" />
                                          <span className="font-bold">Plan highlight:</span> {plan.planData.highlightNote}
                                      </div>
                                  </div>
                              )}

                              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3">
                                  <p className="text-sm text-gray-900 leading-relaxed font-medium">
                                      {plan.explanationPrimary}
                                  </p>
                                  
                                  {plan.explanationTradeOff && (
                                      <div className="flex items-start gap-2 bg-white/60 p-2.5 rounded-xl border border-gray-200/50">
                                          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                                          <p className="text-xs text-gray-500 italic leading-snug">{plan.explanationTradeOff}</p>
                                      </div>
                                  )}

                                  <ul className="space-y-2 pt-2">
                                    {plan.explanationBullets.map((bullet, idx) => (
                                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2.5">
                                        <div className="mt-1 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-2.5 h-2.5 text-green-600" />
                                        </div>
                                        <span className="leading-snug">{bullet}</span>
                                      </li>
                                    ))}
                                  </ul>
                              </div>
                          </div>
                      </div>

                      <div className="md:col-span-5 bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
                          <div className="flex items-center gap-4 mb-4">
                              <div className="relative cursor-help pointer-events-auto group/tooltip">
                                  <div className="flex flex-col">
                                      <span className="text-4xl font-extrabold text-gray-900 leading-none tracking-tight">{plan.calculatedPuffinScore}</span>
                                      <div className="flex items-center gap-1.5 mt-1">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Match Score</span>
                                          <Info className="w-3 h-3 text-gray-400" />
                                      </div>
                                  </div>
                                  <ScoreTooltip />
                              </div>

                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-brand-orange border border-gray-100 ml-auto">
                                  <TrendingUp className="w-5 h-5" />
                              </div>
                          </div>

                          <div className="space-y-3">
                              {renderProgressBar("Data Fit", plan.scoreBreakdown.dataFit, "bg-blue-500")}
                              {renderProgressBar("Price Fit", plan.scoreBreakdown.priceFit, "bg-green-500")}
                              {renderProgressBar("Roaming Fit", plan.scoreBreakdown.roamingFit, "bg-teal-500")}
                              {renderProgressBar("Reliability Fit", plan.scoreBreakdown.reliabilityFit, "bg-purple-500")}
                              {renderProgressBar("Contract Fit", plan.scoreBreakdown.contractFit, "bg-gray-500")}
                          </div>
                      </div>
                  </div>

                  <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 px-2">
                          <div className="text-sm font-bold text-brand-orange hover:text-orange-700 underline decoration-brand-orange/30 underline-offset-4 cursor-pointer w-fit">
                              More details
                          </div>
                      </div>
                      <button 
                          onClick={(e) => { 
                              e.stopPropagation();
                              onPlanClick(plan, 'listCard');
                          }}
                          className="group py-3 px-8 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 transform active:scale-[0.99] hover:-translate-y-0.5"
                          aria-label={`View this ${plan.provider} deal in a new tab`}
                      >
                          <span>View deal on {plan.provider}</span>
                          <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {selectedPlan && (
          <div className="fixed inset-0 z-[60] flex justify-end items-end sm:items-stretch" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
              <div 
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                  aria-hidden="true"
                  onClick={() => setSelectedPlan(null)}
              ></div>

              <div className="relative w-full sm:w-[520px] bg-white shadow-2xl flex flex-col h-[92vh] sm:h-full rounded-t-3xl sm:rounded-none sm:rounded-l-3xl overflow-hidden">
                  <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                      <h3 className="text-lg font-bold text-gray-900">Plan Details</h3>
                      <button 
                          onClick={() => setSelectedPlan(null)}
                          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white custom-scrollbar">
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="flex items-center gap-3 mb-3">
                                <ProviderLogo provider={selectedPlan.provider} className="w-10 h-10 text-sm shadow-sm" />
                                <div className="text-xs font-bold text-brand-orange uppercase tracking-wider">
                                    {selectedPlan.provider}
                                </div>
                              </div>
                              <h2 className="text-3xl font-extrabold text-gray-900 leading-tight mb-3">
                                  {selectedPlan.name}
                              </h2>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Signal className="w-4 h-4" />
                                  <span>{selectedPlan.network} network</span>
                                  <span className="text-gray-300">|</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${getMatchLabel(selectedPlan.calculatedPuffinScore).badgeClass}`}>
                                      {selectedPlan.matchStrength}
                                  </span>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-4xl font-extrabold text-gray-900">£{selectedPlan.monthlyCost}</div>
                              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">per month</div>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                              <div className="text-xs font-bold text-blue-800 uppercase mb-2">Data</div>
                              <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                  <Wifi className="w-5 h-5 text-blue-600" />
                                  {selectedPlan.dataAllowanceGB === -1 ? "Unlimited" : `${selectedPlan.dataAllowanceGB} GB`}
                              </div>
                          </div>
                          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                              <div className="text-xs font-bold text-purple-800 uppercase mb-2">Contract</div>
                              <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-purple-600" />
                                  {selectedPlan.contractLength}
                              </div>
                          </div>
                      </div>

                      {/* Modal Explanation Section */}
                      <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                             Why this fits you
                          </h4>

                          {/* New Highlight Note Section in Modal */}
                          {selectedPlan.planData.highlightNote && (
                              <div className="mb-3">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-100">
                                      <Tag className="w-3 h-3" />
                                      <span className="font-bold">Plan highlight:</span> {selectedPlan.planData.highlightNote}
                                  </div>
                              </div>
                          )}

                          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                              <p className="text-sm text-gray-900 leading-relaxed font-medium">
                                  {selectedPlan.explanationPrimary}
                              </p>
                              {selectedPlan.explanationTradeOff && (
                                  <div className="flex items-start gap-2 bg-white/60 p-3 rounded-xl border border-gray-200/50">
                                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-gray-500 italic leading-snug">{selectedPlan.explanationTradeOff}</p>
                                  </div>
                              )}
                              <ul className="space-y-2.5 pt-1">
                                {selectedPlan.explanationBullets.map((bullet, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2.5">
                                    <div className="mt-1 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                       <Check className="w-2.5 h-2.5 text-green-600" />
                                    </div>
                                    <span className="leading-snug">{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-brand-orange" />
                              Match Score Breakdown
                          </h4>
                          <div className="space-y-4">
                              {renderProgressBar("Data Fit", selectedPlan.scoreBreakdown.dataFit, "bg-blue-500")}
                              {renderProgressBar("Price Fit", selectedPlan.scoreBreakdown.priceFit, "bg-green-500")}
                              {renderProgressBar("Roaming Fit", selectedPlan.scoreBreakdown.roamingFit, "bg-teal-500")}
                              {renderProgressBar("Reliability Fit", selectedPlan.scoreBreakdown.reliabilityFit, "bg-purple-500")}
                              {renderProgressBar("Contract Fit", selectedPlan.scoreBreakdown.contractFit, "bg-gray-500")}
                          </div>
                      </div>
                      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4">
                               <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                   <span className="text-gray-500">Contract Term</span>
                                   <span className="font-bold text-gray-900">{selectedPlan.contractLength}</span>
                               </div>
                               <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                   <span className="text-gray-500">Roaming Cap</span>
                                   <span className="font-bold text-gray-900 text-right max-w-[200px]">{selectedPlan.euRoaming}</span>
                               </div>
                               <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                   <span className="text-gray-500">Hotspot Rules</span>
                                   <span className="font-bold text-gray-900 text-right max-w-[200px]">{selectedPlan.hotspotRules}</span>
                               </div>
                               <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                   <span className="text-gray-500">Network Host</span>
                                   <span className="font-bold text-gray-900">{selectedPlan.network}</span>
                               </div>
                               <div className="flex justify-between items-center text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                   <span className="text-gray-500">Reliability Score</span>
                                   <span className="font-bold text-gray-900">{selectedPlan.planData.rawRating}/100</span>
                               </div>
                          </div>
                  </div>
                  <div className="p-8 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10">
                      <button 
                        onClick={() => onPlanClick(selectedPlan, 'modal')}
                        className="w-full py-4 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-orange-200 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] hover:-translate-y-1"
                      >
                          <span>View Deal on {selectedPlan.provider}</span>
                          <ExternalLink className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Comparison Table */}
      {loadState === 'loaded' && (
      <div className="mt-12 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-900">Compare your options at a glance</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-100">
                    <tr>
                        <th className="px-5 py-4 whitespace-nowrap">Provider</th>
                        <th className="px-5 py-4 whitespace-nowrap">Plan</th>
                        <th className="px-5 py-4 whitespace-nowrap">Price</th>
                        {userBudget !== undefined && userBudget > 0 && (
                            <th className="px-5 py-4 whitespace-nowrap">Budget Fit</th>
                        )}
                        <th className="px-5 py-4 whitespace-nowrap">Data</th>
                        <th className="px-5 py-4 whitespace-nowrap">Roaming</th>
                        <th className="px-5 py-4 whitespace-nowrap">Hotspot</th>
                        <th className="px-5 py-4 whitespace-nowrap">Score</th>
                        <th className="px-5 py-4 whitespace-nowrap">Match</th>
                        <th className="px-5 py-4 whitespace-nowrap">Deal</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedPlans.map(plan => {
                         const isBudgetSet = userBudget !== undefined && userBudget > 0;
                         const isWithinBudget = isBudgetSet && plan.monthlyCost <= userBudget!;
                         const matchInfo = getMatchLabel(plan.calculatedPuffinScore);

                        return (
                            <tr 
                                key={plan.id}
                                onMouseEnter={() => setHoveredPlanId(plan.id)}
                                onMouseLeave={() => setHoveredPlanId(null)}
                                onClick={() => setSelectedPlan(plan)}
                                className={`transition-colors cursor-pointer hover:bg-orange-50/30`}
                            >
                                <td className="px-5 py-4 font-bold text-gray-900">{plan.provider}</td>
                                <td className="px-5 py-4 text-gray-600 font-medium">{plan.name}</td>
                                <td className="px-5 py-4 font-extrabold text-gray-900">£{plan.monthlyCost}</td>
                                {isBudgetSet && (
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                            isWithinBudget ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                        }`}>
                                            {isWithinBudget ? 'Within' : 'Above'}
                                        </span>
                                    </td>
                                )}
                                <td className="px-5 py-4 text-gray-600 font-medium">{plan.dataAllowanceGB === -1 ? 'Unlimited' : `${plan.dataAllowanceGB} GB`}</td>
                                <td className="px-5 py-4 text-gray-600 font-medium truncate max-w-[150px]" title={plan.euRoaming}>
                                    {plan.euRoaming.includes("Included") ? "Included" : plan.euRoaming.includes("Free") ? "Free EU" : "Paid"}
                                </td>
                                <td className="px-5 py-4 text-gray-600 font-medium">{plan.hotspotRules.includes("Unlimited") ? "Unlimited" : "Allowed"}</td>
                                <td className="px-5 py-4 font-extrabold text-brand-orange text-lg">{plan.calculatedPuffinScore}</td>
                                <td className="px-5 py-4">
                                   <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold border ${matchInfo.badgeClass}`}>
                                     {matchInfo.label}
                                   </span>
                                </td>
                                <td className="px-5 py-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPlanClick(plan, 'comparisonTable');
                                        }}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-xs font-bold transition-colors hover:shadow-sm"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
      )}
      </>
      )}

      <div className="mt-12 text-center pb-8">
            <button 
                onClick={onReset}
                className="text-gray-400 text-sm font-medium hover:text-brand-orange hover:underline decoration-brand-orange/30 underline-offset-4 transition-all"
            >
                Analyse a different lifestyle
            </button>
        </div>
    </div>
  );
};

export default PlanRecommendation;
