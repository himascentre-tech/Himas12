import { GoogleGenAI } from "@google/genai";
import { Patient } from "../types";

export const generateCounselingStrategy = async (patient: Patient): Promise<string> => {
  try {
    // Initializing Gemini API using the mandatory process.env.API_KEY parameter as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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

    // Using ai.models.generateContent directly with both model name and prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Directly access the .text property from the GenerateContentResponse object
    return response.text || "Could not generate strategy.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Strategy unavailable. Check API configuration.";
  }
};