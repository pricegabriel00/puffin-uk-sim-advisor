
import React, { useState, useMemo, useEffect } from 'react';
import { AnalysisResult, UserInput, PlanRecommendation as UIPlan, Plan, PlanFiltersState, PriceFilter, DataFilter, RoamingFilter } from '../types';
import { Check, Info, Sparkles, X, AlertTriangle, Filter, RefreshCw, ExternalLink, ChevronDown, SortAsc, LayoutGrid, List } from 'lucide-react';
import PlanFilters from './PlanFilters';
import { buildPlanExplanation, buildTopAnalysisCopy } from '../utils/explanations';
import { getMatchLabel } from '../utils/matchLabel';
import { getSortedPlans, SortOption } from '../utils/sorting';
import { computeMatchScore } from '../utils/scoring';
import { fetchSimPlans } from '../services/planService';

interface PlanRecommendationProps {
  analysis: AnalysisResult;
  userInput: UserInput;
  onReset: () => void;
}

const ProviderLogo = ({ provider, className = "w-8 h-8" }: { provider: string, className?: string }) => {
    const p = provider.toLowerCase();
    let content = <span className="text-[10px]">{provider.slice(0, 2)}</span>;
    let styleClass = "bg-gray-100 text-gray-600";

    if (p.includes('ee')) { styleClass = "bg-[#007B85] text-white"; content = <span>EE</span>; }
    else if (p.includes('vodafone')) { styleClass = "bg-[#E60000] text-white"; content = <span>VF</span>; }
    else if (p.includes('three')) { styleClass = "bg-black text-white"; content = <span>3</span>; }
    else if (p.includes('o2')) { styleClass = "bg-[#032B5A] text-white"; content = <span>O2</span>; }
    else if (p.includes('voxi')) { styleClass = "bg-black text-white font-extrabold"; content = <span className="text-[8px]">VOXI</span>; }
    else if (p.includes('smarty')) { styleClass = "bg-[#121520] text-[#00D95F]"; content = <span className="text-[8px]">SM</span>; }
    else if (p.includes('id') || p.includes('id mobile')) { styleClass = "bg-[#252525] text-[#71C7BA]"; content = <span>iD</span>; }
    else if (p.includes('lebara')) { styleClass = "bg-[#00A4E4] text-white"; content = <span>LB</span>; }

    return (
        <div className={`flex items-center justify-center rounded-md shadow-sm font-bold select-none ${styleClass} ${className}`}>
            {content}
        </div>
    );
};

const PlansSkeleton = () => (
    <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8 h-64"></div>
        ))}
    </div>
);

