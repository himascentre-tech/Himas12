
import { Patient } from "../types";

/**
 * Service to sync patient data to Google Sheets via a Web App URL.
 * Users should provide their Web App URL in the VITE_GOOGLE_SHEETS_WEBHOOK environment variable.
 */
export const syncToGoogleSheets = async (patient: Patient): Promise<boolean> => {
  // Fixed: Removed 'as any' cast as ImportMetaEnv is now properly defined in vite-env.d.ts
  const GOOGLE_SHEETS_URL = import.meta.env?.VITE_GOOGLE_SHEETS_WEBHOOK || '';

  if (!GOOGLE_SHEETS_URL) {
    console.warn("Google Sheets Webhook URL not configured. Skipping real-time sync.");
    return false;
  }

  try {
    const payload = {
      id: patient.id,
      name: patient.name,
      mobile: patient.mobile,
      condition: patient.condition,
      age: patient.age,
      gender: patient.gender,
      source: patient.source,
      hasInsurance: patient.hasInsurance,
      occupation: patient.occupation,
      timestamp: new Date().toISOString()
    };

    // We use no-cors if the Apps Script isn't configured for CORS, 
    // but standard POST usually works for Web Apps.
    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors', // Important for Google Apps Script redirects
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error("Google Sheets Sync Error:", error);
    return false;
  }
};
