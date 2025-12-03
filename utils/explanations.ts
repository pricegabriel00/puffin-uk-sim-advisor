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

// Map profile IDs to friendly names for sentences
const PROFILE_NAMES: Record<string, string> = {
    budget: "Budget Focused user",
    travel: "Frequent Traveller",
    power: "Power User",
    streamer: "Heavy Streamer",
    remote: "Remote Worker",
    social: "Social Media fan",
    everyday: "Everyday User"
};

export const buildPlanExplanation = (plan: Plan, userInput: UserInput): PlanExplanation => {
  const { lifestyleId, budget, priority = [] } = userInput;
  
  // --- 1. Primary Text Generation ---
  let primaryText = `A solid option running on the ${plan.network} network.`;

  if (lifestyleId === 'budget') {
      if (plan.monthlyPrice <= 10) {
          primaryText = "For a Budget Focused user, this plan keeps monthly costs extremely low without sacrificing essential connectivity.";
      } else {
          primaryText = "While not the cheapest on the market, this offers great value for the specific features included.";
      }
  } else if (lifestyleId === 'travel') {
      if (plan.roamingType !== 'uk-only') {
          primaryText = "As a Frequent Traveller, the inclusive roaming in this plan is a major advantage for your trips.";
      } else {
          primaryText = "This plan offers strong UK specs, though you'll need to pay extra when you travel abroad.";
      }
  } else if (lifestyleId === 'streamer' || lifestyleId === 'power') {
      if (plan.dataAllowanceGB === null || (plan.dataAllowanceGB || 0) > 100) {
          primaryText = "Perfect for heavy usage—this generous data allowance means you can stream and scroll without worry.";
      } else {
          primaryText = "A reliable network choice, though the data cap means you'll need to monitor usage during heavy streaming months.";
      }
  } else if (lifestyleId === 'remote') {
      if (plan.hotspotPolicy !== 'not-allowed') {
          primaryText = "Ideal for Remote Work with hotspotting support, allowing you to get online with your laptop anywhere.";
      } else {
          primaryText = "Good connectivity for your phone, but check the tethering limits if you work from a laptop often.";
      }
  } else if (lifestyleId === 'social') {
       primaryText = "This plan delivers the data and speed you need for social apps like TikTok and Instagram.";
  } else {
       // Everyday / Default
       if (plan.contractLengthMonths === 1) {
           primaryText = "A flexible, no-commitment choice that gives you control to switch whenever you want.";
       } else {
           primaryText = `A balanced, reliable choice on the ${plan.network} network that covers all the basics well.`;
       }
  }

  // --- 2. Trade-off Logic ---
  let tradeoffText: string | null = null;
  
  // Priority-based tradeoffs
  const isBudgetSensitive = lifestyleId === 'budget' || budget !== undefined;
  const needsRoaming = lifestyleId === 'travel' || priority.includes('I travel in Europe often');
  const needsHeavyData = ['streamer', 'power', 'social'].includes(lifestyleId || '') || priority.includes('I hate running out of data');
  const needsFlexibility = priority.includes('I want no contract commitment');

  // Logic: Find the most critical tradeoff with clear templates
  if (needsRoaming && !plan.euRoamingIncluded) {
      tradeoffText = "Tradeoff: Roaming is paid, so it's not ideal for frequent travel.";
  } else if (needsHeavyData && plan.dataAllowanceGB && plan.dataAllowanceGB < 20) {
      tradeoffText = `Tradeoff: ${plan.dataAllowanceGB}GB might be tight for your heavy streaming needs.`;
  } else if (isBudgetSensitive && budget && plan.monthlyPrice > budget + 2) {
      tradeoffText = `Tradeoff: At £${plan.monthlyPrice}, this is a bit above your £${budget} target.`;
  } else if (plan.contractLengthMonths > 1 && (needsFlexibility || lifestyleId === 'budget')) {
      tradeoffText = `Tradeoff: Requires a ${plan.contractLengthMonths}-month commitment, unlike rolling plans.`;
  } else if (plan.network === 'Three' || plan.network === 'Smarty' || plan.network === 'iD Mobile') {
      // Subtle network warning for premium seeking profiles
      if (['remote', 'business'].includes(lifestyleId || '')) {
          tradeoffText = "Tradeoff: Rural signal may be less consistent than premium networks.";
      }
  } else if (plan.speedCapMbps) {
      tradeoffText = `Tradeoff: Speed is capped at ${plan.speedCapMbps}Mbps (slower than full 5G).`;
  }

  // Fallback tradeoff for low scores if nothing specific triggered
  if (!tradeoffText && plan.monthlyPrice > 25) {
      tradeoffText = "Tradeoff: Higher monthly cost than average market rates.";
  }


  // --- 3. Bullet Points (Benefits) ---
  const userPoints: string[] = [];
  const objectivePoints: string[] = [];
  
  // A. User Specific (Max 2)
  if (lifestyleId === 'budget') {
      if (plan.monthlyPrice < 10) userPoints.push("Extremely low monthly cost");
      if (plan.contractType === 'rolling') userPoints.push("Cancel anytime flexibility");
  } else if (lifestyleId === 'travel') {
      if (plan.euRoamingIncluded) userPoints.push(plan.euRoamingCapGB ? `EU Roaming (up to ${plan.euRoamingCapGB}GB)` : "Free EU Roaming included");
      if (plan.globalRoamingIncluded) userPoints.push("Global roaming destinations");
  } else if (['remote', 'power'].includes(lifestyleId || '') && plan.hotspotPolicy === 'unlimited') {
      userPoints.push("Unlimited hotspotting for devices");
  } else if (needsHeavyData && plan.dataAllowanceGB === null) {
      userPoints.push("Truly unlimited data");
  }

  // B. Objective / Backup (Fill the rest)
  if (plan.includes5G) objectivePoints.push("5G ready");
  if (plan.keyPerks.includes("No credit check")) objectivePoints.push("No credit check");
  if (plan.dataAllowanceGB && plan.dataAllowanceGB >= 50) objectivePoints.push(`${plan.dataAllowanceGB}GB data allowance`);
  if (plan.contractLengthMonths === 1) objectivePoints.push("1-month rolling plan");
  if (plan.network) objectivePoints.push(`${plan.network} coverage`);
  
  // Merge: Take max 2 user points, then fill with objective points until 3 total
  const finalPoints = [...userPoints.slice(0, 2)];
  for (const op of objectivePoints) {
      if (finalPoints.length >= 3) break;
      if (!finalPoints.includes(op)) finalPoints.push(op);
  }

  return {
    primaryText,
    tradeoffText,
    bulletPoints: finalPoints
  };
};

