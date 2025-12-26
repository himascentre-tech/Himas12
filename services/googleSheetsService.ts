
/**
 * Google Sheets Real-Time Sync Service
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any code there and paste the following script:
 * 
 * function doPost(e) {
 *   var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *   var data = JSON.parse(e.postData.contents);
 *   
 *   // Get headers from the first row
 *   var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 *   
 *   // Find if row exists (by ID) to update, otherwise append
 *   var idIndex = headers.indexOf("id");
 *   var rowIndex = -1;
 *   
 *   if (idIndex > -1 && sheet.getLastRow() > 1) {
 *     var ids = sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1, 1).getValues();
 *     for (var i = 0; i < ids.length; i++) {
 *       if (ids[i][0] == data.id) { 
 *         rowIndex = i + 2; 
 *         break; 
 *       }
 *     }
 *   }
 *   
 *   // Map data to the correct columns based on headers
 *   var newRow = headers.map(function(h) {
 *     return data[h] || "";
 *   });
 *   
 *   if (rowIndex > -1) {
 *     sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
 *   } else {
 *     sheet.appendRow(newRow);
 *   }
 *   
 *   return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
 * }
 * 
 * 4. Click 'Deploy' > 'New deployment' > 'Web app'.
 * 5. Set 'Execute as' to 'Me' and 'Who has access' to 'Anyone'.
 * 6. The URL below should match your deployed Web App URL.
 */

import { Patient } from "../types";

export const syncToGoogleSheets = async (patient: Patient): Promise<boolean> => {
  // Using the specific URL provided by the user
  const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwJas8BjJINnVIgUq8MacjBkTk03RGr3xjh0Dmi_zGlXVreQvamlwa6ItTSwlSLGpHo/exec';
  
  try {
    // Flatten the data for Google Sheets consumption
    const payload = {
      id: patient.id,
      name: patient.name,
      entry_date: patient.entry_date,
      age: patient.age,
      gender: patient.gender,
      mobile: patient.mobile,
      occupation: patient.occupation,
      condition: patient.condition,
      insurance: patient.hasInsurance,
      insurance_name: patient.insuranceName || "N/A",
      source: patient.source,
      
      // Doctor Assessment Fields
      doctor_code: patient.doctorAssessment?.quickCode || "",
      pain_severity: patient.doctorAssessment?.painSeverity || "",
      affordability: patient.doctorAssessment?.affordability || "",
      readiness: patient.doctorAssessment?.conversionReadiness || "",
      surgery_date: patient.doctorAssessment?.tentativeSurgeryDate || "",
      doctor_signature: patient.doctorAssessment?.doctorSignature || "",
      
      // Package Team Fields
      decision_pattern: patient.packageProposal?.decisionPattern || "",
      objection: patient.packageProposal?.objectionIdentified || "",
      strategy: patient.packageProposal?.counselingStrategy || "",
      follow_up: patient.packageProposal?.followUpDate || "",
      
      last_updated: new Date().toISOString()
    };

    // Google Apps Script requires 'no-cors' mode for simple POST triggers via fetch
    // because it handles redirects that are often blocked in standard CORS mode.
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`%c📊 Google Sheets Sync: Data pushed for ${patient.name}`, "color: #10b981; font-weight: bold;");
    return true;
  } catch (error) {
    console.error("Google Sheets Sync Error:", error);
    return false;
  }
};
