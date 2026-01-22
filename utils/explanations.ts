
import { Plan, UserInput } from '../types';
import { MatchLevel } from './matchLabel';

export interface PlanExplanation {
  primaryText: string;
  tradeoffText: string | null;
  bulletPoints: string[];
}

export interface TopAnalysisParams {
    userProfile?: string;
    priorities: string[];
    budget?: number;
    activeTab: string;
    topPlan?: Plan;
    scoreBand: MatchLevel;
}

export interface TopAnalysisResult {
    headline: string;
    body: string;
}

/**
 * Generates plan-specific scanable content based on factual traits.
 * Structure: Headline (max 12 words), Trade-off (max 10 words), 3 Bullets.
 */
export const buildPlanExplanation = (plan: Plan, userInput: UserInput): PlanExplanation => {
  const { lifestyleId, priority = [] } = userInput;
  
  // --- 1. Primary Headline (Plan-specific traits, Max 12 words) ---
  let primaryText = "";

  const isCheap = plan.monthlyPrice < 10;
  const isRolling = plan.contractType === 'rolling';
  const isUnlimited = plan.dataAllowanceGB === null;
  const hasGlobal = plan.roamingType === 'global';
  const hasGoodEU = plan.euRoamingIncluded && (plan.euRoamingCapGB === null || plan.euRoamingCapGB >= 10);

  if (isCheap && isRolling && isUnlimited) {
      primaryText = `Unlimited data for £${plan.monthlyPrice} with no long-term contract commitment.`;
  } else if (isCheap && isRolling) {
      primaryText = `Flexible £${plan.monthlyPrice} plan with a 30-day rolling contract term.`;
  } else if (isCheap) {
      primaryText = `Low-cost £${plan.monthlyPrice} monthly plan with a fixed contract term.`;
  } else if (isUnlimited) {
      primaryText = `Truly unlimited data allowance with no domestic usage caps.`;
  } else if (hasGlobal) {
      primaryText = `Plan includes inclusive roaming in global destinations beyond Europe.`;
  } else if (hasGoodEU) {
      primaryText = `Inclusive EU roaming with a generous fair-use data allowance.`;
  } else if (plan.dataAllowanceGB && plan.dataAllowanceGB >= 50) {
      primaryText = `${plan.dataAllowanceGB}GB data allowance for high-volume mobile internet usage.`;
  } else if (isRolling) {
      primaryText = `Contract-free 30-day plan allowing for immediate provider switching.`;
  } else {
      primaryText = `${plan.dataAllowanceGB}GB data plan provided on the ${plan.network} network.`;
  }

  // --- 2. Trade-off Logic (Optional, max 10 words) ---
  let tradeoffText: string | null = null;
  const userWantsTravel = lifestyleId === 'travel' || priority.includes('I travel in Europe often');
  const userWantsFlex = priority.includes('I want no contract commitment');

  if (userWantsTravel && !plan.euRoamingIncluded) {
      tradeoffText = "EU roaming incurs additional daily network charges.";
  } else if (userWantsFlex && plan.contractLengthMonths > 1) {
      tradeoffText = `Requires a ${plan.contractLengthMonths}-month commitment for this monthly rate.`;
  } else if (plan.speedCapMbps && plan.speedCapMbps < 100) {
      tradeoffText = `Maximum download speeds are limited to ${plan.speedCapMbps}Mbps.`;
  } else if (plan.euRoamingCapGB && plan.euRoamingCapGB < 10 && userWantsTravel) {
      tradeoffText = `EU roaming data restricted to ${plan.euRoamingCapGB}GB monthly.`;
  }

  // --- 3. Bullet Points (Factual attributes, max 3) ---
  const bullets: string[] = [];
  
  // Data bullet
  if (isUnlimited) bullets.push("Truly unlimited UK data");
  else bullets.push(`${plan.dataAllowanceGB}GB monthly UK data`);

  // Contract bullet
  if (isRolling) bullets.push("30-day rolling contract");
  else bullets.push(`${plan.contractLengthMonths}-month fixed term`);

  // Key Feature bullet
  if (plan.roamingType === 'global') bullets.push("Global roaming destinations included");
  else if (plan.euRoamingIncluded) {
      const cap = plan.euRoamingCapGB ? ` (${plan.euRoamingCapGB}GB cap)` : "";
      bullets.push(`Inclusive EU roaming${cap}`);
  } else if (plan.keyPerks.includes("No credit check")) bullets.push("No credit check required");
  else bullets.push(`Uses ${plan.network} network coverage`);

  return {
    primaryText,
    tradeoffText,
    bulletPoints: bullets.slice(0, 3)
  };
};

/**
 * Condenses the top results summary for immediate scanability.
 */
export const buildTopAnalysisCopy = (params: TopAnalysisParams): TopAnalysisResult => {
    const { priorities, budget, activeTab, scoreBand } = params;
    
    let headline = "Ranked matches for your profile";
    if (params.topPlan && params.topPlan.monthlyPrice) { 
        headline = "Closest matches based on your inputs";
    }

    const sentences: string[] = [];

    sentences.push("We have ranked these plans by overall value based on your usage profile.");

    if (budget) {
        sentences.push(`Prioritising options close to your £${budget} target.`);
    } else if (priorities.includes('I want no contract commitment')) {
        sentences.push("Prioritising 30-day contracts for maximum flexibility.");
    }

    sentences.push("Lower-ranked plans were excluded due to higher costs or longer commitments.");

    if (activeTab === 'Price') {
        sentences.push("Currently sorted by lowest monthly cost.");
    }

    if (scoreBand === 'cautious') {
        sentences.push("No perfect match found; showing closest available market options.");
    }

    return {
        headline,
        body: sentences.join(" ")
    };
};
