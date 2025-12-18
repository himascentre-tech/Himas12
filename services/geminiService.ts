import { GoogleGenAI } from "@google/genai";
import { Patient } from "../types";

export const generateCounselingStrategy = async (patient: Patient): Promise<string> => {
  try {
    // Safe access to API_KEY
    const apiKey = import.meta?.env?.API_KEY || "";
    
    if (!apiKey) {
      console.warn("Gemini API Key missing from environment.");
      return "AI Strategy unavailable. Please set the API_KEY environment variable.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are an expert medical sales counselor. Create a brief, empathetic, and effective counseling strategy (max 50 words) for this patient to help them make a decision about their treatment.
      
      Patient Profile:
      - Name: ${patient.name}
      - Age: ${patient.age}
      - Occupation: ${patient.occupation}
      - Condition: ${patient.condition}
      
      Doctor's Assessment:
      - Recommendation: ${patient.doctorAssessment?.quickCode}
      - Pain Level: ${patient.doctorAssessment?.painSeverity}
      - Affordability: ${patient.doctorAssessment?.affordability}
      - Readiness: ${patient.doctorAssessment?.conversionReadiness}
      
      Provide a specific conversational approach to address their likely concerns based on readiness and affordability.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate strategy.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Strategy unavailable. Check API configuration.";
  }
};
