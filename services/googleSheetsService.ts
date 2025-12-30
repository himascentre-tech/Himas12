
import { Patient, SurgeryProcedure, ProposalStatus } from "../types";

/**
 * Google Sheets Real-Time Sync Service
 * 
 * NOTE: Using mode: 'no-cors' is necessary for Google Apps Script to avoid 
 * CORS preflight (OPTIONS) requests which Apps Script doesn't support.
 * In this mode, the response cannot be read, but the data is sent successfully.
 */
export const syncToGoogleSheets = async (patient: Patient): Promise<boolean> => {
  const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwJas8BjJINnVIgUq8MacjBkTk03RGr3xjh0Dmi_zGlXVreQvamlwa6ItTSwlSLGpHo/exec';
  
  if (!WEBHOOK_URL) {
    console.error("❌ Google Sheets Sync: Missing Webhook URL.");
    return false;
  }

  try {
    // Determine the surgery procedure name to send
    let surgeryProcedureValue = patient.doctorAssessment?.surgeryProcedure || "N/A";
    if (patient.doctorAssessment?.surgeryProcedure === SurgeryProcedure.Others && patient.doctorAssessment?.otherSurgeryName) {
      surgeryProcedureValue = `Other: ${patient.doctorAssessment.otherSurgeryName}`;
    }

    const payload = {
      id: patient.id,
      name: patient.name,
      entry_date: patient.entry_date,
      age: patient.age,
      gender: patient.gender,
      mobile: patient.mobile,
      occupation: patient.occupation || "N/A",
      condition: patient.condition,
      insurance: patient.hasInsurance,
      insurance_name: patient.insuranceName || "N/A",
      source: patient.source,
      source_doctor_name: patient.sourceDoctorName || "N/A",
      
      // Doctor Assessment Fields
      doctor_code: patient.doctorAssessment?.quickCode || "N/A",
      surgery_procedure: surgeryProcedureValue,
      pain_severity: patient.doctorAssessment?.painSeverity || "N/A",
      affordability: patient.doctorAssessment?.affordability || "N/A",
      readiness: patient.doctorAssessment?.conversionReadiness || "N/A",
      surgery_date: patient.doctorAssessment?.tentativeSurgeryDate || "N/A",
      doctor_signature: patient.doctorAssessment?.doctorSignature || "N/A",
      
      // Package Team Fields
      status: patient.packageProposal?.status || "N/A",
      decision_pattern: patient.packageProposal?.decisionPattern || "N/A",
      objection: patient.packageProposal?.objectionIdentified || "N/A",
      strategy: patient.packageProposal?.counselingStrategy || "N/A",
      follow_up: patient.packageProposal?.followUpDate || "N/A",
      last_follow_up_at: patient.packageProposal?.lastFollowUpAt || "N/A",
      outcome_date: patient.packageProposal?.outcomeDate || "N/A",
      
      last_updated: new Date().toISOString()
    };

    console.log("📤 Attempting to sync to Google Sheets:", payload);

    // We send as a string. In 'no-cors' mode, we can't set Content-Type to application/json,
    // but Apps Script's e.postData.contents will still contain this string.
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      body: JSON.stringify(payload),
    });

    console.log(`%c✅ Sync Triggered: ${patient.name} (${patient.id})`, "color: #10b981; font-weight: bold;");
    return true;
  } catch (error) {
    console.error("❌ Google Sheets Sync Failed:", error);
    return false;
  }
};
