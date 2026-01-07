
import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal, Role, SurgeonCode, ProposalStatus, SurgeryProcedure } from '../types';
import { 
  Briefcase, Calendar, Wand2, Users, Trophy, History, X, 
  Download, ChevronRight, Stethoscope, User, Activity, 
  ShieldCheck, Phone, MapPin, AlertCircle, TrendingUp,
  DollarSign, Clock, XCircle, Info, CheckCircle2,
  Globe, Briefcase as OccupationIcon
} from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal } = useHospital();
  
  const [activeTab, setActiveTab] = useState<'counseling' | 'staff'>('counseling');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [counselingFilter, setCounselingFilter] = useState<'PENDING' | 'DUE_FOLLOWUPS' | 'CONVERTED' | 'LOST_LIST' | 'ALL_ACTIVE'>('DUE_FOLLOWUPS');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [aiLoading, setAiLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // States for Lost Reason Modal
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [lostOtherNote, setLostOtherNote] = useState('');

  const [proposal, setProposal] = useState<Partial<PackageProposal>>({
    decisionPattern: 'Standard',
    objectionIdentified: '',
    counselingStrategy: '',
    followUpDate: '',
    status: ProposalStatus.Pending
  });

  const today = new Date().toISOString().split('T')[0];

  // Standard Date helper (YYYY-MM-DD)
  const getISODate = () => new Date().toISOString().split('T')[0];
  
  // Display helper for IST time (Visual only)
  const getISTDisplayTime = () => {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

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
      // 1. Basic eligibility: Patient must have an assessment that isn't Medication Only
      if (!p.doctorAssessment || p.doctorAssessment.quickCode === SurgeonCode.M1) return false;

      const status = p.packageProposal?.status || ProposalStatus.Pending;
      let matchesTab = false;
      let targetDate = '';

      // 2. Tab Selection Logic
      if (counselingFilter === 'PENDING') {
        matchesTab = status === ProposalStatus.Pending;
        targetDate = p.entry_date;
      } else if (counselingFilter === 'DUE_FOLLOWUPS') {
        matchesTab = status === ProposalStatus.FollowUp;
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

      // 3. Date Filtering
      if (targetDate) {
        if (startDate && targetDate < startDate) return false;
        if (endDate && targetDate > endDate) return false;
      } else if (startDate || endDate) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.packageProposal?.followUpDate || a.entry_date;
      const dateB = b.packageProposal?.followUpDate || b.entry_date;
      return dateB.localeCompare(dateA);
    });
  }, [patients, counselingFilter, today, startDate, endDate]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
    setValidationError(null);
    setProposal(p.packageProposal || {
      decisionPattern: 'Standard',
      objectionIdentified: '',
      counselingStrategy: '',
      followUpDate: '',
      status: ProposalStatus.Pending
    });
  };

  const validateAction = (status: ProposalStatus) => {
    setValidationError(null);
    
    if (status === ProposalStatus.FollowUp) {
      if (!proposal.followUpDate) {
        setValidationError("Please select a follow-up date");
        return false;
      }
    }

    if (status === ProposalStatus.SurgeryFixed) {
      if (!proposal.outcomeDate) {
        setValidationError("Please select a valid Surgery Date before fixing");
        return false;
      }
      if (proposal.outcomeDate < today) {
        setValidationError("Surgery date cannot be in the past");
        return false;
      }
    }

    return true;
  };

  const handleAction = async (newStatus: ProposalStatus) => {
    if (!selectedPatient) return;
    
    if (newStatus === ProposalStatus.SurgeryLost) {
      setShowLostModal(true);
      return;
    }

    if (!validateAction(newStatus)) return;

    const isoDate = getISODate();
    const istDisplay = getISTDisplayTime();
    const isClosing = newStatus === ProposalStatus.SurgeryFixed;
    
    await updatePackageProposal(selectedPatient.id, {
      ...proposal as PackageProposal,
      status: newStatus,
      proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString(),
      lastFollowUpAt: istDisplay,
      outcomeDate: isClosing ? proposal.outcomeDate : (proposal.outcomeDate || isoDate)
    });
    
    setSelectedPatient(null);
  };

  const handleConfirmLost = async () => {
    if (!lostReason || (lostReason === 'Other' && !lostOtherNote.trim())) {
      return;
    }

    const isoDate = getISODate();
    const istDisplay = getISTDisplayTime();
    const finalReason = lostReason === 'Other' ? `Other: ${lostOtherNote}` : lostReason;
    
    await updatePackageProposal(selectedPatient!.id, {
      ...proposal as PackageProposal,
      status: ProposalStatus.SurgeryLost,
      objectionIdentified: finalReason,
      proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString(),
      outcomeDate: isoDate,
      lastFollowUpAt: istDisplay
    });

    setShowLostModal(false);
    setLostReason('');
    setLostOtherNote('');
    setSelectedPatient(null);
  };

  const handleGenerateAIStrategy = async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    const strategy = await generateCounselingStrategy(selectedPatient);
    setProposal(prev => ({ ...prev, counselingStrategy: strategy }));
    setAiLoading(false);
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
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100 overflow-x-auto">
              <button onClick={() => setCounselingFilter('PENDING')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'PENDING' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                <Clock className="w-4 h-4" /> New Candidates
              </button>
              <button onClick={() => setCounselingFilter('DUE_FOLLOWUPS')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'DUE_FOLLOWUPS' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
                <Calendar className="w-4 h-4" /> All Follow-ups
              </button>
              <button onClick={() => setCounselingFilter('CONVERTED')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'CONVERTED' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                <Trophy className="w-4 h-4" /> Surgery Fixed
              </button>
              <button onClick={() => setCounselingFilter('LOST_LIST')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'LOST_LIST' ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                <XCircle className="w-4 h-4" /> Surgery Lost List
              </button>
            </div>
            
            <div className="flex gap-3">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs p-2 border rounded-xl" placeholder="From" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs p-2 border rounded-xl" placeholder="To" />
            </div>
          </div>

          <div className="flex h-[calc(100vh-280px)] gap-6">
            <div className="w-1/3 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Clinical Conversion List</span>
                <span className="bg-white border text-slate-600 px-2 py-0.5 rounded-full">{filteredPatients.length}</span>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-3">
                {filteredPatients.map(p => (
                  <div key={p.id} onClick={() => handlePatientSelect(p)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedPatient?.id === p.id ? 'border-hospital-500 bg-hospital-50 shadow-md ring-4 ring-hospital-50' : 'border-transparent bg-slate-50/50 hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-slate-800 truncate text-sm">{p.name}</div>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${p.packageProposal?.status === ProposalStatus.SurgeryFixed ? 'bg-emerald-100 text-emerald-600' : p.packageProposal?.status === ProposalStatus.SurgeryLost ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {p.packageProposal?.status || 'New'}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 flex flex-wrap gap-2">
                      <span className="text-hospital-600 uppercase">{p.condition}</span>
                      <span>•</span>
                      <span>ID: {p.id}</span>
                    </div>
                  </div>
                ))}
                {filteredPatients.length === 0 && <div className="p-12 text-center text-slate-300 italic text-sm">No records match filters</div>}
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
                          <span className="text-xs font-mono font-bold text-hospital-600 bg-hospital-50 px-2 rounded">{selectedPatient.condition}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Doctor Recommendation</span>
                      <span className="bg-hospital-600 text-white px-3 py-1 rounded-lg text-[10px] font-black">{selectedPatient.doctorAssessment?.quickCode}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Key Attributes Summary */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          <Globe className="w-3 h-3" /> Source
                        </label>
                        <div className="text-xs font-black text-slate-800 truncate">{selectedPatient.source || 'N/A'}</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          <ShieldCheck className="w-3 h-3" /> Insurance
                        </label>
                        <div className="text-xs font-black text-slate-800">{selectedPatient.hasInsurance || 'N/A'}</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          <OccupationIcon className="w-3 h-3" /> Occupation
                        </label>
                        <div className="text-xs font-black text-slate-800 truncate">{selectedPatient.occupation || 'N/A'}</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          <Phone className="w-3 h-3" /> Mobile
                        </label>
                        <div className="text-xs font-black text-slate-800">{selectedPatient.mobile || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="bg-hospital-50/40 rounded-3xl border border-hospital-100 p-6">
                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Procedure Recommendation</label>
                          <div className="text-sm font-black text-slate-800">{getProcedureDisplay(selectedPatient)}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pain Severity</label>
                          <div className="text-sm font-black text-amber-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {selectedPatient.doctorAssessment?.painSeverity}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Affordability</label>
                          <div className="text-sm font-black text-emerald-600 flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> {selectedPatient.doctorAssessment?.affordability}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decision Pattern</label>
                            <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 bg-white outline-none focus:border-hospital-500" value={proposal.decisionPattern} onChange={e => setProposal({...proposal, decisionPattern: e.target.value})}>
                              <option>Standard</option><option>Price Sensitive</option><option>Needs Consult</option><option>Quick Conversion</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Objection</label>
                            <input type="text" className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 bg-white outline-none focus:border-hospital-500" placeholder="e.g. Cost, Fear..." value={proposal.objectionIdentified} onChange={e => setProposal({...proposal, objectionIdentified: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Counseling Strategy</label>
                            <button onClick={handleGenerateAIStrategy} disabled={aiLoading} className="text-[9px] font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50">
                              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI STRATEGY
                            </button>
                         </div>
                         <textarea className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-700 bg-slate-50/20 outline-none min-h-[120px] focus:border-hospital-500" value={proposal.counselingStrategy} onChange={e => setProposal({...proposal, counselingStrategy: e.target.value})} placeholder="Draft the patient counseling approach..." />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                             <Calendar className="w-3 h-3" /> Next Follow-up Date *
                           </label>
                           <input type="date" min={today} className={`w-full p-3 border-2 rounded-xl font-bold text-slate-700 outline-none ${validationError?.includes('follow-up') ? 'border-red-300 bg-red-50' : 'border-slate-100 focus:border-hospital-500'}`} value={proposal.followUpDate} onChange={e => { setProposal({...proposal, followUpDate: e.target.value}); setValidationError(null); }} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                             <CheckCircle2 className="w-3 h-3" /> Surgery Date (Fixed Only) *
                           </label>
                           <input type="date" min={today} className={`w-full p-3 border-2 rounded-xl font-bold text-emerald-700 outline-none ${validationError?.includes('Surgery Date') ? 'border-red-300 bg-red-50' : 'border-emerald-100 focus:border-emerald-500'}`} value={proposal.outcomeDate || ''} onChange={e => { setProposal({...proposal, outcomeDate: e.target.value}); setValidationError(null); }} />
                        </div>
                      </div>
                    </div>
                    
                    {validationError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-pulse">
                        <AlertCircle className="w-5 h-5" />
                        {validationError}
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t bg-slate-50/50 flex flex-wrap gap-3">
                     <button onClick={() => handleAction(ProposalStatus.FollowUp)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                       <History className="w-5 h-5" /> Schedule Follow-up
                     </button>
                     <button onClick={() => handleAction(ProposalStatus.SurgeryLost)} className="flex-1 py-4 border border-red-100 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                       <XCircle className="w-5 h-5" /> Mark as Lost
                     </button>
                     <button onClick={() => handleAction(ProposalStatus.SurgeryFixed)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2">
                       <Trophy className="w-6 h-6" /> SURGERY FIXED!
                     </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-slate-50/20">
                  <div className="bg-white p-8 rounded-full border border-slate-100 shadow-sm mb-6">
                    <Briefcase className="w-20 h-20 text-hospital-400 opacity-20" />
                  </div>
                  <p className="text-xl font-bold text-slate-400 tracking-tight">Select Candidate to Continue</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest mt-2 text-slate-300">Detailed counselor dashboard will load here upon selection</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white p-20 rounded-3xl border border-slate-100 shadow-sm text-center">
           <Users className="w-20 h-20 mx-auto text-purple-600 opacity-20 mb-6" />
           <p className="font-bold text-2xl text-slate-800">Staff Management Console</p>
           <p className="text-sm text-slate-400 mt-2 font-medium">Coming soon...</p>
        </div>
      )}

      {/* Mark as Lost Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-red-900">Patient File Closing: LOST</h3>
              </div>
              <button onClick={() => setShowLostModal(false)} className="p-2 hover:bg-red-100 rounded-full"><X className="w-5 h-5 text-red-400" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Select Primary Reason for Loss *</label>
                <div className="space-y-3">
                  {[
                    "Cost issue",
                    "Patient not ready",
                    "Fear / second opinion",
                    "Chose another hospital",
                    "Other"
                  ].map(reason => (
                    <label key={reason} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${lostReason === reason ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-slate-100 hover:border-slate-200'}`}>
                      <input type="radio" className="hidden" name="lostReason" value={reason} checked={lostReason === reason} onChange={() => setLostReason(reason)} />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${lostReason === reason ? 'border-red-500' : 'border-slate-300'}`}>
                        {lostReason === reason && <div className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <span className="text-sm">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(lostReason === 'Other' || lostReason) && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Additional Notes / Reason Details *</label>
                  <textarea 
                    className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-4 focus:ring-red-50"
                    placeholder="Enter the reason for surgery loss..."
                    rows={3}
                    value={lostOtherNote}
                    onChange={e => setLostOtherNote(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 flex gap-4">
              <button onClick={() => setShowLostModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
              <button 
                onClick={handleConfirmLost}
                disabled={!lostReason || (lostReason === 'Other' && !lostOtherNote.trim())}
                className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-30"
              >
                Confirm Surgery Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
