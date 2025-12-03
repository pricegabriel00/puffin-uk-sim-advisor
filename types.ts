
export interface UserInput {
  description: string;
  budget?: number;
  priority?: string[];
  lifestyleId?: string;
  smartFeatures?: string[];
  quickNeeds?: QuickNeeds; // Answers from the "Other" profile follow-up
  preFilter?: {
    contract: string;
    data: string;
    roaming: string;
  };
}

export interface QuickNeeds {
  dataUsage: 'Low' | 'Medium' | 'High' | 'Unlimited';
  euTravel: 'Never' | 'Sometimes' | 'Often';
  priority: 'Flexibility' | 'Savings';
}

// Advanced Filter Types - V2 Strict Definitions
export type PriceFilter = "Any" | "£5-£10" | "£10-£15" | "£15-£20" | "£20-£30" | "£30+";
export type DataFilter = "Any" | "Light (<15GB)" | "Moderate (15-50GB)" | "Heavy (50-100GB)" | "Unlimited";
export type ContractFilter = "Any" | "1 month rolling" | "12 months" | "24 months";
export type RoamingFilter = "Any" | "UK only" | "EU included" | "Global included";
export type NetworkFilter = "Any" | "Vodafone" | "O2" | "Three" | "EE";
export type SpecialFeatureKey = "No credit check" | "Data rollover" | "Free EU roaming" | "5G included" | "Hotspot allowed";

export interface PlanFiltersState {
  price: PriceFilter;
  data: DataFilter;
  contract: ContractFilter;
  roaming: RoamingFilter;
  network: NetworkFilter;
  specialFeatures: SpecialFeatureKey[];
}

export interface ScoreBreakdown {
  dataFit: number;
  priceFit: number;
  reliabilityFit: number;
  roamingFit: number;
  coverageFit: number;
  contractFit: number;
  hotspotFit: number;
  budgetFit: number;
  featuresFit: number; // New: capture extras/perks
}

// Raw Plan Type from Google Sheet Backend
export type SimPlan = {
  id: number;
  providerName: string;
  planName: string;
  network: string;
  pricePerMonth: number;
  dataGb: number;
  isUnlimitedData: boolean;
  contractLengthMonths: number;
  isRolling: boolean;
  roamingType: 'UK only' | 'EU Included' | 'Global Included' | 'Paid';
  hotspotAllowed: boolean;
  noCreditCheck: boolean;
  hasDataRollover: boolean;
  notes: string;
  rating: number; // 0–100 quality score
  affiliateUrl: string; // New field for affiliate link
};

// Central Data Model for Mobile Plans
export interface Plan {
  id: string;
  provider: string;          // Brand customer sees (Voxi, Smarty, EE)
  network: string;           // Underlying network (Vodafone, Three, EE, O2)
  planName: string;          // e.g. "Unlimited Data SIM", "30GB SIM Only"

  // Commercials
  monthlyPrice: number;          // £ per month
  contractLengthMonths: number;  // 1, 12, 24
  contractType: 'rolling' | 'fixed';

  // Data & usage
  dataAllowanceGB: number | null; // null = truly unlimited
  dataCategory: 'light' | 'moderate' | 'heavy' | 'unlimited';
  fairUseDataGB?: number | null;  // Optional – EU fair use cap if different

  // Roaming
  roamingType: 'uk-only' | 'eu' | 'global';
  euRoamingIncluded: boolean;
  euRoamingCapGB: number | null;  // null = same as UK / no explicit cap
  globalRoamingIncluded: boolean;

  // Hotspot / speed / tech
  hotspotPolicy: 'not-allowed' | 'limited' | 'unlimited';
  hotspotCapGB?: number | null;
  speedCapMbps: number | null;    // null if no explicit cap
  includes5G: boolean;

  // Quality & reputation
  reliabilityRating: number;      // 1–5 (network quality)
  rawRating: number;              // 0-100 (raw sheet score)
  customerServiceRating: number;  // 1–5 (brand support reputation)

  // Tagging & messaging
  keyPerks: string[];             // ["Endless Social", "No credit check"]
  highlightNote?: string;         // Specific note from sheet
  badges: string[];               // ["Cheapest good fit", "Top Puffin Pick"]

  // Meta / monetisation
  dealUrl: string;                // Link to the real deal (placeholder for now)
  affiliateCode?: string | null;  // For future tracking
  lastUpdated: string;            // ISO date string, e.g. "2025-11-25"
}

// UI View Model (Enriched Plan)
export interface PlanRecommendation {
  id: string;
  category: 'Top Puffin Pick' | 'Best Value' | 'Cheapest Good Fit';
  provider: string;
  name: string;
  monthlyCost: number;
  dataAllowanceGB: number; // Use -1 for unlimited
  contractLength: string;
  euRoaming: string;
  hotspotRules: string;
  network: string;
  coverageRating: number; // 1-5 scale
  calculatedPuffinScore: number; // 0-100 (UI calculated)
  matchStrength: string; // Excellent / Good / Fair / Poor
  
  // Refined Explanation Engine
  explanationPrimary: string;
  explanationTradeOff: string | null;
  explanationBullets: string[];
  
  scoreBreakdown: ScoreBreakdown;
  debug?: any; // For developer sanity checks
  
  footerNote?: string;
  alternative?: { label: string, targetId: string, name: string } | null;
  features: string[];
  planData: Plan; // Reference to original data
}

export interface AnalysisResult {
  personalFitSummary: string;
}

export enum AppState {
  WELCOME = 'WELCOME',
  INPUT = 'INPUT',
  QUICK_QUESTIONS = 'QUICK_QUESTIONS',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}