
import { PlanRecommendation } from '../types';

export interface ClickContext {
  source: "heroCard" | "listCard" | "comparisonTable" | "modal";
  activeTab: string;
  matchScore: number;
  filtersSummary: string;
}

export const handlePlanClick = (plan: PlanRecommendation, context: ClickContext) => {
  const { provider, monthlyCost, planData } = plan;
  const { dealUrl } = planData;

  console.log("[Puffin click]", {
    provider: provider,
    price: monthlyCost,
    matchScore: context.matchScore,
    source: context.source,
    activeTab: context.activeTab,
    filtersSummary: context.filtersSummary
  });

  if (dealUrl) {
    window.open(dealUrl, "_blank");
  } else {
    console.warn("No deal URL found for plan", plan.id);
  }
};
