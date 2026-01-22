
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserInput } from '../types';

/**
 * Creates a GenAI client instance.
 * Guidelines strictly require using process.env.API_KEY directly in the constructor.
 */
const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  // Initialize GoogleGenAI with named parameter apiKey as per guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Transcribes audio using Gemini 3 Flash.
 */
export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  const ai = getAIClient();

  try {
    // Using gemini-3-flash-preview for multimodal transcription tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: "Transcribe the spoken audio into text exactly as it is spoken. Do not add any conversational filler, labels, or introductions. Just output the raw transcription."
          }
        ]
      }
    });

    // Directly access .text property as per guidelines (not a method)
    const text = response.text;
    if (!text) {
        throw new Error("No transcription generated");
    }
    return text;
  } catch (error) {
    console.error("Transcription Failed:", error);
    throw error;
  }
};

/**
 * Analyzes user needs and generates a lifestyle summary using Gemini 3 Flash.
 */
export const analyzeUserNeeds = async (input: UserInput): Promise<AnalysisResult> => {
  const ai = getAIClient();

  const basePrompt = `
You are Puffin, a specialized UK mobile plan search engine.
Your goal is to analyze a user's lifestyle and generate a "Personal Fit Summary" explaining what they should look for in a mobile plan.

Input Analysis:
Analyze the user's description and priorities to determine their data needs, travel habits, price sensitivity, and preference for contracts.

Output Requirement:
Generate a "Personal Fit Summary" (2-3 sentences). This should directly address the user's input explanation and priorities. Explain broadly why certain types of plans (e.g. high data, roaming included) would be chosen for them.
Tone: Friendly, expert, personalized.
Example: "Because you commute daily and stream music constantly, we focused on plans with high data caps. We also prioritized free EU roaming because you mentioned frequent travel."

Output must be JSON matching the schema.
`;

  const prioritiesList = input.priority && input.priority.length > 0 ? input.priority.join(', ') : 'None';
  const fullPrompt = `${basePrompt}\n\nUser Input:\n"${input.description}"\nPriorities: ${prioritiesList}`;

  // Defined as plain object according to guidelines
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      personalFitSummary: {
        type: Type.STRING,
        description: "A friendly, expert summary explaining why plans matching this lifestyle were chosen."
      }
    },
    required: ["personalFitSummary"]
  };

  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: fullPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    // Access .text property directly
    const resultText = response.text;
    if (!resultText) {
        throw new Error("Empty response from AI");
    }

    const data = JSON.parse(resultText) as { personalFitSummary: string };
    
    return {
        personalFitSummary: data.personalFitSummary
    };
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};
