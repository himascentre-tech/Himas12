
import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal, Role, SurgeonCode, ProposalStatus, SurgeryProcedure } from '../types';
import { Briefcase, Calendar, AlertTriangle, Wand2, CheckCircle2, UserPlus, Users, BadgeCheck, Mail, Phone, User, Lock, Clock, Filter, Search, ArrowRight, XCircle, Trophy, History, X, Download, FileSpreadsheet, ChevronRight } from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal, staffUsers, registerStaff } = useHospital();
  
  // Tabs: 'counseling' | 'staff'
  const [activeTab, setActiveTab] = useState<'counseling' | 'staff'>('counseling');

  // --- Counseling Dashboard State ---
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [counselingFilter, setCounselingFilter] = useState<'PENDING' | 'DUE_FOLLOWUPS' | 'CONVERTED' | 'LOST_LIST' | 'ALL_ACTIVE'>('DUE_FOLLOWUPS');
  
  // Filtering Logic
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [aiLoading, setAiLoading] = useState(false);
  const [proposal, setProposal] = useState<Partial<PackageProposal>>({
    decisionPattern: 'Standard',
    objectionIdentified: '',
    counselingStrategy: '',
    followUpDate: '',
    status: ProposalStatus.Pending
  });

  // --- Staff Registration State ---
  const [newStaff, setNewStaff] = useState<{name: string, email: string, mobile: string, role: Role, password: string}>({
    name: '',
    email: '',
    mobile: '',
    role: 'FRONT_OFFICE',
    password: ''
  });
  const [staffSuccess, setStaffSuccess] = useState('');

  // --- Logic ---
  const today = new Date().toISOString().split('T')[0];

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Only surgical candidates (S1)
      if (!p.doctorAssessment || p.doctorAssessment.quickCode === SurgeonCode.M1) return false;

      const status = p.packageProposal?.status || ProposalStatus.Pending;
      let matchesTab = false;
      let targetDate = '';

      if (counselingFilter === 'PENDING') {
        matchesTab = status === ProposalStatus.Pending;
        targetDate = p.entry_date;
      } else if (counselingFilter === 'DUE_FOLLOWUPS') {
        matchesTab = status === ProposalStatus.FollowUp && (p.packageProposal?.followUpDate || '') <= today;
        targetDate = p.packageProposal?.followUpDate || '';
      } else if (counselingFilter === 'CONVERTED') {
        matchesTab = status === ProposalStatus.SurgeryFixed;
        targetDate = p.packageProposal?.outcomeDate || '';
      } else if (counselingFilter === 'LOST_LIST') {
        matchesTab = status === ProposalStatus.SurgeryLost;
        targetDate = p.packageProposal?.outcomeDate || '';
      } else if (counselingFilter === 'ALL_ACTIVE') {
        matchesTab = status === ProposalStatus.Pending || status === ProposalStatus.FollowUp;
        targetDate = p.entry_date;
      }

      if (!matchesTab) return false;

      // Date Range
      if (startDate && targetDate < startDate) return false;
      if (endDate && targetDate > endDate) return false;

      return true;
    }).sort((a, b) => {
      const dateA = a.packageProposal?.followUpDate || a.entry_date;
      const dateB = b.packageProposal?.followUpDate || b.entry_date;
      return dateB.localeCompare(dateA);
    });
  }, [patients, counselingFilter, today, startDate, endDate]);

  const handleDownloadCSV = () => {
    if (filteredPatients.length === 0) return;
    const headers = ['File ID', 'Name', 'Condition', 'DOP', 'Age', 'Mobile', 'Status', 'Procedure', 'Outcome Date'];
    const rows = filteredPatients.map(p => [
      p.id, p.name, p.condition, p.entry_date, p.age, p.mobile,
      p.packageProposal?.status || 'Pending',
      p.doctorAssessment?.surgeryProcedure || 'N/A',
      p.packageProposal?.outcomeDate || 'N/A'
    ].map(cell => `"${cell}"`).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HIMAS_${counselingFilter}_List.csv`;
    link.click();
  };

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
    setProposal(p.packageProposal || {
      decisionPattern: 'Standard',
      objectionIdentified: '',
      counselingStrategy: '',
      followUpDate: '',
      status: ProposalStatus.Pending
    });
  };

  const handleGenerateAIStrategy = async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    const strategy = await generateCounselingStrategy(selectedPatient);
    setProposal(prev => ({ ...prev, counselingStrategy: strategy }));
    setAiLoading(false);
  };

  const updateStatusAndSave = (newStatus: ProposalStatus) => {
    if (selectedPatient) {
      const isClosing = newStatus === ProposalStatus.SurgeryFixed || newStatus === ProposalStatus.SurgeryLost;
      updatePackageProposal(selectedPatient.id, {
        ...proposal as PackageProposal,
        status: newStatus,
        proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString(),
        outcomeDate: isClosing ? today : proposal.outcomeDate
      });
      setSelectedPatient(null);
    }
  };

  const handleRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.mobile || !newStaff.role || !newStaff.email || !newStaff.password) return;
    registerStaff(newStaff);
    setStaffSuccess(`Registered ${newStaff.name}`);
    setNewStaff({ name: '', email: '', mobile: '', role: 'FRONT_OFFICE', password: '' });
    setTimeout(() => setStaffSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Counseling Operations</h2>
          <p className="text-gray-500 text-sm">Managing patient conversion pipeline</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border shadow-sm">
          <button onClick={() => setActiveTab('counseling')} className={`px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === 'counseling' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Briefcase className="w-4 h-4" /> Pipeline
          </button>
          <button onClick={() => setActiveTab('staff')} className={`px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === 'staff' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Users className="w-4 h-4" /> Staff
          </button>
        </div>
      </div>

      {activeTab === 'counseling' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100 overflow-x-auto">
                <button onClick={() => setCounselingFilter('PENDING')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'PENDING' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                  <Clock className="w-4 h-4" /> New Candidates
                </button>
                <button onClick={() => setCounselingFilter('DUE_FOLLOWUPS')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'DUE_FOLLOWUPS' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
                  <Calendar className="w-4 h-4" /> Due Follow-ups
                </button>
                <button onClick={() => setCounselingFilter('CONVERTED')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'CONVERTED' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                  <Trophy className="w-4 h-4" /> Surgery Fixed
                </button>
                <button onClick={() => setCounselingFilter('LOST_LIST')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'LOST_LIST' ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                  <XCircle className="w-4 h-4" /> Surgery Lost List
                </button>
                <div className="w-px h-6 bg-slate-200 self-center" />
                <button onClick={() => setCounselingFilter('ALL_ACTIVE')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'ALL_ACTIVE' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
                  <Filter className="w-4 h-4" /> All Active
                </button>
              </div>

              <button onClick={handleDownloadCSV} disabled={filteredPatients.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50">
                <Download className="w-4 h-4" /> Download This List ({filteredPatients.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   Filter by {counselingFilter.includes('FOLLOWUP') ? 'Follow-up' : counselingFilter.includes('ALL') || counselingFilter.includes('PENDING') ? 'DOP' : 'Outcome'}:
                 </span>
                 <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border">
                    <input type="date" className="text-xs p-1 bg-transparent border-none outline-none font-bold text-slate-600" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <span className="text-slate-300">-</span>
                    <input type="date" className="text-xs p-1 bg-transparent border-none outline-none font-bold text-slate-600" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    {(startDate || endDate) && <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 hover:bg-white rounded-lg"><X className="w-3 h-3 text-slate-400" /></button>}
                 </div>
               </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-320px)] gap-6">
            <div className="w-1/3 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Current Queue</span>
                <span className="bg-white border text-slate-600 px-2 py-0.5 rounded-full">{filteredPatients.length} Patients</span>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-3">
                {filteredPatients.map(p => (
                  <div key={p.id} onClick={() => handlePatientSelect(p)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedPatient?.id === p.id ? 'border-hospital-500 bg-hospital-50 shadow-md ring-4 ring-hospital-50' : 'border-transparent bg-slate-50/50 hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-slate-800 truncate">{p.name}</div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${p.packageProposal?.status === ProposalStatus.SurgeryFixed ? 'bg-emerald-100 text-emerald-600' : p.packageProposal?.status === ProposalStatus.SurgeryLost ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{p.packageProposal?.status || 'New'}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 flex flex-wrap gap-2">
                      <span className="text-hospital-600 uppercase">{p.condition}</span>
                      <span>•</span>
                      <span>DOP: {p.entry_date}</span>
                    </div>
                  </div>
                ))}
                {filteredPatients.length === 0 && <div className="p-12 text-center text-slate-300 italic text-sm">No results found</div>}
              </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              {selectedPatient ? (
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b bg-slate-50/50 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100"><User className="w-5 h-5 text-hospital-600" /></div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedPatient.name}</h3>
                      </div>
                      <div className="flex gap-4 text-xs font-bold text-slate-500">
                        <span>{selectedPatient.age} Yrs • {selectedPatient.gender}</span>
                        <span>•</span>
                        <span className="text-hospital-600 uppercase">{selectedPatient.condition}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Doc Code</span>
                       <span className="bg-hospital-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-hospital-100">{selectedPatient.doctorAssessment?.quickCode}</span>
                    </div>
                  </div>

                  <form className="flex-1 overflow-y-auto p-8 space-y-8" onSubmit={e => e.preventDefault()}>
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decision Pattern</label>
                          <select className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 bg-slate-50/30 outline-none focus:ring-4 focus:ring-hospital-50 transition-all appearance-none" value={proposal.decisionPattern} onChange={e => setProposal({...proposal, decisionPattern: e.target.value})}>
                            <option>Standard</option><option>Quick Decider</option><option>Price Sensitive</option><option>Needs Consult</option>
                          </select>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Objection</label>
                          <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 bg-slate-50/30 outline-none focus:ring-4 focus:ring-hospital-50" placeholder="e.g. Cost, Fear..." value={proposal.objectionIdentified} onChange={e => setProposal({...proposal, objectionIdentified: e.target.value})} />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Counseling Strategy</label>
                          <button onClick={handleGenerateAIStrategy} disabled={aiLoading} className="text-[10px] font-bold bg-slate-900 text-white px-3 py-1 rounded-lg flex items-center gap-2 disabled:opacity-50">
                            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI refresh
                          </button>
                       </div>
                       <textarea className="w-full border-2 border-slate-100 rounded-3xl p-6 font-medium text-slate-700 bg-slate-50/30 outline-none min-h-[120px] focus:ring-4 focus:ring-hospital-50 italic" value={proposal.counselingStrategy} onChange={e => setProposal({...proposal, counselingStrategy: e.target.value})} />
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Follow-up Date</label>
                       <input type="date" min={today} className="w-64 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 bg-slate-50/30 outline-none" value={proposal.followUpDate} onChange={e => setProposal({...proposal, followUpDate: e.target.value})} />
                    </div>

                    <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-4">
                       <button onClick={() => updateStatusAndSave(ProposalStatus.FollowUp)} className="py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all">Schedule Follow-up</button>
                       <button onClick={() => updateStatusAndSave(ProposalStatus.SurgeryLost)} className="py-4 border-2 border-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all">Mark as Lost</button>
                       <button onClick={() => updateStatusAndSave(ProposalStatus.SurgeryFixed)} className="py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">Surgery Fixed!</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-slate-50/20">
                  <Briefcase className="w-20 h-20 opacity-20 mb-6" />
                  <p className="text-xl font-bold text-slate-400">Pipeline Manager</p>
                  <p className="text-xs uppercase font-bold tracking-widest mt-2">Select a patient candidate to begin conversion steps</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
           <Users className="w-16 h-16 mx-auto text-purple-600 opacity-20 mb-4" />
           <p className="font-bold text-slate-800">Staff Management Console</p>
           <p className="text-sm text-slate-500 mt-2">Internal directory and access management tools</p>
        </div>
      )}
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