export const buildTopAnalysisCopy = (params: TopAnalysisParams): TopAnalysisResult => {
    const { userProfile, priorities, budget, activeTab, scoreBand } = params;
    
    // 1. Headline
    let headline = "Your personalized recommendations";
    if (params.topPlan && params.topPlan.monthlyPrice) { 
        headline = "We found some strong matches for you.";
    }

    // 2. Body construction
    const sentences: string[] = [];

    // Context sentence
    if (userProfile && PROFILE_NAMES[userProfile]) {
        sentences.push(`Because you're a ${PROFILE_NAMES[userProfile]}, we prioritized plans that balance ${userProfile === 'budget' ? 'price and flexibility' : 'performance and features'}.`);
    } else {
        sentences.push("Based on your inputs, we focused on finding a balanced plan with good network reliability.");
    }

    // Priority reflection
    if (budget) {
        sentences.push(`We aimed to keep costs around £${budget}/mo.`);
    } else if (priorities.includes('I want no contract commitment')) {
        sentences.push("We prioritized 1-month rolling contracts for flexibility.");
    } else if (priorities.includes('I travel in Europe often')) {
        sentences.push("We heavily weighted inclusive EU roaming.");
    } else if (priorities.includes('I hate running out of data')) {
        sentences.push("We looked for high data caps or unlimited options.");
    }

    // Active tab context
    if (activeTab === 'Price') {
        sentences.push("Sorting by lowest price first.");
    } else if (activeTab === 'Most Data') {
        sentences.push("Sorting by maximum data allowance.");
    }

    // Low score caveat
    if (scoreBand === 'cautious') {
        sentences.push("Note: We couldn't find a perfect match for all your filters, so these are the closest available options (some trade-offs apply).");
    }

    return {
        headline,
        body: sentences.join(" ")
    };
};