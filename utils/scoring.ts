
import { Plan, UserInput, ScoreBreakdown } from '../types';

export interface ScoreResult {
  total: number;
  subScores: ScoreBreakdown;
  debug?: any;
}

// --- 2. BASE WEIGHTS PER PROFILE ---
// Sum should ideally be close to 100, but we normalize later anyway.
const BASE_WEIGHTS: Record<string, Record<string, number>> = {
  everyday:     { price: 20, data: 20, roaming: 15, reliability: 25, contract: 15, features: 5 },
  budget:       { price: 40, data: 15, roaming: 10, reliability: 20, contract: 10, features: 5 },
  power:        { price: 20, data: 40, roaming: 10, reliability: 20, contract: 5,  features: 5 },
  remote:       { price: 15, data: 25, roaming: 10, reliability: 30, contract: 10, features: 10 },
  travel:       { price: 15, data: 15, roaming: 35, reliability: 20, contract: 10, features: 5 },
  streamer:     { price: 20, data: 40, roaming: 5,  reliability: 20, contract: 10, features: 5 },
  social:       { price: 25, data: 30, roaming: 10, reliability: 20, contract: 10, features: 5 },
  other:        { price: 25, data: 25, roaming: 15, reliability: 20, contract: 10, features: 5 }
};

const DEFAULT_WEIGHTS = BASE_WEIGHTS.everyday;

// Helper to safely clamp values
const clamp = (val: number, min = 0, max = 100) => Math.max(min, Math.min(max, val));

