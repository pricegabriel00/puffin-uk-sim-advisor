
export type MatchLevel = 'excellent' | 'good' | 'fair' | 'cautious';

export interface MatchLabelResult {
  label: string;
  level: MatchLevel;
  colorClass: string;
  badgeClass: string;
}

export const getMatchLabel = (score: number): MatchLabelResult => {
  if (score >= 80) {
    return { 
      label: "Excellent Match", 
      level: 'excellent', 
      colorClass: "text-green-700",
      badgeClass: "bg-green-50 text-green-700 border-green-100" 
    };
  }
  if (score >= 65) {
    return { 
      label: "Good Match", 
      level: 'good', 
      colorClass: "text-blue-700", 
      badgeClass: "bg-blue-50 text-blue-700 border-blue-100" 
    };
  }
  if (score >= 50) {
    return { 
      label: "Fair Match", 
      level: 'fair', 
      colorClass: "text-amber-700", 
      badgeClass: "bg-amber-50 text-amber-700 border-amber-100" 
    };
  }
  return { 
    label: "Cautious Match", 
    level: 'cautious', 
    colorClass: "text-orange-600 font-bold", 
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 font-bold" 
  };
};
