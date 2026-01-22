
import { PlanRecommendation, PlanFiltersState, PriceFilter, DataFilter, ContractFilter, RoamingFilter, NetworkFilter, SpecialFeatureKey } from '../types';

export type SortOption = 'Recommended' | 'Price' | 'Most Data';

// --- Filtering Helpers ---

const matchesPriceFilter = (plan: PlanRecommendation, filter: PriceFilter): boolean => {
    const price = plan.monthlyCost;
    switch (filter) {
        case "Any": return true;
        case "Under £10": return price < 10;
        case "Under £15": return price < 15;
        case "Under £20": return price < 20;
        default: return true;
    }
};

const matchesDataFilter = (plan: PlanRecommendation, filter: DataFilter): boolean => {
    const p = plan.planData;
    const gb = p.dataAllowanceGB === null ? 999999 : p.dataAllowanceGB;
    switch (filter) {
        case "Any": return true;
        case "20GB+": return gb >= 20;
        case "50GB+": return gb >= 50;
        case "100GB+": return gb >= 100;
        case "Unlimited": return p.dataAllowanceGB === null;
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
    switch (filter) {
        case "Any": return true;
        case "Required": return plan.planData.euRoamingIncluded;
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

    if (result.length === 0) {
        return { sortedPlans: [], isRelaxed: false, emptyState: true };
    }

    // 2. Sorting
    const sorted = [...result];

    switch (activeTab) {
        case 'Recommended':
            sorted.sort((a, b) => (b.calculatedPuffinScore - a.calculatedPuffinScore) || (a.monthlyCost - b.monthlyCost));
            break;

        case 'Price':
            sorted.sort((a, b) => (a.monthlyCost - b.monthlyCost) || (b.calculatedPuffinScore - a.calculatedPuffinScore));
            break;

        case 'Most Data':
            sorted.sort((a, b) => {
                const aData = a.dataAllowanceGB === -1 ? 999999 : a.dataAllowanceGB;
                const bData = b.dataAllowanceGB === -1 ? 999999 : b.dataAllowanceGB;
                if (bData !== aData) return bData - aData;
                return a.monthlyCost - b.monthlyCost;
            });
            break;
             
        default:
             sorted.sort((a, b) => b.calculatedPuffinScore - a.calculatedPuffinScore);
    }

    return { sortedPlans: sorted, isRelaxed, emptyState: false };
};
