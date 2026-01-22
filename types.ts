
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

// Advanced Filter Types - V2 Intent-Based Definitions
export type PriceFilter = "Any" | "Under £10" | "Under £15" | "Under £20";
export type DataFilter = "Any" | "20GB+" | "50GB+" | "100GB+" | "Unlimited";
export type ContractFilter = "Any" | "1 month rolling" | "12 months" | "24 months";
export type RoamingFilter = "Any" | "Required";
export type NetworkFilter = "Any" | "Vodafone" | "O2" | "Three" | "EE";
export type SpecialFeatureKey = "No credit check" | "Data rollover" | "5G included" | "Hotspot allowed";

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
  featuresFit: number;
}

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
  roamingType: 'uk-only' | 'eu' | 'global';
  hotspotAllowed: boolean;
  noCreditCheck: boolean;
  hasDataRollover: boolean;
  notes: string;
  rating: number; 
  affiliateUrl: string;
  euRoamingCapGb: number | null;
};

export interface Plan {
  id: string;
  provider: string;          
  network: string;           
  planName: string;          

  monthlyPrice: number;          
  contractLengthMonths: number;  
  contractType: 'rolling' | 'fixed';

  dataAllowanceGB: number | null; 
  dataCategory: 'light' | 'moderate' | 'heavy' | 'unlimited';
  fairUseDataGB?: number | null;  

  roamingType: 'uk-only' | 'eu' | 'global';
  euRoamingIncluded: boolean;
  euRoamingCapGB: number | null;  
  globalRoamingIncluded: boolean;

  hotspotPolicy: 'not-allowed' | 'limited' | 'unlimited';
  hotspotCapGB?: number | null;
  speedCapMbps: number | null;    
  includes5G: boolean;

  reliabilityRating: number;      
  rawRating: number;              
  customerServiceRating: number;  

  keyPerks: string[];             
  highlightNote?: string;         
  badges: string[];               

  dealUrl: string;                
  affiliateCode?: string | null;  
  lastUpdated: string;            
}

export interface PlanRecommendation {
  id: string;
  category: 'Top Puffin Pick' | 'Best Value' | 'Cheapest Good Fit';
  provider: string;
  name: string;
  monthlyCost: number;
  dataAllowanceGB: number; 
  contractLength: string;
  euRoaming: string;
  hotspotRules: string;
  network: string;
  coverageRating: number; 
  calculatedPuffinScore: number; 
  matchStrength: string; 
  
  explanationPrimary: string;
  explanationTradeOff: string | null;
  explanationBullets: string[];
  
  scoreBreakdown: ScoreBreakdown;
  debug?: any; 
  
  footerNote?: string;
  alternative?: { label: string, targetId: string, name: string } | null;
  features: string[];
  planData: Plan; 
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
