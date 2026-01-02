
import { Patient, Condition, SurgeonCode, SurgeryProcedure, ProposalStatus } from '../types';
import React, { useState } from 'react';
import { Download, Printer, FileSpreadsheet, Filter, Calendar, Activity, ClipboardList, CheckCircle2 } from 'lucide-react';

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

    if (startDate) filteredPatients = filteredPatients.filter(p => p.entry_date >= startDate);
    if (endDate) filteredPatients = filteredPatients.filter(p => p.entry_date <= endDate);
    if (outcomeStartDate) filteredPatients = filteredPatients.filter(p => (p.packageProposal?.outcomeDate || '') >= outcomeStartDate);
    if (outcomeEndDate) filteredPatients = filteredPatients.filter(p => (p.packageProposal?.outcomeDate || '') <= outcomeEndDate);
    if (conditionFilter !== 'ALL') filteredPatients = filteredPatients.filter(p => p.condition === conditionFilter);
    if (treatmentFilter !== 'ALL') {
      filteredPatients = filteredPatients.filter(p => {
        const code = p.doctorAssessment?.quickCode;
        if (treatmentFilter === 'M1') return code === SurgeonCode.M1;
        if (treatmentFilter === 'S1') return code === SurgeonCode.S1;
        return true;
      });
    }
    if (statusFilter !== 'ALL') filteredPatients = filteredPatients.filter(p => (p.packageProposal?.status || 'PENDING') === statusFilter);

    const headers = [
      'File Registration No', 'Name', 'Entry Date (DOP)', 'Gender', 'Age', 'Phone Number', 
      'Condition', 'Surgeon Code', 'Surgery Procedure', 'Proposal Status', 
      'Follow Up Visit Date', 'Next Follow Up Date', 'Outcome Date', 'Surgery Fixed Date', 'Surgery Lost Date'
    ];

    const rows = filteredPatients.map(p => {
      let proc = p.doctorAssessment?.surgeryProcedure || '';
      if (proc === SurgeryProcedure.Others && p.doctorAssessment?.otherSurgeryName) {
        proc = `Other: ${p.doctorAssessment.otherSurgeryName}`;
      }

      const status = p.packageProposal?.status;
      const outcomeDate = p.packageProposal?.outcomeDate || '';

      return [
        p.id, p.name, p.entry_date || '', p.gender, p.age, p.mobile, p.condition,
        p.doctorAssessment?.quickCode || '', proc, status || 'New',
        p.lastFollowUpVisitDate || '', p.packageProposal?.followUpDate || '', outcomeDate,
        status === ProposalStatus.SurgeryFixed ? outcomeDate : '',
        status === ProposalStatus.SurgeryLost ? outcomeDate : ''
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
        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"><Printer className="w-4 h-4" /> Print</button>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-hospital-600 text-white border border-transparent rounded-xl text-xs font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-100 transition-all active:scale-95"><FileSpreadsheet className="w-4 h-4" /> Export CSV</button>
      </div>

      {showFilters && (
        <div className="absolute top-12 right-0 z-50 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-2">Filters</div>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider"><Calendar className="w-3 h-3 text-hospital-500" /> DOP Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg font-bold" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg font-bold" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Outcome Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={outcomeStartDate} onChange={e => setOutcomeStartDate(e.target.value)} className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg font-bold" />
                <input type="date" value={outcomeEndDate} onChange={e => setOutcomeEndDate(e.target.value)} className="w-full text-[10px] p-2 bg-slate-50 border rounded-lg font-bold" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider"><Filter className="w-3 h-3" /> Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full text-xs p-2 bg-slate-50 border rounded-lg font-bold">
                <option value="ALL">All Statuses</option>
                {Object.values(ProposalStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => { setStartDate(''); setEndDate(''); setOutcomeStartDate(''); setOutcomeEndDate(''); setConditionFilter('ALL'); setStatusFilter('ALL'); }} className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-hospital-600 transition-colors uppercase border border-dashed rounded-lg">Clear All</button>
        </div>
      )}
    </div>
  );
};
