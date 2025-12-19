
import React, { useState } from 'react';
import { Download, Printer, FileSpreadsheet, Filter, Calendar, Activity, ClipboardList } from 'lucide-react';
import { Patient, Condition, SurgeonCode } from '../types';

interface ExportButtonsProps {
  patients: Patient[];
  role: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ patients, role }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [treatmentFilter, setTreatmentFilter] = useState<string>('ALL');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let filteredPatients = [...patients];

    // Filter by Date Range (DOP)
    if (startDate) {
      filteredPatients = filteredPatients.filter(p => p.entry_date >= startDate);
    }
    if (endDate) {
      filteredPatients = filteredPatients.filter(p => p.entry_date <= endDate);
    }

    // Filter by Condition
    if (conditionFilter !== 'ALL') {
      filteredPatients = filteredPatients.filter(p => p.condition === conditionFilter);
    }

    // Filter by Treatment Category (M1/S1)
    if (treatmentFilter !== 'ALL') {
      filteredPatients = filteredPatients.filter(p => {
        const code = p.doctorAssessment?.quickCode;
        if (treatmentFilter === 'M1') return code === SurgeonCode.M1;
        if (treatmentFilter === 'S1') return code === SurgeonCode.S1;
        return true;
      });
    }

    const headers = [
      'File Registration No', 
      'Name', 
      'DOB',
      'Entry Date (DOP)',
      'Gender', 
      'Age', 
      'Phone Number', 
      'Occupation',
      'Insurance',
      'Insurance Provider',
      'Source',
      'Condition',
      'Doctor Assessed', 
      'Surgeon Code', 
      'Pain Severity',
      'Affordability',
      'Readiness',
      'Surgery Date',
      'Doctor Signature',
      'Proposal Created', 
      'Decision Pattern',
      'Objection',
      'Strategy',
      'Follow Up Date'
    ];

    const rows = filteredPatients.map(p => [
      p.id,
      p.name,
      p.dob || '',
      p.entry_date || '',
      p.gender,
      p.age,
      p.mobile,
      p.occupation || '',
      p.hasInsurance,
      p.insuranceName || 'N/A',
      p.source,
      p.condition,
      
      p.doctorAssessment ? 'Yes' : 'No',
      p.doctorAssessment?.quickCode || '',
      p.doctorAssessment?.painSeverity || '',
      p.doctorAssessment?.affordability || '',
      p.doctorAssessment?.conversionReadiness || '',
      p.doctorAssessment?.tentativeSurgeryDate || '',
      p.doctorAssessment?.doctorSignature || '',

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
    link.setAttribute('download', `himas_report_${conditionFilter}_${treatmentFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-end gap-3 no-print relative">
      <div className="flex gap-2">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition-colors ${showFilters ? 'bg-hospital-50 border-hospital-500 text-hospital-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Filter Report'}
        </button>

        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 bg-hospital-600 text-white border border-transparent rounded-md text-sm font-medium hover:bg-hospital-700 shadow-sm transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {showFilters && (
        <div className="absolute top-12 right-0 z-30 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-2">Report Parameters</div>
          
          <div className="space-y-3">
            {/* Date Range */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1">
                <Calendar className="w-3 h-3" /> DOP RANGE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-[10px] p-1.5 border rounded-lg focus:ring-1 focus:ring-hospital-500 outline-none" 
                />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-[10px] p-1.5 border rounded-lg focus:ring-1 focus:ring-hospital-500 outline-none" 
                />
              </div>
            </div>

            {/* Condition Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1">
                <Activity className="w-3 h-3" /> BY CONDITION
              </label>
              <select 
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-hospital-500 outline-none"
              >
                <option value="ALL">All Conditions</option>
                {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Treatment Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1">
                <ClipboardList className="w-3 h-3" /> TREATMENT TYPE
              </label>
              <select 
                value={treatmentFilter}
                onChange={e => setTreatmentFilter(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-hospital-500 outline-none"
              >
                <option value="ALL">All (Medication & Packages)</option>
                <option value="M1">Medication Only (M1)</option>
                <option value="S1">Surgery Packages (S1)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setConditionFilter('ALL');
                setTreatmentFilter('ALL');
              }}
              className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
