
import { Plan, SimPlan } from '../types';

const SHEET_ID = '1vTbSjllq20IU6BGwrbUMpSrxFVK5WHVRABBL2Tpps70';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

/**
 * Normalises the roaming type string from the sheet to match app internal keys.
 * Updated return type to match SimPlan roamingType literals.
 */
const normalizeRoamingType = (raw: string): 'uk-only' | 'eu' | 'global' => {
  const val = (raw || '').toLowerCase().trim();
  if (val.includes('global') || val.includes('world')) return 'global';
  if (val.includes('eu')) return 'eu';
  return 'uk-only';
};

/**
 * Fetches plans from the Google Sheet GVIZ API.
 * Maps the raw sheet rows to the internal Plan model.
 */
export const fetchSimPlans = async (): Promise<Plan[]> => {
  try {
    const response = await fetch(GVIZ_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch plans: ${response.statusText}`);
    }
    const text = await response.text();
    
    // Gviz returns JSON wrapped in a function call like:
    // /*O_o*/ google.visualization.Query.setResponse({...});
    // We need to extract the JSON object.
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const json = JSON.parse(jsonString);
    
    const rows = json.table.rows;
    const plans: Plan[] = [];

    rows.forEach((row: any) => {
        const c = row.c;
        if (!c || c.length < 15) return;

        // Helper to get value safely
        const getVal = (idx: number, type: 'string' | 'number' | 'boolean') => {
            const cell = c[idx];
            if (!cell) return null;
            if (type === 'boolean') {
                // Handle boolean from sheet which might be true/false or "TRUE"/"FALSE" string
                if (typeof cell.v === 'boolean') return cell.v;
                if (typeof cell.v === 'string') return cell.v.toUpperCase() === 'TRUE';
                return false;
            }
            return cell.v;
        };

        // Skip rows without ID
        const idRaw = getVal(0, 'number');
        if (idRaw === null) return;

        const simPlan: SimPlan = {
            id: Number(idRaw),
            providerName: String(getVal(1, 'string') || ''),
            planName: String(getVal(2, 'string') || ''),
            network: String(getVal(3, 'string') || ''),
            pricePerMonth: Number(getVal(4, 'number') || 0),
            dataGb: Number(getVal(5, 'number') || 0),
            isUnlimitedData: Boolean(getVal(6, 'boolean')),
            contractLengthMonths: Number(getVal(7, 'number') || 1),
            isRolling: Boolean(getVal(8, 'boolean')),
            // Apply normalization to the roaming field from the sheet
            roamingType: normalizeRoamingType(String(getVal(9, 'string') || 'UK only')),
            hotspotAllowed: Boolean(getVal(10, 'boolean')),
            noCreditCheck: Boolean(getVal(11, 'boolean')),
            hasDataRollover: Boolean(getVal(12, 'boolean')),
            notes: String(getVal(13, 'string') || ''),
            rating: Number(getVal(14, 'number') || 0),
            affiliateUrl: String(getVal(15, 'string') || ''),
            // Read EU Roaming Cap from column Q (index 16)
            euRoamingCapGb: getVal(16, 'number') as number | null
        };

        plans.push(mapSimPlanToPlan(simPlan));
    });

    return plans;
  } catch (error) {
    console.error("Error fetching plans from sheet:", error);
    throw error;
  }
};

// Re-export as fetchPlans for compatibility if needed, but prefer fetchSimPlans
export const fetchPlans = fetchSimPlans;

/**
 * Mapper: Converts the raw Sheet row (SimPlan) into the App's core Plan model.
 */
const mapSimPlanToPlan = (sim: SimPlan): Plan => {
    // 1. Map Roaming using normalized values
    let roamingType: 'uk-only' | 'eu' | 'global' = 'uk-only';
    let euRoamingIncluded = false;
    let globalRoamingIncluded = false;
    
    const rType = sim.roamingType;

    // Comparisons now valid as rType matches 'uk-only' | 'eu' | 'global'
    if (rType === 'eu') {
        roamingType = 'eu';
        euRoamingIncluded = true;
    } else if (rType === 'global') {
        roamingType = 'global';
        euRoamingIncluded = true;
        globalRoamingIncluded = true;
    } else {
        roamingType = 'uk-only';
    }

    // 2. Map Perks & Features
    const keyPerks = [];
    if (sim.noCreditCheck) keyPerks.push("No credit check");
    if (sim.hasDataRollover) keyPerks.push("Data Rollover");

    // 3. Map Data Category
    let dataCategory: 'light' | 'moderate' | 'heavy' | 'unlimited' = 'moderate';
    if (sim.isUnlimitedData) dataCategory = 'unlimited';
    else if (sim.dataGb < 15) dataCategory = 'light';
    else if (sim.dataGb < 50) dataCategory = 'moderate';
    else dataCategory = 'heavy';

    // 4. Map Reliability (Sheet rating is 0-100, App uses 1-5 stars)
    let rawRating = sim.rating;
    let reliabilityRating: number;

    // Fallback logic for empty or null ratings
    if (!rawRating || rawRating === 0) {
        rawRating = 70;
        reliabilityRating = 4;
    } else {
        // Explicit mapping from raw 0-100 to 1-5 stars
        if (rawRating < 40) reliabilityRating = 1;
        else if (rawRating < 60) reliabilityRating = 2;
        else if (rawRating < 75) reliabilityRating = 3;
        else if (rawRating < 90) reliabilityRating = 4;
        else reliabilityRating = 5;
    }

    // Use affiliateUrl from sheet, fallback to Google search placeholder
    const finalDealUrl = (sim.affiliateUrl && sim.affiliateUrl.trim().length > 0)
        ? sim.affiliateUrl
        : `https://www.google.com/search?q=${encodeURIComponent(sim.providerName + " " + sim.planName + " deal")}`;

    return {
        id: sim.id.toString(), // Convert numeric ID to string
        provider: sim.providerName,
        network: sim.network,
        planName: sim.planName,
        monthlyPrice: sim.pricePerMonth,
        contractLengthMonths: sim.contractLengthMonths,
        contractType: sim.isRolling ? 'rolling' : 'fixed',
        
        // If unlimited, dataAllowanceGB is null in our app model
        dataAllowanceGB: sim.isUnlimitedData ? null : sim.dataGb,
        dataCategory,
        fairUseDataGB: null, // V1 sheet doesn't specify FUP
        
        roamingType,
        euRoamingIncluded,
        euRoamingCapGB: sim.euRoamingCapGb, // Map the new column value
        globalRoamingIncluded,
        
        // If allowed, we assume unlimited or standard allowance for MVP
        hotspotPolicy: sim.hotspotAllowed ? 'unlimited' : 'not-allowed',
        hotspotCapGB: null,
        
        speedCapMbps: null, // V1 sheet doesn't track speed caps
        includes5G: true,   // Assumption for modern plans in MVP
        
        reliabilityRating: reliabilityRating,
        rawRating: rawRating,
        customerServiceRating: 3, // Default, not in sheet
        
        keyPerks,
        highlightNote: sim.notes || undefined, // Mapped specifically
        badges: [], // Populated dynamically by UI/Scoring
        
        dealUrl: finalDealUrl,
        
        affiliateCode: null,
        lastUpdated: new Date().toISOString().split('T')[0]
    };
};