export const computeMatchScore = (plan: Plan, userInput: UserInput): ScoreResult => {
  const { lifestyleId, priority = [], budget } = userInput;
  
  // 1. Determine Base Weights
  const profileKey = lifestyleId && BASE_WEIGHTS[lifestyleId] ? lifestyleId : 'everyday';
  const weights = { ...BASE_WEIGHTS[profileKey] };

  // 2. PRIORITY-BASED WEIGHT ADJUSTMENTS
  // Additive modifiers based on user priorities
  if (priority.includes('I want something cheap and simple')) {
    weights.price += 10;
    weights.data -= 5;
    weights.roaming -= 5;
  }
  if (priority.includes('I hate running out of data') || priority.includes('I want unlimited so I never think about it')) {
    weights.data += 10;
    weights.price -= 5;
    weights.contract -= 5;
  }
  if (priority.includes('I want the best coverage')) {
    weights.reliability += 10;
    weights.price -= 5;
  }
  if (priority.includes('I want no contract commitment')) {
    weights.contract += 10;
  }
  if (priority.includes('I hotspot my laptop')) {
    weights.features += 10;
    weights.data += 5;
  }
  if (priority.includes('I travel in Europe often')) {
    weights.roaming += 10;
  }

  // Normalize weights to ensure they sum to ~100 for consistent total scoring
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  // (We'll divide by totalWeight at the end)

  // 3. SUB-SCORE LOGIC
  
  // -- PriceFit --
  let priceFit = 50;
  if (budget && budget > 0) {
    if (plan.monthlyPrice <= budget) {
      priceFit = 100;
      // Bonus for being significantly under budget
      if (plan.monthlyPrice <= budget * 0.75) priceFit = 110; 
    } else {
      const overage = plan.monthlyPrice - budget;
      const overagePercent = overage / budget;
      if (overagePercent <= 0.25) {
         // Linear decay 100 -> 60
         priceFit = 100 - (overagePercent * 4 * 40); 
      } else if (overagePercent <= 0.5) {
         // Linear decay 60 -> 40
         priceFit = 60 - ((overagePercent - 0.25) * 4 * 20);
      } else {
         priceFit = 30;
      }
    }
  } else {
    // Relative scoring if no budget
    if (plan.monthlyPrice <= 8) priceFit = 100;
    else if (plan.monthlyPrice <= 15) priceFit = 85;
    else if (plan.monthlyPrice <= 25) priceFit = 65;
    else if (plan.monthlyPrice <= 35) priceFit = 45;
    else priceFit = 25;
  }
  // Budget Focused Penalty for high absolute price
  if (profileKey === 'budget' && plan.monthlyPrice > 25) {
      priceFit -= 20;
  }

  // -- DataFit --
  let dataFit = 50;
  if (plan.dataAllowanceGB === null) dataFit = 100;
  else if (plan.dataAllowanceGB >= 100) dataFit = 90;
  else if (plan.dataAllowanceGB >= 50) dataFit = 80;
  else if (plan.dataAllowanceGB >= 20) dataFit = 70;
  else if (plan.dataAllowanceGB >= 10) dataFit = 60;
  else dataFit = 40;

  // Cap data score if user needs unlimited/heavy but plan is small
  const needsHeavy = priority.includes('I hate running out of data') || ['power', 'streamer'].includes(profileKey);
  if (needsHeavy && (plan.dataAllowanceGB !== null && plan.dataAllowanceGB < 50)) {
      dataFit = Math.min(dataFit, 50);
  }

  // -- RoamingFit --
  let roamingFit = 40;
  if (plan.globalRoamingIncluded) roamingFit = 100;
  else if (plan.euRoamingIncluded) {
     if (plan.euRoamingCapGB === null || plan.euRoamingCapGB >= 20) roamingFit = 90;
     else roamingFit = 75; // Included but capped
  } else {
     roamingFit = 30; // Paid or UK only
  }
  
  // Severe penalty for travelers if no roaming
  const needsRoaming = priority.includes('I travel in Europe often') || profileKey === 'travel';
  if (needsRoaming && !plan.euRoamingIncluded) {
      roamingFit = 20;
  }

  // -- ReliabilityFit --
  // Base map: 1->20, 2->40, 3->60, 4->80, 5->100
  let reliabilityFit = plan.reliabilityRating * 20;
  if (priority.includes('I want the best coverage') && plan.reliabilityRating < 4) {
      reliabilityFit -= 20;
  }

  // -- ContractFit --
  let contractFit = 50;
  if (plan.contractLengthMonths === 1) contractFit = 100;
  else if (plan.contractLengthMonths === 12) contractFit = 70;
  else if (plan.contractLengthMonths === 24) contractFit = 40;

  // Penalize long contracts for certain profiles
  if ((profileKey === 'budget' || priority.includes('I want no contract commitment')) && plan.contractLengthMonths >= 24) {
      contractFit -= 30;
  }

  // -- FeaturesFit (Extras) --
  // Start with Hotspot logic
  let featuresFit = 50;
  if (plan.hotspotPolicy === 'unlimited') featuresFit = 100;
  else if (plan.hotspotPolicy === 'limited') featuresFit = 80;
  else if (plan.hotspotPolicy === 'not-allowed') featuresFit = 30;

  // Boost for smart features / perks
  if (plan.includes5G) featuresFit += 5;
  if (plan.keyPerks.includes('Data Rollover')) featuresFit += 10;
  if (plan.keyPerks.includes('No credit check')) featuresFit += 5;
  
  // Boost if hotspot is a priority
  if (priority.includes('I hotspot my laptop') || profileKey === 'remote') {
      if (plan.hotspotPolicy === 'not-allowed') featuresFit = 10; // Kill score
      else featuresFit += 10;
  }

  // Clamping all sub-scores
  priceFit = clamp(priceFit);
  dataFit = clamp(dataFit);
  roamingFit = clamp(roamingFit);
  reliabilityFit = clamp(reliabilityFit);
  contractFit = clamp(contractFit);
  featuresFit = clamp(featuresFit);

  // 4. CALCULATE TOTAL WEIGHTED SCORE
  let weightedSum = 
    (priceFit * weights.price) +
    (dataFit * weights.data) +
    (roamingFit * weights.roaming) +
    (reliabilityFit * weights.reliability) +
    (contractFit * weights.contract) +
    (featuresFit * weights.features);
    
  let total = weightedSum / totalWeight;

  // 5. GUARDRAILS (Hard Caps)

  // Guardrail: Way over budget
  if (budget && plan.monthlyPrice > budget * 2) {
      total = Math.min(total, 55);
  }

  // Guardrail: Critical Roaming Missing
  if (needsRoaming && !plan.euRoamingIncluded) {
      total = Math.min(total, 45);
  }
  
  // Guardrail: Critical Hotspot Missing
  if (profileKey === 'remote' && plan.hotspotPolicy === 'not-allowed') {
      total = Math.min(total, 40);
  }

  // Final noise/polish (optional, usually to break ties)
  // total += (plan.id.charCodeAt(0) % 3); 

  total = Math.round(clamp(total));

  return {
    total,
    subScores: {
      dataFit,
      priceFit,
      roamingFit,
      reliabilityFit,
      contractFit,
      featuresFit,
      coverageFit: reliabilityFit, // Alias
      hotspotFit: featuresFit, // Alias
      budgetFit: priceFit // Alias for sorting compatibility
    },
    debug: {
      weights,
      rawScores: { priceFit, dataFit, roamingFit, reliabilityFit, contractFit, featuresFit },
      profileKey
    }
  };
};
