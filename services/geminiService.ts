import { GoogleGenAI } from "@google/genai";
import { Patient } from "../types";

// Declare process to satisfy TypeScript since we don't have @types/node
declare const process: {
  env: {
    API_KEY: string;
  }
};

// Note: In a real production app, this key should be secure. 
// For this demo, we assume the environment variable or user input is handled.
const getClient = () => {
  const apiKey = process.env.API_KEY || ''; 
  // We will handle the missing key gracefully in the UI if not present
  return new GoogleGenAI({ apiKey });
};

export const generateCounselingStrategy = async (patient: Patient): Promise<string> => {
  try {
    const ai = getClient();
    
    const prompt = `
      You are an expert medical sales counselor. Create a brief, empathetic, and effective counseling strategy (max 50 words) for this patient to help them make a decision about their treatment.
      
      Patient Profile:
      - Name: ${patient.name}
      - Age: ${patient.age}
      - Occupation: ${patient.occupation}
      - Feeling: ${patient.feeling}
      
      Doctor's Assessment:
      - Recommendation: ${patient.doctorAssessment?.quickCode}
      - Pain Level: ${patient.doctorAssessment?.painSeverity}
      - Affordability: ${patient.doctorAssessment?.affordability}
      - Readiness: ${patient.doctorAssessment?.conversionReadiness}
      
      Provide a specific conversational approach to address their likely concerns based on readiness and affordability.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate strategy.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Strategy unavailable. Please ensure API Key is set.";
  }
};