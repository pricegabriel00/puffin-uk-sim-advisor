import React from 'react';
import { 
  PlanFiltersState, 
  PriceFilter, 
  DataFilter, 
  ContractFilter, 
  RoamingFilter, 
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 sm:p-5 mt-2 mb-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Filter Results</h3>
          {appliedCount > 0 && (
             <span className="bg-brand-orange text-white text-[10px] px-1.5 py-0.5 rounded-full">
               {appliedCount} active
             </span>
          )}
        </div>
        {appliedCount > 0 && (
           <button 
             onClick={onClearFilters}
             className="text-xs font-medium text-brand-orange hover:text-orange-700 hover:underline flex items-center gap-1 transition-colors"
           >
             <X className="w-3 h-3" />
             Clear all
           </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Price */}
        <div>
           <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Price per month</label>
           <select
             value={filters.price}
             onChange={(e) => handleDropdownChange('price', e.target.value)}
             className="w-full text-sm p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-shadow"
           >
             <option value="Any">Any</option>
             <option value="£5-£10">£5 – £10</option>
             <option value="£10-£15">£10 – £15</option>
             <option value="£15-£20">£15 – £20</option>
             <option value="£20-£30">£20 – £30</option>
             <option value="£30+">£30+</option>
           </select>
        </div>

        {/* Data */}
        <div>
           <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Data needs</label>
           <select
             value={filters.data}
             onChange={(e) => handleDropdownChange('data', e.target.value)}
             className="w-full text-sm p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-shadow"
           >
             <option value="Any">Any</option>
             <option value="Light (<15GB)">Light (&lt;15GB)</option>
             <option value="Moderate (15-50GB)">Moderate (15-50GB)</option>
             <option value="Heavy (50-100GB)">Heavy (50-100GB)</option>
             <option value="Unlimited">Unlimited</option>
           </select>
        </div>

        {/* Contract */}
        <div>
           <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Contract length</label>
           <select
             value={filters.contract}
             onChange={(e) => handleDropdownChange('contract', e.target.value)}
             className="w-full text-sm p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-shadow"
           >
             <option value="Any">Any</option>
             <option value="1 month rolling">1 month rolling</option>
             <option value="12 months">12 months</option>
             <option value="24 months">24 months</option>
           </select>
        </div>

        {/* Roaming */}
        <div>
           <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Roaming</label>
           <select
             value={filters.roaming}
             onChange={(e) => handleDropdownChange('roaming', e.target.value)}
             className="w-full text-sm p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-shadow"
           >
             <option value="Any">Any</option>
             <option value="UK only">UK only</option>
             <option value="EU included">EU included</option>
             <option value="Global included">Global included</option>
           </select>
        </div>

        {/* Network */}
        <div>
           <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Network</label>
           <select
             value={filters.network}
             onChange={(e) => handleDropdownChange('network', e.target.value)}
             className="w-full text-sm p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-shadow"
           >
             <option value="Any">Any</option>
             <option value="Vodafone">Vodafone</option>
             <option value="O2">O2</option>
             <option value="Three">Three</option>
             <option value="EE">EE</option>
           </select>
        </div>
      </div>

      {/* Special Features */}
      <div className="mt-5 pt-4 border-t border-gray-100">
         <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Special Features</label>
         <div className="flex flex-wrap gap-2">
            {[
              "No credit check",
              "Data rollover",
              "Free EU roaming",
              "5G included",
              "Hotspot allowed"
            ].map((feature) => {
               const key = feature as SpecialFeatureKey;
               const isSelected = filters.specialFeatures.includes(key);
               return (
                  <button
                    key={key}
                    onClick={() => toggleSpecialFeature(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                       isSelected 
                       ? 'bg-orange-50 text-brand-orange border-brand-orange' 
                       : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                     {isSelected && <Check className="w-3 h-3" />}
                     {feature}
                  </button>
               );
            })}
         </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
         <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 text-brand-orange" />
         <span>Tip: Start with one or two filters — we’ll automatically rank the rest for you.</span>
      </div>
    </div>
  );
};

export default PlanFilters;