
import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal, Role, SurgeonCode, ProposalStatus, SurgeryProcedure } from '../types';
import { 
  Briefcase, Calendar, Wand2, Users, Trophy, History, X, 
  Download, ChevronRight, Stethoscope, User, Activity, 
  ShieldCheck, Phone, MapPin, AlertCircle, TrendingUp,
  DollarSign, Clock, XCircle
} from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal } = useHospital();
  
  const [activeTab, setActiveTab] = useState<'counseling' | 'staff'>('counseling');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [counselingFilter, setCounselingFilter] = useState<'PENDING' | 'DUE_FOLLOWUPS' | 'CONVERTED' | 'LOST_LIST' | 'ALL_ACTIVE'>('DUE_FOLLOWUPS');
  
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

  const today = new Date().toISOString().split('T')[0];

  const getProcedureDisplay = (p: Patient) => {
    const assessment = p.doctorAssessment;
    if (!assessment) return 'N/A';
    if (assessment.surgeryProcedure === SurgeryProcedure.Others) {
      return assessment.otherSurgeryName || 'Custom Surgery';
    }
    return assessment.surgeryProcedure || 'N/A';
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
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
      getProcedureDisplay(p),
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
              </div>

              <button onClick={handleDownloadCSV} disabled={filteredPatients.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50">
                <Download className="w-4 h-4" /> Download List ({filteredPatients.length})
              </button>
            </div>
          </div>

          <div className="flex h-[calc(100vh-280px)] gap-6">
            <div className="w-1/3 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Active Candidates</span>
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
                  <div className="p-6 border-b bg-slate-50/50 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100"><User className="w-6 h-6 text-hospital-600" /></div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{selectedPatient.name}</h3>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs font-bold text-slate-500">{selectedPatient.age} yrs • {selectedPatient.gender}</span>
                          <span className="text-xs font-mono font-bold text-hospital-600 bg-hospital-50 px-2 rounded">{selectedPatient.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Doctor Recommendation</span>
                        <span className="bg-hospital-600 text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-lg shadow-hospital-100">{selectedPatient.doctorAssessment?.quickCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 p-4 border-b bg-white">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Source</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-700 truncate">{selectedPatient.source}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Insurance</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-700 truncate">{selectedPatient.hasInsurance}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-3 h-3 text-blue-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Occupation</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-700 truncate">{selectedPatient.occupation || 'N/A'}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-3 h-3 text-purple-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Mobile</span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-slate-700">{selectedPatient.mobile}</div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="bg-slate-50/50 rounded-3xl border border-slate-200 p-6 flex items-center justify-between">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> Initial Presentation (DOP)
                          </label>
                          <div className="text-lg font-black text-slate-800">{new Date(selectedPatient.entry_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
                       </div>
                    </div>

                    <div className="bg-hospital-50/30 rounded-3xl border border-hospital-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Stethoscope className="w-4 h-4 text-hospital-600" />
                        <h4 className="text-xs font-bold text-hospital-700 uppercase tracking-widest">Physician Assessment Detail</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Procedure Recommendation</label>
                          <div className="text-sm font-bold text-slate-800">{getProcedureDisplay(selectedPatient)}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Pain Severity</label>
                          <div className={`text-sm font-bold flex items-center gap-1.5 ${selectedPatient.doctorAssessment?.painSeverity === 'High' ? 'text-red-600' : 'text-amber-600'}`}>
                            <AlertCircle className="w-4 h-4" />
                            {selectedPatient.doctorAssessment?.painSeverity}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Affordability</label>
                          <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" />
                            {selectedPatient.doctorAssessment?.affordability}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decision Pattern</label>
                            <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-4 focus:ring-hospital-50 transition-all" value={proposal.decisionPattern} onChange={e => setProposal({...proposal, decisionPattern: e.target.value})}>
                              <option>Standard</option><option>Quick Decider</option><option>Price Sensitive</option><option>Needs Consult</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Objection</label>
                            <input type="text" className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-4 focus:ring-hospital-50" placeholder="e.g. Cost, Fear..." value={proposal.objectionIdentified} onChange={e => setProposal({...proposal, objectionIdentified: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Counseling Strategy</label>
                            <button onClick={handleGenerateAIStrategy} disabled={aiLoading} className="text-[9px] font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50">
                              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI STRATEGY
                            </button>
                         </div>
                         <textarea className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-700 bg-slate-50/20 outline-none min-h-[100px] focus:ring-4 focus:ring-hospital-50 italic leading-relaxed" value={proposal.counselingStrategy} onChange={e => setProposal({...proposal, counselingStrategy: e.target.value})} placeholder="Draft the patient counseling approach..." />
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Follow-up Date</label>
                         <div className="relative w-64">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input type="date" min={today} className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl font-bold text-slate-700 bg-white outline-none focus:ring-4 focus:ring-hospital-50" value={proposal.followUpDate} onChange={e => setProposal({...proposal, followUpDate: e.target.value})} />
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t bg-slate-50/50 flex flex-wrap gap-3">
                     <button onClick={() => updateStatusAndSave(ProposalStatus.FollowUp)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                       <History className="w-5 h-5" /> Schedule Follow-up
                     </button>
                     <button onClick={() => updateStatusAndSave(ProposalStatus.SurgeryLost)} className="flex-1 py-4 border border-red-100 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                       <XCircle className="w-5 h-5" /> Mark as Lost
                     </button>
                     <button onClick={() => updateStatusAndSave(ProposalStatus.SurgeryFixed)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2">
                       <Trophy className="w-6 h-6" /> SURGERY FIXED!
                     </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-slate-50/20">
                  <div className="bg-white p-8 rounded-full border border-slate-100 shadow-sm mb-6">
                    <Briefcase className="w-20 h-20 text-hospital-400 opacity-20" />
                  </div>
                  <p className="text-xl font-bold text-slate-400 tracking-tight">Pipeline Manager Ready</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest mt-2 text-slate-300 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">Select a candidate to view physician insights and begin counseling</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white p-20 rounded-3xl border border-slate-100 shadow-sm text-center">
           <Users className="w-20 h-20 mx-auto text-purple-600 opacity-20 mb-6" />
           <p className="font-bold text-2xl text-slate-800">Staff Management Console</p>
           <p className="text-sm text-slate-400 mt-2 font-medium">Internal directory and access management tools coming soon...</p>
        </div>
      )}
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
