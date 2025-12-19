
import { Patient } from "../types";

/**
 * Service to sync patient data to Google Sheets via a Web App URL.
 * Matches the deployment URL provided in the user's screenshot.
 */
export const syncToGoogleSheets = async (patient: Patient): Promise<boolean> => {
  // This is the WEB APP URL from your Apps Script deployment
  const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwfn17eLABTbGCzm7gm8HFsSHz0YkBVEtyi7j8-B0V397M3zt7-h_19FLhCLDCnqkTe/exec';

  try {
    const payload = {
      // Basic Registration
      id: patient.id,
      name: patient.name,
      mobile: patient.mobile,
      condition: patient.condition,
      age: patient.age,
      gender: patient.gender,
      source: patient.source,
      hasInsurance: patient.hasInsurance,
      occupation: patient.occupation,
      
      // Medical Side (Doctor)
      surgeonCode: patient.doctorAssessment?.quickCode || '',
      painSeverity: patient.doctorAssessment?.painSeverity || '',
      surgeryDate: patient.doctorAssessment?.tentativeSurgeryDate || '',
      readiness: patient.doctorAssessment?.conversionReadiness || '',
      affordability: patient.doctorAssessment?.affordability || '',
      
      // Business Side (Counselor)
      objection: patient.packageProposal?.objectionIdentified || '',
      strategy: patient.packageProposal?.counselingStrategy || '',
      followUp: patient.packageProposal?.followUpDate || '',
      decisionPattern: patient.packageProposal?.decisionPattern || '',
      
      lastUpdated: new Date().toLocaleString()
    };

    console.log("📊 [Sync] Triggering update for patient:", payload.id);

    // Using 'text/plain' and 'no-cors' is mandatory for Google Apps Script 
    // to avoid security blocks from the browser.
    await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    console.log("📊 [Sync] Data dispatched successfully.");
    return true;
  } catch (error) {
    console.error("📊 [Sync Error]:", error);
    return false;
  }
};
