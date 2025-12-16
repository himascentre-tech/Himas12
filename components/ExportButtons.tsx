import React from 'react';
import { Download, Printer } from 'lucide-react';
import { Patient } from '../types';

interface ExportButtonsProps {
  patients: Patient[];
  role: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ patients, role }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Comprehensive Headers
    const headers = [
      'File Registration No', 
      'Name', 
      'DOB',
      'Gender', 
      'Age', 
      'Mobile', 
      'Occupation',
      'Insurance',
      'Insurance Provider',
      'Source',
      'Current Feeling',
      'Registration Time',
      // Doctor Data
      'Doctor Assessed', 
      'Surgeon Code', 
      'Pain Severity',
      'Affordability',
      'Readiness',
      'Surgery Date',
      'Doctor Signature',
      // Package Data
      'Proposal Created', 
      'Decision Pattern',
      'Objection',
      'Strategy',
      'Follow Up Date'
    ];

    const rows = patients.map(p => [
      p.id,
      p.name,
      p.dob || '',
      p.gender,
      p.age,
      p.mobile,
      p.occupation || '',
      p.hasInsurance,
      p.insuranceName || 'N/A',
      p.source,
      p.feeling,
      new Date(p.registeredAt).toLocaleString(),
      
      // Doctor
      p.doctorAssessment ? 'Yes' : 'No',
      p.doctorAssessment?.quickCode || '',
      p.doctorAssessment?.painSeverity || '',
      p.doctorAssessment?.affordability || '',
      p.doctorAssessment?.conversionReadiness || '',
      p.doctorAssessment?.tentativeSurgeryDate || '',
      p.doctorAssessment?.doctorSignature || '',

      // Package
      p.packageProposal ? 'Yes' : 'No',
      p.packageProposal?.decisionPattern || '',
      p.packageProposal?.objectionIdentified || '',
      p.packageProposal?.counselingStrategy || '',
      p.packageProposal?.followUpDate || ''
    ].map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `himas_data_${role}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2 no-print">
      <button 
        onClick={handlePrint}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
      >
        <Printer className="w-4 h-4" />
        Print PDF
      </button>
      <button 
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-3 py-2 bg-hospital-600 text-white border border-transparent rounded-md text-sm font-medium hover:bg-hospital-700 shadow-sm"
      >
        <Download className="w-4 h-4" />
        Download All Data
      </button>
    </div>
  );
};