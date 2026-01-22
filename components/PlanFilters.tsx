
import React from 'react';
import { 
  PlanFiltersState, 
  ContractFilter, 
  NetworkFilter, 
  SpecialFeatureKey 
} from '../types';
import { X, Check, Lightbulb } from 'lucide-react';

interface PlanFiltersProps {
  filters: PlanFiltersState;
  onChangeFilters: (filters: PlanFiltersState) => void;
  onClearFilters: () => void;
  appliedCount: number;
}

const PlanFilters: React.FC<PlanFiltersProps> = ({ filters, onChangeFilters, onClearFilters, appliedCount }) => {
  
  const handleDropdownChange = (key: keyof PlanFiltersState, value: string) => {
    onChangeFilters({
      ...filters,
      [key]: value
    });
  };

  const toggleSpecialFeature = (feature: SpecialFeatureKey) => {
    const current = filters.specialFeatures;
    const isSelected = current.includes(feature);
    let updated: SpecialFeatureKey[];
    
    if (isSelected) {
      updated = current.filter(f => f !== feature);
    } else {
      updated = [...current, feature];
    }
    
    onChangeFilters({
      ...filters,
      specialFeatures: updated
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Contract */}
        <div>
           <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-widest">Contract length</label>
           <select
             value={filters.contract}
             onChange={(e) => handleDropdownChange('contract', e.target.value)}
             className="w-full text-xs font-bold p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-shadow"
           >
             <option value="Any">Any Duration</option>
             <option value="1 month rolling">1 month rolling</option>
             <option value="12 months">12 months</option>
             <option value="24 months">24 months</option>
           </select>
        </div>

        {/* Network */}
        <div>
           <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-widest">Preferred Network</label>
           <select
             value={filters.network}
             onChange={(e) => handleDropdownChange('network', e.target.value)}
             className="w-full text-xs font-bold p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-shadow"
           >
             <option value="Any">Any Network</option>
             <option value="Vodafone">Vodafone</option>
             <option value="O2">O2</option>
             <option value="Three">Three</option>
             <option value="EE">EE</option>
           </select>
        </div>
      </div>

      {/* Special Features */}
      <div>
         <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">Perks & Technicals</label>
         <div className="flex flex-wrap gap-2">
            {[
              "No credit check",
              "Data rollover",
              "5G included",
              "Hotspot allowed"
            ].map((feature) => {
               const key = feature as SpecialFeatureKey;
               const isSelected = filters.specialFeatures.includes(key);
               return (
                  <button
                    key={key}
                    onClick={() => toggleSpecialFeature(key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                       isSelected 
                       ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                       : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                     {isSelected && <Check className="w-3 h-3" strokeWidth={4} />}
                     {feature}
                  </button>
               );
            })}
         </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-4 border border-gray-100">
         <Lightbulb className="w-4 h-4 flex-shrink-0 text-brand-orange" />
         <span>Refining by specific networks or perks helps Puffin narrow down the best technical fits.</span>
      </div>
    </div>
  );
};

export default PlanFilters;
