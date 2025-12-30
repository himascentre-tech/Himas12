
import React, { useState } from 'react';
import { Download, Printer, FileSpreadsheet, Filter, Calendar, Activity, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Patient, Condition, SurgeonCode, SurgeryProcedure, ProposalStatus } from '../types';

interface ExportButtonsProps {
  patients: Patient[];
  role: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ patients, role }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [outcomeStartDate, setOutcomeStartDate] = useState('');
  const [outcomeEndDate, setOutcomeEndDate] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [treatmentFilter, setTreatmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let filteredPatients = [...patients];

    // Filter by Date of Presentation (DOP)
    if (startDate) {
      filteredPatients = filteredPatients.filter(p => p.entry_date >= startDate);
    }
    if (endDate) {
      filteredPatients = filteredPatients.filter(p => p.entry_date <= endDate);
    }

    // Filter by Outcome Date (Surgery Fixed/Lost Date)
    if (outcomeStartDate) {
      filteredPatients = filteredPatients.filter(p => (p.packageProposal?.outcomeDate || '') >= outcomeStartDate);
    }
    if (outcomeEndDate) {
      filteredPatients = filteredPatients.filter(p => (p.packageProposal?.outcomeDate || '') <= outcomeEndDate);
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

    // Filter by Proposal Status
    if (statusFilter !== 'ALL') {
      filteredPatients = filteredPatients.filter(p => (p.packageProposal?.status || 'PENDING') === statusFilter);
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
      'Referring Doctor',
      'Condition',
      'Doctor Assessed', 
      'Surgeon Code', 
      'Surgery Procedure',
      'Pain Severity',
      'Affordability',
      'Readiness',
      'Surgery Date',
      'Doctor Signature',
      'Proposal Status',
      'Decision Pattern',
      'Objection',
      'Strategy',
      'Follow Up Date',
      'Outcome Date (Fixed/Lost)'
    ];

    const rows = filteredPatients.map(p => {
      let proc = p.doctorAssessment?.surgeryProcedure || '';
      if (proc === SurgeryProcedure.Others && p.doctorAssessment?.otherSurgeryName) {
        proc = `Other: ${p.doctorAssessment.otherSurgeryName}`;
      }

      return [
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
        p.sourceDoctorName || 'N/A',
        p.condition,
        
        p.doctorAssessment ? 'Yes' : 'No',
        p.doctorAssessment?.quickCode || '',
        proc,
        p.doctorAssessment?.painSeverity || '',
        p.doctorAssessment?.affordability || '',
        p.doctorAssessment?.conversionReadiness || '',
        p.doctorAssessment?.tentativeSurgeryDate || '',
        p.doctorAssessment?.doctorSignature || '',

        p.packageProposal?.status || 'New/Pending',
        p.packageProposal?.decisionPattern || '',
        p.packageProposal?.objectionIdentified || '',
        p.packageProposal?.counselingStrategy || '',
        p.packageProposal?.followUpDate || '',
        p.packageProposal?.outcomeDate || ''
      ].map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `himas_report_${new Date().toISOString().split('T')[0]}.csv`);
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
          className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${showFilters ? 'bg-hospital-50 border-hospital-500 text-hospital-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Report Filters'}
        </button>

        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-hospital-600 text-white border border-transparent rounded-xl text-xs font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-100 transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {showFilters && (
        <div className="absolute top-12 right-0 z-50 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-2">Data Parameters</div>
          
          <div className="space-y-4">
            {/* DOP Date Range */}
            <div>
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3 h-3 text-hospital-500" /> DOP Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg outline-none font-bold" 
                />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg outline-none font-bold" 
                />
              </div>
            </div>

            {/* Outcome Date Range */}
            <div>
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Outcome Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={outcomeStartDate} 
                  onChange={e => setOutcomeStartDate(e.target.value)}
                  className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg outline-none font-bold" 
                />
                <input 
                  type="date" 
                  value={outcomeEndDate} 
                  onChange={e => setOutcomeEndDate(e.target.value)}
                  className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg outline-none font-bold" 
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                <Filter className="w-3 h-3" /> Proposal Status
              </label>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg outline-none font-bold"
              >
                <option value="ALL">All Statuses</option>
                {Object.values(ProposalStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Condition Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                <Activity className="w-3 h-3" /> Clinical Condition
              </label>
              <select 
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg outline-none font-bold"
              >
                <option value="ALL">All Conditions</option>
                {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setOutcomeStartDate('');
                setOutcomeEndDate('');
                setConditionFilter('ALL');
                setTreatmentFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-hospital-600 transition-colors uppercase tracking-widest border border-dashed border-slate-200 rounded-lg hover:border-hospital-200"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