const PlanResults: React.FC<PlanRecommendationProps> = ({ analysis, userInput, onReset }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('Recommended');
  const [selectedPlan, setSelectedPlan] = useState<UIPlan | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  useEffect(() => {
      const loadPlans = async () => {
          setLoadState('loading');
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

  const enrichedPlans = useMemo(() => {
    if (loadState !== 'loaded' || plans.length === 0) return [];

    try {
        const result = plans.map((plan: Plan) => {
            const { total: finalScore, subScores, debug } = computeMatchScore(plan, userInput);
            const roamingLabel = plan.euRoamingIncluded 
              ? (plan.euRoamingCapGB && plan.euRoamingCapGB > 0 ? `EU roaming capped at ${plan.euRoamingCapGB}GB` : "EU roaming included")
              : "No inclusive EU roaming";

            const { primaryText, tradeoffText, bulletPoints } = buildPlanExplanation(plan, userInput);
            const matchLabelInfo = getMatchLabel(finalScore);

            return {
                id: plan.id,
                category: 'Top Puffin Pick' as const,
                provider: plan.provider,
                name: plan.planName,
                monthlyCost: plan.monthlyPrice,
                dataAllowanceGB: plan.dataAllowanceGB === null ? -1 : plan.dataAllowanceGB,
                contractLength: plan.contractLengthMonths === 1 ? "1 month rolling" : `${plan.contractLengthMonths} months`,
                euRoaming: roamingLabel,
                hotspotRules: plan.hotspotPolicy === 'unlimited' ? "Unlimited" : "Standard",
                network: `Runs on ${plan.network}`,
                coverageRating: plan.reliabilityRating,
                calculatedPuffinScore: finalScore,
                matchStrength: matchLabelInfo.label,
                scoreBreakdown: subScores,
                explanationPrimary: primaryText,
                explanationTradeOff: tradeoffText,
                explanationBullets: bulletPoints,
                features: [...(plan.keyPerks || []), plan.includes5G ? "5G Ready" : "", plan.euRoamingIncluded ? "EU Roaming" : ""].filter(Boolean),
                planData: plan,
                debug
            };
        });

        const sortedResult = result.sort((a, b) => b.calculatedPuffinScore - a.calculatedPuffinScore);
        return sortedResult.map((plan, index, all) => ({
            ...plan,
            category: index === 0 ? 'Top Puffin Pick' : (plan.monthlyCost < all[0].monthlyCost ? 'Cheapest Good Fit' : 'Best Value')
        })) as UIPlan[];
    } catch (err) {
        console.error("Error computing plans:", err);
        return [];
    }
  }, [plans, loadState, userInput]);

  const { sortedPlans } = useMemo(() => {
     return getSortedPlans(enrichedPlans, sortBy, filters);
  }, [enrichedPlans, filters, sortBy]);

  const topHeroPlan = sortedPlans.length > 0 ? sortedPlans[0] : null;
  const topMatchScore = topHeroPlan ? topHeroPlan.calculatedPuffinScore : 0;
  const topMatchInfo = getMatchLabel(topMatchScore);
  
  const topAnalysis = useMemo(() => buildTopAnalysisCopy({
      userProfile: profileId,
      priorities: userPriorities,
      budget: userBudget,
      activeTab: sortBy,
      topPlan: topHeroPlan?.planData,
      scoreBand: topHeroPlan ? getMatchLabel(topHeroPlan.calculatedPuffinScore).level : 'cautious'
  }), [profileId, userPriorities, userBudget, sortBy, topHeroPlan]);

  const resetAllFilters = () => {
      setFilters({ price: 'Any', data: 'Any', contract: 'Any', roaming: 'Any', network: 'Any', specialFeatures: [] });
  };

  const updateFilters = (newFilters: Partial<PlanFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (loadState === 'error') {
      return (
          <div className="w-full max-w-lg mx-auto mt-12 p-8 bg-red-50 rounded-2xl border border-red-100 text-center">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-900 mb-2">Error loading deals</h3>
              <p className="text-red-700 mb-6">{loadError}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold">Retry</button>
          </div>
      );
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in-up pb-12 px-4 sm:px-0 text-gray-900">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold mb-2 tracking-tight">Your Tailored SIM Picks</h2>
        <p className="text-gray-500 text-lg">Independent results based on your usage profile.</p>
      </div>

      {loadState === 'loading' ? <PlansSkeleton /> : (
      <>
        {/* Analysis Summary */}
        <div className="bg-gradient-to-br from-[#FFF7EE] to-white rounded-3xl border border-orange-100/50 p-6 md:p-8 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white/60 rounded-3xl p-6 border border-orange-100 w-full md:w-44 shadow-sm">
                   <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path className="text-orange-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          <path className="text-brand-orange transition-all duration-1000 ease-out" strokeDasharray={`${topMatchScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      </svg>
                      <span className="absolute text-2xl font-bold">{topMatchScore}%</span>
                   </div>
                   <div className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Puffin Score</div>
                   <div className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${topMatchInfo.badgeClass}`}>{topMatchInfo.label}</div>
              </div>
              <div className="flex-grow space-y-3 pt-2">
                   <h3 className="text-lg font-bold uppercase tracking-wide flex items-center gap-2 justify-center md:justify-start">
                       <Sparkles className="w-5 h-5 text-brand-orange" />
                       {topAnalysis.headline}
                   </h3>
                   <p className="text-gray-600 text-base leading-relaxed">{topAnalysis.body}</p>
              </div>
          </div>
        </div>

        {/* Toolbar: Sorting & Smart Filters */}
        <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 p-4 sm:p-6 mb-4 shadow-sm flex flex-col gap-6">
            
            {/* Sorting Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sort by:</span>
                <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100">
                  {['Recommended', 'Price', 'Most Data'].map(option => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option as SortOption)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        sortBy === option ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {option === 'Price' ? 'Price: low to high' : option === 'Most Data' ? 'Data: high to low' : option}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
                className={`text-xs font-bold flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  showAdvancedFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                Advanced Filters
              </button>
            </div>

            {/* Smart Filters Row */}
            <div className="flex flex-wrap items-center gap-y-4 gap-x-6 pt-4 border-t border-gray-50">
                {/* Intent Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-200 transition-all checked:bg-brand-orange checked:border-brand-orange"
                        checked={filters.roaming === 'Required'}
                        onChange={(e) => updateFilters({ roaming: e.target.checked ? 'Required' : 'Any' })}
                      />
                      <Check className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-0.5" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">EU roaming required</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-200 transition-all checked:bg-brand-orange checked:border-brand-orange"
                        checked={filters.data === 'Unlimited'}
                        onChange={(e) => updateFilters({ data: e.target.checked ? 'Unlimited' : 'Any' })}
                      />
                      <Check className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-0.5" strokeWidth={4} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Unlimited data only</span>
                  </label>
                </div>

                {/* Dropdown Selects */}
                <div className="flex items-center gap-4 ml-auto">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">At least</span>
                      <select 
                        className="bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-orange/20"
                        value={filters.data === 'Unlimited' ? 'Unlimited' : filters.data}
                        onChange={(e) => updateFilters({ data: e.target.value as any })}
                      >
                        <option value="Any">Any Data</option>
                        <option value="20GB+">20GB+</option>
                        <option value="50GB+">50GB+</option>
                        <option value="100GB+">100GB+</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Under</span>
                      <select 
                        className="bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-orange/20"
                        value={filters.price}
                        onChange={(e) => updateFilters({ price: e.target.value as any })}
                      >
                        <option value="Any">Any Price</option>
                        <option value="Under £10">Under £10</option>
                        <option value="Under £15">Under £15</option>
                        <option value="Under £20">Under £20</option>
                      </select>
                    </div>
                </div>
            </div>

            {/* Advanced Filters Expandable */}
            {showAdvancedFilters && (
              <div className="pt-4 animate-fade-in-up border-t border-gray-50">
                 <PlanFilters 
                  filters={filters} 
                  onChangeFilters={setFilters} 
                  onClearFilters={resetAllFilters} 
                  appliedCount={0} 
                />
              </div>
            )}
        </div>

        {/* Curated Explanation Line */}
        {sortedPlans.length > 0 && (
          <div className="mb-6 px-4">
            <p className="text-sm text-gray-400 font-medium italic">
              “We’ve narrowed this down to the strongest options for your needs — based on value, coverage, and flexibility.”
            </p>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-6">
          {sortedPlans.length === 0 ? (
               <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                   <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                   <h3 className="font-bold text-xl mb-2 text-gray-900">No strong matches with these filters</h3>
                   <p className="text-gray-500 mb-6 text-sm px-6">Try loosening one to see better options.</p>
                   <button onClick={resetAllFilters} className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all">Clear Filters</button>
               </div>
          ) : (
            sortedPlans.map((plan) => {
              const matchInfo = getMatchLabel(plan.calculatedPuffinScore);
              const isTopPick = plan.category === 'Top Puffin Pick';
              return (
                <div key={plan.id} onClick={() => setSelectedPlan(plan)} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm cursor-pointer group hover:shadow-xl transition-all duration-300">
                  <div className={`px-8 py-6 border-b border-gray-50 ${isTopPick ? 'bg-orange-50/20' : ''}`}>
                      <div className="flex flex-col sm:flex-row justify-between gap-6">
                          <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                 {isTopPick && <span className="text-[11px] font-extrabold text-brand-orange uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3" /> Top Puffin Pick</span>}
                                 <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${matchInfo.badgeClass}`}>{matchInfo.label}</div>
                              </div>
                              <div className="flex items-center gap-5">
                                <ProviderLogo provider={plan.provider} className="w-12 h-12 rounded-xl" />
                                <h3 className="text-3xl font-extrabold text-gray-900">{plan.provider} <span className="text-gray-400 font-medium text-xl ml-1">{plan.name}</span></h3>
                              </div>
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                               <div className="text-4xl font-extrabold text-gray-900">£{plan.monthlyCost}</div>
                               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">per month</div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                      <div className="flex-1 bg-gray-50/50 p-6 rounded-3xl border border-gray-100/50">
                          <p className="text-sm font-bold text-gray-800 mb-4">{plan.explanationPrimary}</p>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {plan.explanationBullets.map((bullet, idx) => (
                              <li key={idx} className="text-xs text-gray-600 flex items-center gap-3">
                                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3 h-3 text-green-600" strokeWidth={4} />
                                </div>
                                {bullet}
                              </li>
                            ))}
                          </ul>
                      </div>
                      <div className="md:w-48 flex flex-row md:flex-col justify-between md:justify-center items-center gap-4">
                          <div className="flex flex-col items-center">
                              <span className="text-3xl font-black text-gray-900 group-hover:text-brand-orange transition-colors">{plan.calculatedPuffinScore}</span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Puffin Score</span>
                          </div>
                          <a 
                            href={plan.planData.dealUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="py-3.5 px-8 bg-gray-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-brand-orange hover:shadow-lg hover:shadow-orange-100 transition-all transform hover:-translate-y-0.5"
                          >
                              View deal <ExternalLink className="w-4 h-4" />
                          </a>
                      </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
      )}

      {/* Plan Details Sidebar / Modal */}
      {selectedPlan && (
          <div className="fixed inset-0 z-[60] flex justify-end items-end sm:items-stretch" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPlan(null)}></div>
              <div className="relative w-full sm:w-[520px] bg-white shadow-2xl flex flex-col h-[90vh] sm:h-full rounded-t-[2.5rem] sm:rounded-none overflow-hidden">
                  <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                      <h3 className="font-bold text-gray-900 tracking-tight">Analysis</h3>
                      <button onClick={() => setSelectedPlan(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-32">
                      <div className="flex items-center gap-6">
                          <ProviderLogo provider={selectedPlan.provider} className="w-16 h-16 rounded-2xl" />
                          <div>
                              <h2 className="text-3xl font-extrabold text-gray-900">{selectedPlan.provider}</h2>
                              <p className="text-gray-500 font-semibold">{selectedPlan.name}</p>
                          </div>
                      </div>
                      
                      <div className="bg-orange-50/40 p-8 rounded-[2rem] border border-orange-100/50">
                         <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-900">{selectedPlan.explanationPrimary}</h4>
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${getMatchLabel(selectedPlan.calculatedPuffinScore).badgeClass}`}>{getMatchLabel(selectedPlan.calculatedPuffinScore).label}</div>
                         </div>
                         <ul className="space-y-4">
                            {selectedPlan.explanationBullets.map((bullet, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-4 text-gray-700">
                                <div className="mt-0.5 h-5 w-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <Check className="w-3 h-3 text-green-600" strokeWidth={4} />
                                </div>
                                {bullet}
                              </li>
                            ))}
                         </ul>
                      </div>

                      <div className="space-y-6">
                          <h4 className="text-xs font-bold uppercase text-gray-400 tracking-[0.2em]">Confidence Breakdown</h4>
                          {[
                            { label: "Data Fit", value: selectedPlan.scoreBreakdown.dataFit, color: "bg-blue-500" },
                            { label: "Price Fit", value: selectedPlan.scoreBreakdown.priceFit, color: "bg-green-500" },
                            { label: "Roaming Fit", value: selectedPlan.scoreBreakdown.roamingFit, color: "bg-teal-500" },
                            { label: "Network Reliability", value: selectedPlan.scoreBreakdown.reliabilityFit, color: "bg-purple-500" }
                          ].map(item => (
                            <div key={item.label} className="space-y-2">
                                <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase">
                                  <span>{item.label}</span>
                                  <span>{item.value}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-1000 ${item.color}`} style={{ width: `${item.value}%` }} />
                                </div>
                            </div>
                          ))}
                          <div className="pt-2 text-center">
                            <span className="text-xs font-bold text-gray-400">Total Puffin Score: <span className="text-gray-900">{selectedPlan.calculatedPuffinScore}%</span></span>
                          </div>
                      </div>

                      <div className="pt-6">
                        <h4 className="text-xs font-bold uppercase text-gray-400 tracking-[0.2em] mb-4">Highlights</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPlan.features.map(f => (
                            <span key={f} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{f}</span>
                          ))}
                        </div>
                      </div>
                  </div>
                  <div className="p-8 border-t border-gray-100 bg-white sticky bottom-0">
                      <a href={selectedPlan.planData.dealUrl} target="_blank" rel="noreferrer" className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                          Go to deal <ExternalLink className="w-5 h-5" />
                      </a>
                  </div>
              </div>
          </div>
      )}

      <div className="mt-16 text-center border-t border-gray-100 pt-10">
            <button onClick={onReset} className="text-gray-400 text-sm font-bold hover:text-brand-orange transition-colors flex items-center gap-2 mx-auto uppercase tracking-widest">
              <RefreshCw className="w-4 h-4" />
              Start New Analysis
            </button>
      </div>
    </div>
  );
};

export default PlanResults;
