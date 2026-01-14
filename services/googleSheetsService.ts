
import { Patient, SurgeryProcedure, ProposalStatus, BookingStatus } from "../types";

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

    // Determine Visit Type for clearer reporting
    const visitType = patient.isFollowUpVisit ? "Return Revisit" : (patient.bookingStatus ? "Scheduled Booking" : "New Registration");

    const payload = {
      // Identity & Contact
      id: patient.id,
      hospital_id: patient.hospital_id,
      name: patient.name,
      entry_date: patient.entry_date, // DOP or Booking Date
      age: patient.age,
      gender: patient.gender,
      mobile: patient.mobile,
      occupation: patient.occupation || "N/A",
      
      // Booking & Arrival Tracking
      booking_status: patient.bookingStatus || "N/A",
      booking_time: patient.bookingTime || "N/A",
      visit_type: visitType,
      arrival_time: patient.arrivalTime || (patient.created_at ? new Date(patient.created_at).toLocaleTimeString('en-IN') : "N/A"),
      
      // Clinical Assessment
      condition: patient.condition,
      insurance: patient.hasInsurance,
      insurance_name: patient.insuranceName || "N/A",
      source: patient.source,
      source_doctor_name: patient.sourceDoctorName || "N/A",
      doctor_code: patient.doctorAssessment?.quickCode || "Awaiting",
      surgery_procedure: surgeryProcedureValue,
      clinical_notes: patient.doctorAssessment?.notes || "N/A",
      
      // Counseling & Financial Package Details (NEW FIELDS ADDED HERE)
      proposal_status: currentStatus, 
      package_amount: patient.packageProposal?.packageAmount || 0,
      payment_mode: patient.packageProposal?.paymentMode || "N/A",
      insurance_doc_shared: patient.packageProposal?.insuranceDocShared || "N/A",
      pre_op_investigation: patient.packageProposal?.preOpInvestigation || "N/A",
      surgery_medicines: patient.packageProposal?.surgeryMedicines || "N/A",
      equipment_list: (patient.packageProposal?.equipment || []).join(", ") || "None",
      icu_charges: patient.packageProposal?.icuCharges || "N/A",
      room_type: patient.packageProposal?.roomType || "N/A",
      stay_days: patient.packageProposal?.stayDays || 0,
      post_op_follow_up: patient.packageProposal?.postOpFollowUp || "N/A",
      
      // Objections & AI Logic
      objection: patient.packageProposal?.objectionIdentified || "N/A",
      strategy: patient.packageProposal?.counselingStrategy || "N/A",
      
      // Milestones
      next_follow_up_date: patient.packageProposal?.followUpDate || "N/A",
      outcome_date: outcomeDate,
      surgery_fixed_date: currentStatus === ProposalStatus.SurgeryFixed ? outcomeDate : "N/A",
      surgery_lost_date: currentStatus === ProposalStatus.SurgeryLost ? outcomeDate : "N/A",
      
      last_sync_timestamp: new Date().toLocaleString('en-IN')
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
