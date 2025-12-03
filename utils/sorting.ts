
import { PlanRecommendation, PlanFiltersState, PriceFilter, DataFilter, ContractFilter, RoamingFilter, NetworkFilter, SpecialFeatureKey } from '../types';

export type SortOption = 'Recommended' | 'Price' | 'Most Data' | 'Best EU Roaming' | 'Best Budget Fit' | 'Best Coverage';

// --- Filtering Helpers ---

const matchesPriceFilter = (plan: PlanRecommendation, filter: PriceFilter): boolean => {
    const price = plan.monthlyCost;
    switch (filter) {
        case "Any": return true;
        case "£5-£10": return price >= 5 && price <= 10;
        case "£10-£15": return price > 10 && price <= 15;
        case "£15-£20": return price > 15 && price <= 20;
        case "£20-£30": return price > 20 && price <= 30;
        case "£30+": return price > 30;
        default: return true;
    }
};

const matchesDataFilter = (plan: PlanRecommendation, filter: DataFilter): boolean => {
    const p = plan.planData;
    switch (filter) {
        case "Any": return true;
        case "Light (<15GB)": return p.dataAllowanceGB !== null && p.dataAllowanceGB < 15;
        case "Moderate (15-50GB)": return p.dataAllowanceGB !== null && p.dataAllowanceGB >= 15 && p.dataAllowanceGB < 50;
        case "Heavy (50-100GB)": return p.dataAllowanceGB !== null && p.dataAllowanceGB >= 50 && p.dataAllowanceGB <= 100;
        case "Unlimited": return p.dataAllowanceGB === null || (p.dataAllowanceGB || 0) > 100;
        default: return true;
    }
};

const matchesContractFilter = (plan: PlanRecommendation, filter: ContractFilter): boolean => {
    const m = plan.planData.contractLengthMonths;
    switch (filter) {
        case "Any": return true;
        case "1 month rolling": return m === 1;
        case "12 months": return m === 12;
        case "24 months": return m === 24;
        default: return true;
    }
};

const matchesRoamingFilter = (plan: PlanRecommendation, filter: RoamingFilter): boolean => {
    const r = plan.planData.roamingType;
    switch (filter) {
        case "Any": return true;
        case "UK only": return r === 'uk-only';
        case "EU included": return r === 'eu' || r === 'global';
        case "Global included": return r === 'global';
        default: return true;
    }
};

const matchesNetworkFilter = (plan: PlanRecommendation, filter: NetworkFilter): boolean => {
    const n = plan.planData.network;
    switch (filter) {
        case "Any": return true;
        case "Vodafone": return n === 'Vodafone';
        case "O2": return n === 'O2';
        case "Three": return n === 'Three';
        case "EE": return n === 'EE';
        default: return true;
    }
};

const matchesSpecialFeatures = (plan: PlanRecommendation, features: SpecialFeatureKey[]): boolean => {
    if (features.length === 0) return true;
    const pd = plan.planData;
    
    return features.every(feature => {
        switch (feature) {
            case "No credit check": return pd.keyPerks.includes("No credit check");
            case "Data rollover": return pd.keyPerks.includes("Data Rollover");
            case "Free EU roaming": return pd.euRoamingIncluded;
            case "5G included": return pd.includes5G;
            case "Hotspot allowed": return pd.hotspotPolicy !== 'not-allowed';
            default: return true;
        }
    });
};

const applyFilters = (plans: PlanRecommendation[], filters: PlanFiltersState): PlanRecommendation[] => {
    return plans.filter(plan => {
        return (
            matchesPriceFilter(plan, filters.price) &&
            matchesDataFilter(plan, filters.data) &&
            matchesContractFilter(plan, filters.contract) &&
            matchesRoamingFilter(plan, filters.roaming) &&
            matchesNetworkFilter(plan, filters.network) &&
            matchesSpecialFeatures(plan, filters.specialFeatures)
        );
    });
};

// --- Main Sorting Function ---

interface SortResult {
    sortedPlans: PlanRecommendation[];
    isRelaxed: boolean;
    emptyState: boolean;
}

