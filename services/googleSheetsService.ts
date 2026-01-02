
import { Patient, SurgeryProcedure, ProposalStatus } from "../types";

/**
 * Google Sheets Real-Time Sync Service
 * Handles data export and automatic row formatting via Apps Script Webhook.
 */
export const syncToGoogleSheets = async (patient: Patient): Promise<boolean> => {
  const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwJas8BjJINnVIgUq8MacjBkTk03RGr3xjh0Dmi_zGlXVreQvamlwa6ItTSwlSLGpHo/exec';
  
  try {
    let surgeryProcedureValue = patient.doctorAssessment?.surgeryProcedure || "N/A";
    if (patient.doctorAssessment?.surgeryProcedure === SurgeryProcedure.Others && patient.doctorAssessment?.otherSurgeryName) {
      surgeryProcedureValue = `Other: ${patient.doctorAssessment.otherSurgeryName}`;
    }

    const currentStatus = patient.packageProposal?.status || "Pending Counseling";
    const outcomeDate = patient.packageProposal?.outcomeDate || "N/A";

    const payload = {
      // Identity & Contact
      id: patient.id,
      name: patient.name,
      entry_date: patient.entry_date, // DOP
      age: patient.age,
      gender: patient.gender,
      mobile: patient.mobile,
      occupation: patient.occupation || "N/A",
      condition: patient.condition,
      insurance: patient.hasInsurance,
      insurance_name: patient.insuranceName || "N/A",
      source: patient.source,
      source_doctor_name: patient.sourceDoctorName || "N/A",
      
      // Clinical Assessment
      doctor_code: patient.doctorAssessment?.quickCode || "N/A",
      surgery_procedure: surgeryProcedureValue,
      pain_severity: patient.doctorAssessment?.painSeverity || "N/A",
      affordability: patient.doctorAssessment?.affordability || "N/A",
      readiness: patient.doctorAssessment?.conversionReadiness || "N/A",
      tentative_date: patient.doctorAssessment?.tentativeSurgeryDate || "N/A",
      doctor_signature: patient.doctorAssessment?.doctorSignature || "N/A",
      
      // Counseling & Conversion
      status: currentStatus, 
      decision_pattern: patient.packageProposal?.decisionPattern || "N/A",
      objection: patient.packageProposal?.objectionIdentified || "N/A",
      strategy: patient.packageProposal?.counselingStrategy || "N/A",
      
      // Follow-up Tracking (Added for Google Sheet mapping)
      follow_up_visit_date: patient.lastFollowUpVisitDate || "N/A",
      next_follow_up_date: patient.packageProposal?.followUpDate || "N/A",
      
      last_follow_up_at: patient.packageProposal?.lastFollowUpAt || "N/A",
      outcome_date: outcomeDate,

      // Specific Outcome Columns for Google Sheet display
      surgery_date: currentStatus === ProposalStatus.SurgeryFixed ? outcomeDate : "N/A",
      surgery_fixed_date: currentStatus === ProposalStatus.SurgeryFixed ? outcomeDate : "N/A",
      surgery_lost_date: currentStatus === ProposalStatus.SurgeryLost ? outcomeDate : "N/A",
      
      last_updated: new Date().toISOString()
    };

    console.log(`📊 Syncing [${patient.id}] to Sheets. Status: "${currentStatus}"`);

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error("❌ Google Sheets Sync Error:", error);
    return false;
  }
};
