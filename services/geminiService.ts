import { GoogleGenAI } from "@google/genai";
import { Patient } from "../types";

export const generateCounselingStrategy = async (patient: Patient): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are an expert medical sales counselor. Create a brief, empathetic, and effective counseling strategy (max 50 words) for this patient to help them make a decision about their treatment.
      
      Patient Profile:
      - Name: ${patient.name}
      - Age: ${patient.age}
      - Condition: ${patient.condition}
      
      Doctor's Assessment:
      - Recommendation: ${patient.doctorAssessment?.quickCode}
      - Pain Level: ${patient.doctorAssessment?.painSeverity}
      - Affordability: ${patient.doctorAssessment?.affordability}
      - Readiness: ${patient.doctorAssessment?.conversionReadiness}
      
      Provide a specific conversational approach to address their likely concerns.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "AI strategy generation unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Strategic advice currently unavailable. Proceed with standard counseling.";
  }
};