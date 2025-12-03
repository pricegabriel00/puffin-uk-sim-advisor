
// Centralised Scoring Config
export const SCORING_CONFIG = {
  WEIGHTS: {
    // Base weightings (sum approx 100)
    DEFAULT: { 
      data: 25, 
      price: 20, 
      reliability: 20, 
      roaming: 15, 
      coverage: 10, 
      contract: 10, 
      hotspot: 0 
    }
  },
  THRESHOLDS: {
    EXCELLENT: 80, // Score >= 80
    GOOD: 65,      // Score >= 65
    FAIR: 50       // Score >= 50
    // Below 50 is Cautious
  },
  LABELS: {
    EXCELLENT: "Excellent Match",
    GOOD: "Good Match",
    FAIR: "Fair Match",
    CAUTIOUS: "Cautious Match"
  }
};
