import { UserInput } from '../types';

export const buildProfileSummary = (input: UserInput): { title: string; subtitle: string } => {
  const { lifestyleId, budget, priority = [], description } = input;

  // 1. Title Construction
  let title = "Your Profile";
  
  if (lifestyleId) {
      switch (lifestyleId) {
        case 'budget': title = "Budget-Focused User"; break;
        case 'travel': title = "Frequent Traveller"; break;
        case 'power': title = "Power User"; break;
        case 'streamer': title = "Heavy Streamer"; break;
        case 'remote': title = "Remote Worker"; break;
        case 'social': title = "Social Media Fan"; break;
        case 'everyday': title = "Everyday User"; break;
        case 'other': title = "Custom Profile"; break;
        default: title = "Your Profile";
      }
  } else if (priority.length > 0) {
      title = "Custom Preferences";
  } else if (budget) {
      title = "Budget-Conscious User";
  }

  // 2. Subtitle Construction
  const parts: string[] = [];

  // Priorities to natural language
  if (priority.includes('I want something cheap and simple')) parts.push("keeping costs down");
  if (priority.includes('I hate running out of data') || priority.includes('I want unlimited so I never think about it')) parts.push("avoiding data caps");
  if (priority.includes('I want the best coverage')) parts.push("network reliability");
  if (priority.includes('I want no contract commitment')) parts.push("flexibility");
  if (priority.includes('I hotspot my laptop')) parts.push("hotspotting");
  if (priority.includes('I travel in Europe often') || priority.includes('EU Travel')) parts.push("EU travel");
  if (priority.includes('I care about customer service')) parts.push("good support");

  let subtitle = "";
  
  if (parts.length > 0) {
      // Pick top 2 distinctive ones
      const topParts = parts.slice(0, 3);
      if (topParts.length === 1) {
          subtitle = `Prioritizing ${topParts[0]}.`;
      } else {
          const last = topParts.pop();
          subtitle = `Prioritizing ${topParts.join(", ")} and ${last}.`;
      }
  } else if (description && description.length > 5) {
      subtitle = `Based on: "${description.length > 30 ? description.substring(0, 30) + '...' : description}"`;
  } else {
      subtitle = "We're analysing your inputs to find the best fit.";
  }

  // Budget appendix
  if (budget) {
      subtitle += ` Target budget: £${budget}/mo.`;
  }

  return { title, subtitle };
};