export const getSortedPlans = (
    enrichedPlans: PlanRecommendation[],
    activeTab: SortOption,
    filters: PlanFiltersState
): SortResult => {
    
    // 1. Strict Filtering
    let result = applyFilters(enrichedPlans, filters);
    let isRelaxed = false;

    // 2. Relax Logic if Empty
    if (result.length === 0) {
        // Try relaxing special features first
        if (filters.specialFeatures.length > 0) {
             const relaxedFilters = { ...filters, specialFeatures: [] };
             result = applyFilters(enrichedPlans, relaxedFilters);
             if (result.length > 0) isRelaxed = true;
        }
        // Then try relaxing network
        if (result.length === 0 && filters.network !== 'Any') {
             const relaxedFilters = { ...filters, specialFeatures: [], network: 'Any' as const };
             result = applyFilters(enrichedPlans, relaxedFilters);
             if (result.length > 0) isRelaxed = true;
        }
        // Finally try relaxing contract
        if (result.length === 0 && filters.contract !== 'Any') {
             const relaxedFilters = { ...filters, specialFeatures: [], network: 'Any' as const, contract: 'Any' as const };
             result = applyFilters(enrichedPlans, relaxedFilters);
             if (result.length > 0) isRelaxed = true;
        }
    }

    if (result.length === 0) {
        return { sortedPlans: [], isRelaxed: false, emptyState: true };
    }

    // 3. Tab-Specific Sorting
    const sorted = [...result];

    switch (activeTab) {
        case 'Recommended':
            // Primary: Match Score DESC
            // Secondary: Price ASC
            sorted.sort((a, b) => (b.calculatedPuffinScore - a.calculatedPuffinScore) || (a.monthlyCost - b.monthlyCost));
            break;

        case 'Price':
            // Primary: Price ASC
            // Secondary: Match Score DESC
            // Rule: Down-rank very poor matches (<40)
            const goodMatches = sorted.filter(p => p.calculatedPuffinScore >= 40);
            const weakMatches = sorted.filter(p => p.calculatedPuffinScore < 40);
            
            const sortByPriceThenScore = (x: PlanRecommendation, y: PlanRecommendation) => 
                (x.monthlyCost - y.monthlyCost) || (y.calculatedPuffinScore - x.calculatedPuffinScore);
            
            goodMatches.sort(sortByPriceThenScore);
            weakMatches.sort(sortByPriceThenScore);
            
            return { sortedPlans: [...goodMatches, ...weakMatches], isRelaxed, emptyState: false };

        case 'Most Data':
            // Rule: Do not include tiny data plans (<5GB) unless that's all we have
            const decentData = sorted.filter(p => p.dataAllowanceGB === -1 || p.dataAllowanceGB >= 5);
            const dataSet = decentData.length > 0 ? decentData : sorted;
            
            // Primary: Data DESC (Unlimited top)
            // Secondary: Price ASC
            // Tertiary: Match Score DESC
            dataSet.sort((a, b) => {
                const aData = a.dataAllowanceGB === -1 ? 999999 : a.dataAllowanceGB;
                const bData = b.dataAllowanceGB === -1 ? 999999 : b.dataAllowanceGB;
                if (bData !== aData) return bData - aData;
                if (a.monthlyCost !== b.monthlyCost) return a.monthlyCost - b.monthlyCost;
                return b.calculatedPuffinScore - a.calculatedPuffinScore;
            });
            return { sortedPlans: dataSet, isRelaxed, emptyState: false };

        case 'Best Coverage':
            // Rule: Boost EE/Vodafone slightly for sorting
            const getReliabilitySortScore = (p: PlanRecommendation) => {
                let score = p.scoreBreakdown.reliabilityFit;
                if (p.network === 'EE' || p.network === 'Vodafone') score += 10; 
                return score;
            };
            
            // Primary: Reliability Fit (Boosted) DESC
            // Secondary: Match Score DESC
            // Tertiary: Price ASC
            sorted.sort((a, b) => {
                const rDiff = getReliabilitySortScore(b) - getReliabilitySortScore(a);
                if (rDiff !== 0) return rDiff;
                if (b.calculatedPuffinScore !== a.calculatedPuffinScore) return b.calculatedPuffinScore - a.calculatedPuffinScore;
                return a.monthlyCost - b.monthlyCost;
            });
            break;

        case 'Best EU Roaming':
             // Rule: Only include plans with EU included/free. Fallback if empty.
             const roamingSet = sorted.filter(p => p.euRoaming.toLowerCase().includes('included') || p.euRoaming.toLowerCase().includes('free'));
             const finalRoamingSet = roamingSet.length > 0 ? roamingSet : sorted;
             
             // Primary: Roaming Fit DESC
             // Secondary: Match Score DESC
             // Tertiary: Price ASC
             finalRoamingSet.sort((a, b) => {
                 if (b.scoreBreakdown.roamingFit !== a.scoreBreakdown.roamingFit) return b.scoreBreakdown.roamingFit - a.scoreBreakdown.roamingFit;
                 if (b.calculatedPuffinScore !== a.calculatedPuffinScore) return b.calculatedPuffinScore - a.calculatedPuffinScore;
                 return a.monthlyCost - b.monthlyCost;
             });
             return { sortedPlans: finalRoamingSet, isRelaxed, emptyState: false };

        case 'Best Budget Fit':
             // Fallback for existing legacy tabs
             sorted.sort((a, b) => b.scoreBreakdown.budgetFit - a.scoreBreakdown.budgetFit);
             break;
             
        default:
             sorted.sort((a, b) => b.calculatedPuffinScore - a.calculatedPuffinScore);
    }

    return { sortedPlans: sorted, isRelaxed, emptyState: false };
};
