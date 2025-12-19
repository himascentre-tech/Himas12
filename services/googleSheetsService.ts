
import { Patient } from "../types";

/**
 * Service to sync patient data to Google Sheets via a Web App URL.
 * Uses text/plain to avoid CORS preflight (OPTIONS) requests which 
 * Google Apps Script does not support.
 */
export const syncToGoogleSheets = async (patient: Patient): Promise<boolean> => {
  // New URL from the user's latest deployment screenshot
  const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwfn17eLABTbGCzm7gm8HFsSHz0YkBVEtyi7j8-B0V397M3zt7-h_19FLhCLDCnqkTe/exec';

  try {
    const payload = {
      // Demographic Info
      id: patient.id,
      name: patient.name,
      mobile: patient.mobile,
      condition: patient.condition,
      age: patient.age,
      gender: patient.gender,
      source: patient.source,
      hasInsurance: patient.hasInsurance,
      occupation: patient.occupation,
      
      // Clinical Assessment (Doctor)
      surgeonCode: patient.doctorAssessment?.quickCode || '',
      painSeverity: patient.doctorAssessment?.painSeverity || '',
      surgeryDate: patient.doctorAssessment?.tentativeSurgeryDate || '',
      readiness: patient.doctorAssessment?.conversionReadiness || '',
      
      // Counseling Info (Package Team)
      objection: patient.packageProposal?.objectionIdentified || '',
      strategy: patient.packageProposal?.counselingStrategy || '',
      followUp: patient.packageProposal?.followUpDate || '',
      
      timestamp: new Date().toISOString()
    };

    console.log("📤 Syncing to Google Sheets...", payload.id);

    // Using 'text/plain' as the Content-Type is a standard workaround 
    // to prevent browsers from sending a CORS preflight OPTIONS request.
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error("❌ Google Sheets Sync Failed:", error);
    return false;
  }
};
