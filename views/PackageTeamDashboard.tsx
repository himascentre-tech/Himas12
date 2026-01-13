import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal, SurgeonCode, ProposalStatus, SurgeryProcedure } from '../types';
import { 
  Briefcase, Calendar, Wand2, Users, Trophy, History, X, 
  Download, ChevronRight, Stethoscope, User, Activity, 
  ShieldCheck, Phone, MapPin, AlertCircle, TrendingUp,
  DollarSign, Clock, XCircle, Info, CheckCircle2,
  Globe, Loader2, CreditCard, Syringe, ClipboardCheck, BedDouble, Stethoscope as FollowUpIcon,
  FileCheck, ChevronLeft, ChevronRight as ChevronRightIcon,
  List, ChevronDown, ChevronUp, AlertTriangle, CalendarDays
} from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal } = useHospital();
  
  const [activeTab, setActiveTab] = useState<'counseling' | 'staff'>('counseling');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [counselingFilter, setCounselingFilter] = useState<'PENDING' | 'DUE_FOLLOWUPS' | 'CONVERTED' | 'LOST_LIST' | 'ALL_ACTIVE'>('DUE_FOLLOWUPS');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [aiLoading, setAiLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // States for Modals
  const [showLostModal, setShowLostModal] = useState(false);
  const [showFinalLostConfirm, setShowFinalLostConfirm] = useState(false);
  const [showSurgeryDateModal, setShowSurgeryDateModal] = useState(false);
  const [showFollowUpDateModal, setShowFollowUpDateModal] = useState(false);
  
  const [lostReason, setLostReason] = useState('');
  const [lostOtherNote, setLostOtherNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState<ProposalStatus | null>(null);

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const [proposal, setProposal] = useState<Partial<PackageProposal>>({
    decisionPattern: '',
    objectionIdentified: '',
    counselingStrategy: '',
    followUpDate: '',
    status: ProposalStatus.Pending,
    paymentMode: undefined,
    insuranceDocShared: undefined,
    preOpInvestigation: undefined,
    surgeryMedicines: undefined,
    icuCharges: undefined,
    roomType: undefined,
    postOpFollowUp: undefined,
    equipment: []
  });

  const today = new Date().toISOString().split('T')[0];

  const getISODate = () => new Date().toISOString().split('T')[0];
  const getISTDisplayTime = () => {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
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
    setProposal({
      decisionPattern: '',
      objectionIdentified: '',
      counselingStrategy: '',
      followUpDate: '',
      status: ProposalStatus.Pending,
      paymentMode: undefined,
      insuranceDocShared: undefined,
      preOpInvestigation: undefined,
      surgeryMedicines: undefined,
      icuCharges: undefined,
      roomType: undefined,
      postOpFollowUp: undefined,
      equipment: [],
      ...p.packageProposal
    });
    // On mobile, auto-collapse sidebar once selected to focus on form
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  };

  const handleActionClick = (newStatus: ProposalStatus) => {
    if (!selectedPatient) return;
    
    if (newStatus === ProposalStatus.SurgeryLost) {
      setShowLostModal(true);
      return;
    }

    if (newStatus === ProposalStatus.SurgeryFixed) {
      setPendingStatus(newStatus);
      setShowSurgeryDateModal(true);
      return;
    }

    if (newStatus === ProposalStatus.FollowUp) {
      setPendingStatus(newStatus);
      setShowFollowUpDateModal(true);
      return;
    }

    executeAction(newStatus);
  };

  const executeAction = async (newStatus: ProposalStatus, dateOverride?: string) => {
    if (!selectedPatient) return;

    const isoDate = getISODate();
    const istDisplay = getISTDisplayTime();
    
    let finalOutcomeDate = proposal.outcomeDate || isoDate;
    let finalFollowUpDate = proposal.followUpDate || '';

    if (newStatus === ProposalStatus.SurgeryFixed || newStatus === ProposalStatus.SurgeryLost) {
      finalOutcomeDate = dateOverride || isoDate;
    } else if (newStatus === ProposalStatus.FollowUp) {
      finalFollowUpDate = dateOverride || '';
    }

    const updatedProposal: PackageProposal = {
      ...proposal as PackageProposal,
      status: newStatus,
      proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString(),
      lastFollowUpAt: istDisplay,
      outcomeDate: finalOutcomeDate,
      followUpDate: finalFollowUpDate
    };

    try {
      await updatePackageProposal(selectedPatient.id, updatedProposal);
      
      let successMsg = "Action completed successfully!";
      if (newStatus === ProposalStatus.SurgeryFixed) successMsg = "Surgery fixed successfully! 🏆";
      if (newStatus === ProposalStatus.FollowUp) successMsg = "Follow-up scheduled successfully! 📅";
      if (newStatus === ProposalStatus.SurgeryLost) successMsg = "Patient marked as lost. 📁";
      
      showToast(successMsg);
      setSelectedPatient(null);
      setShowSurgeryDateModal(false);
      setShowFollowUpDateModal(false);
      
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(false);
      }
    } catch (err) {
      showToast("Failed to update status. Please try again.", "error");
    }
  };

  const handleConfirmLostRequest = () => {
    if (!lostReason || (lostReason === 'Other' && !lostOtherNote.trim())) return;
    setShowFinalLostConfirm(true);
  };

  const handleFinalLostConfirm = async () => {
    if (!selectedPatient) return;
    const isoDate = getISODate();
    const istDisplay = getISTDisplayTime();
    const finalReason = lostReason === 'Other' ? `Other: ${lostOtherNote}` : lostReason;
    
    try {
      await updatePackageProposal(selectedPatient!.id, {
        ...proposal as PackageProposal,
        status: ProposalStatus.SurgeryLost,
        objectionIdentified: finalReason,
        proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString(),
        outcomeDate: isoDate,
        lastFollowUpAt: istDisplay
      });

      showToast("Patient marked as lost. 📁");
      setShowFinalLostConfirm(false);
      setShowLostModal(false);
      setLostReason('');
      setLostOtherNote('');
      setSelectedPatient(null);
      
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(false);
      }
    } catch (err) {
      showToast("Failed to mark as lost.", "error");
    }
  };

  const handleGenerateAIStrategy = async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    const strategy = await generateCounselingStrategy(selectedPatient);
    setProposal(prev => ({ ...prev, counselingStrategy: strategy }));
    setAiLoading(false);
    showToast("AI Strategy generated!");
  };

  const toggleEquipment = (item: string) => {
    const current = proposal.equipment || [];
    if (current.includes(item)) {
      setProposal({ ...proposal, equipment: current.filter(i => i !== item) });
    } else {
      setProposal({ ...proposal, equipment: [...current, item] });
    }
  };

  const getMilestoneInfo = () => {
    if (!selectedPatient) return null;
    const status = selectedPatient.packageProposal?.status || ProposalStatus.Pending;
    const outcomeDate = selectedPatient.packageProposal?.outcomeDate;
    const followUpDate = selectedPatient.packageProposal?.followUpDate;

    if (status === ProposalStatus.SurgeryFixed && outcomeDate) {
      return { 
        label: 'Scheduled Surgery', 
        date: outcomeDate, 
        icon: Trophy, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50',
        border: 'border-emerald-100'
      };
    }
    
    if (status === ProposalStatus.FollowUp && followUpDate) {
      return { 
        label: 'Next Follow-up', 
        date: followUpDate, 
        icon: History, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50',
        border: 'border-blue-100'
      };
    }

    if (status === ProposalStatus.SurgeryLost && outcomeDate) {
      return { 
        label: 'Lost Date', 
        date: outcomeDate, 
        icon: XCircle, 
        color: 'text-red-600', 
        bg: 'bg-red-50',
        border: 'border-red-100'
      };
    }

    return null;
  };

  const milestone = getMilestoneInfo();

  return (
    <div className="space-y-4 md:space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-10 right-10 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-700' : 'bg-white border-red-100 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Counseling Operations</h2>
          <p className="text-gray-500 text-xs md:text-sm">Managing patient conversion pipeline</p>
        </div>
        <div className="flex w-full md:w-auto bg-white rounded-2xl p-1.5 border shadow-sm">
          <button onClick={() => setActiveTab('counseling')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'counseling' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Briefcase className="w-4 h-4" /> Pipeline
          </button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'staff' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Users className="w-4 h-4" /> Staff
          </button>
        </div>
      </div>

      {activeTab === 'counseling' ? (
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-3 md:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex gap-1 md:gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100 w-full md:w-auto overflow-x-auto no-scrollbar">
              <button onClick={() => setCounselingFilter('PENDING')} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'PENDING' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                <Clock className="w-3 md:w-4 h-3 md:h-4" /> New
              </button>
              <button onClick={() => setCounselingFilter('DUE_FOLLOWUPS')} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'DUE_FOLLOWUPS' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
                <Calendar className="w-3 md:w-4 h-3 md:h-4" /> Follow-ups
              </button>
              <button onClick={() => setCounselingFilter('CONVERTED')} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'CONVERTED' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                <Trophy className="w-3 md:w-4 h-3 md:h-4" /> Fixed
              </button>
              <button onClick={() => setCounselingFilter('LOST_LIST')} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${counselingFilter === 'LOST_LIST' ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white'}`}>
                <XCircle className="w-3 md:w-4 h-3 md:h-4" /> Lost
              </button>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 md:w-32 text-[10px] md:text-xs p-2 border rounded-xl" placeholder="From" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 md:w-32 text-[10px] md:text-xs p-2 border rounded-xl" placeholder="To" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-280px)] gap-4 md:gap-6">
            <div className={`${isSidebarCollapsed ? 'w-full md:w-[64px] h-auto md:h-full' : 'w-full md:w-80 lg:w-[380px] h-[300px] md:h-full'} bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 relative`}>
              <div className="p-3 md:p-4 border-b bg-slate-50/50 flex justify-between items-center overflow-hidden">
                {(!isSidebarCollapsed || window.innerWidth < 768) && (
                  <>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Patient List</span>
                    <span className="bg-white border text-slate-600 px-2 py-0.5 rounded-full text-[10px] ml-2">{filteredPatients.length}</span>
                  </>
                )}
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`p-1.5 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-hospital-600 border border-transparent hover:border-slate-200 ${isSidebarCollapsed && window.innerWidth >= 768 ? 'mx-auto' : 'ml-2'}`}
                  title={isSidebarCollapsed ? "Expand" : "Collapse"}
                >
                  {isSidebarCollapsed ? 
                    (window.innerWidth < 768 ? <ChevronDown className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />) : 
                    (window.innerWidth < 768 ? <ChevronUp className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />)
                  }
                </button>
              </div>

              {isSidebarCollapsed && window.innerWidth >= 768 ? (
                <div className="flex-1 flex flex-col items-center py-4 gap-4 overflow-y-auto no-scrollbar">
                  {filteredPatients.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => handlePatientSelect(p)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedPatient?.id === p.id ? 'bg-hospital-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                      title={p.name}
                    >
                      <User className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`${isSidebarCollapsed && window.innerWidth < 768 ? 'hidden' : 'block'} overflow-y-auto flex-1 p-3 space-y-3`}>
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
              )}
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col transition-all duration-300">
              {selectedPatient ? (
                <div className="flex flex-col h-full">
                  <div className="p-4 md:p-6 border-b bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2.5 md:p-3 rounded-2xl shadow-sm border border-slate-100"><User className="w-5 md:w-6 h-5 md:h-6 text-hospital-600" /></div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">{selectedPatient.name}</h3>
                        <div className="flex gap-4 mt-1">
                          <span className="text-sm font-bold text-slate-500">{selectedPatient.age} yrs • {selectedPatient.gender}</span>
                          <span className="text-sm font-mono font-bold text-hospital-600 bg-hospital-50 px-2 rounded">{selectedPatient.condition}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Scheduled Date Indicator */}
                    <div className="flex flex-col flex-1 items-center justify-center">
                      {milestone ? (
                        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-sm ${milestone.bg} ${milestone.border} animate-in fade-in zoom-in-95 duration-300`}>
                          <div className={`p-2 rounded-xl bg-white shadow-sm ${milestone.color}`}>
                            <milestone.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 mb-0.5">{milestone.label}</div>
                            <div className={`text-sm font-black tracking-tight ${milestone.color}`}>{milestone.date}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-dashed border-slate-200 opacity-60">
                          <CalendarDays className="w-4 h-4 text-slate-300" />
                          <span className="text-xs font-medium text-slate-400 italic">No date scheduled</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-start lg:items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Doctor Recommendation</span>
                      <span className="bg-hospital-600 text-white px-3 py-1 rounded-lg text-xs font-black">{selectedPatient.doctorAssessment?.quickCode}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      {[
                        { label: 'Source', icon: Globe, value: selectedPatient.source },
                        { label: 'Insurance', icon: ShieldCheck, value: selectedPatient.hasInsurance },
                        { label: 'Occupation', icon: Briefcase, value: selectedPatient.occupation },
                        { label: 'Mobile', icon: Phone, value: selectedPatient.mobile }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            <item.icon className="w-4 h-4 text-slate-400" /> {item.label}
                          </label>
                          <div className="text-sm font-black text-slate-800 truncate">{item.value || 'N/A'}</div>
                        </div>
                      ))}
                    </div>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2 border-l-4 border-hospital-600 pl-3 md:pl-4 py-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Surgery Package Details</h3>
                      </div>
                      
                      <div className="bg-white border-2 border-slate-50 rounded-3xl p-4 md:p-8 shadow-sm space-y-8 md:space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                          <div className="space-y-3 md:space-y-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <CreditCard className="w-4 h-4 text-hospital-500" /> Mode of Payment
                            </label>
                            <div className="flex flex-col gap-2.5">
                              {['Cash', 'Insurance Pending', 'Insurance Accepted'].map((mode) => (
                                <label key={mode} className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 cursor-pointer transition-all ${proposal.paymentMode === mode ? 'border-hospital-500 bg-hospital-50 text-hospital-700 font-bold' : 'border-slate-50 text-slate-500 hover:border-slate-100'}`}>
                                  <input type="radio" className="hidden" name="paymentMode" value={mode} checked={proposal.paymentMode === mode} onChange={() => setProposal({ ...proposal, paymentMode: mode as any })} />
                                  <span className="text-sm">{mode}</span>
                                </label>
                              ))}
                            </div>

                            {/* Conditional Insurance Document Shared field */}
                            {proposal.paymentMode === 'Insurance Pending' && (
                              <div className="mt-4 p-5 bg-hospital-50 border border-hospital-100 rounded-2xl animate-in fade-in slide-in-from-top-1">
                                <label className="flex items-center gap-2 text-xs font-bold text-hospital-600 uppercase tracking-widest mb-4">
                                  <FileCheck className="w-4 h-4" /> Document Shared?
                                </label>
                                <div className="flex gap-2.5">
                                  {['Yes', 'No'].map(opt => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setProposal({ ...proposal, insuranceDocShared: opt as any })}
                                      className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all ${proposal.insuranceDocShared === opt ? 'bg-hospital-600 border-hospital-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <DollarSign className="w-4 h-4 text-hospital-500" /> Package Amount (₹)
                            </label>
                            <input type="number" className="w-full p-5 border-2 border-slate-100 rounded-xl font-black text-slate-800 focus:border-hospital-500 outline-none text-2xl bg-slate-50/30" placeholder="0.00" value={proposal.packageAmount || ''} onChange={e => setProposal({ ...proposal, packageAmount: Number(e.target.value) })} />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <Syringe className="w-4 h-4 text-hospital-500" /> Surgery Medicines
                            </label>
                            <select className="w-full p-5 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-hospital-500 outline-none text-base bg-slate-50/30" value={proposal.surgeryMedicines || ''} onChange={e => setProposal({ ...proposal, surgeryMedicines: e.target.value as any })}>
                              <option value="" disabled>Select Status...</option>
                              <option value="Included">Included</option>
                              <option value="Excluded">Excluded</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <ClipboardCheck className="w-4 h-4 text-hospital-500" /> Pre-OP Investigation
                            </label>
                            <select className="w-full p-5 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-hospital-500 outline-none text-base bg-slate-50/30" value={proposal.preOpInvestigation || ''} onChange={e => setProposal({ ...proposal, preOpInvestigation: e.target.value as any })}>
                              <option value="" disabled>Select Status...</option>
                              <option value="Included">Included</option>
                              <option value="Excluded">Excluded</option>
                            </select>
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <Briefcase className="w-4 h-4 text-hospital-500" /> Equipment Selection
                            </label>
                            <div className="flex flex-wrap gap-2.5">
                              {['Meshes', 'Laparoscopic Items'].map((item) => (
                                <button key={item} type="button" onClick={() => toggleEquipment(item)} className={`px-5 py-3.5 rounded-xl text-xs font-bold border-2 transition-all ${proposal.equipment?.includes(item) ? 'bg-hospital-600 border-hospital-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <Activity className="w-4 h-4 text-hospital-500" /> ICU Charges
                            </label>
                            <select className="w-full p-5 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-hospital-500 outline-none text-base bg-slate-50/30" value={proposal.icuCharges || ''} onChange={e => setProposal({ ...proposal, icuCharges: e.target.value as any })}>
                              <option value="" disabled>Select Status...</option>
                              <option value="Included">Included</option>
                              <option value="Excluded">Excluded</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <BedDouble className="w-4 h-4 text-hospital-500" /> Room Type
                            </label>
                            <select className="w-full p-5 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-hospital-500 outline-none text-base bg-slate-50/30" value={proposal.roomType || ''} onChange={e => setProposal({ ...proposal, roomType: e.target.value as any })}>
                              <option value="" disabled>Select Room...</option>
                              <option value="Private">Private</option>
                              <option value="Deluxe">Deluxe</option>
                              <option value="Semi">Semi</option>
                            </select>
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <Clock className="w-4 h-4 text-hospital-500" /> Length of Stay
                            </label>
                            <input type="number" className="w-full p-5 border-2 border-slate-100 rounded-xl font-black text-slate-800 focus:border-hospital-500 outline-none text-lg bg-slate-50/30" placeholder="e.g. 2 Days" value={proposal.stayDays || ''} onChange={e => setProposal({ ...proposal, stayDays: Number(e.target.value) })} />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                              <FollowUpIcon className="w-4 h-4 text-hospital-500" /> Post-OP Follow-Up
                            </label>
                            <select className="w-full p-5 border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-hospital-500 outline-none text-base bg-slate-50/30" value={proposal.postOpFollowUp || ''} onChange={e => setProposal({ ...proposal, postOpFollowUp: e.target.value as any })}>
                              <option value="" disabled>Select Status...</option>
                              <option value="Included">Included</option>
                              <option value="Excluded">Excluded</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Decision Pattern</label>
                            <select className="w-full border-2 border-slate-100 rounded-xl p-5 text-base font-bold text-slate-700 bg-white outline-none focus:border-hospital-500" value={proposal.decisionPattern || ''} onChange={e => setProposal({...proposal, decisionPattern: e.target.value})}>
                              <option value="" disabled>Select Pattern...</option>
                              <option>Standard</option><option>Price Sensitive</option><option>Needs Consult</option><option>Quick Conversion</option>
                            </select>
                         </div>
                         <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Primary Objection</label>
                            <input type="text" className="w-full border-2 border-slate-100 rounded-xl p-5 text-base font-bold text-slate-700 bg-white outline-none focus:border-hospital-500" placeholder="e.g. Cost Concerns..." value={proposal.objectionIdentified} onChange={e => setProposal({...proposal, objectionIdentified: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Counseling Strategy</label>
                            <button onClick={handleGenerateAIStrategy} disabled={aiLoading} className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50">
                              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-4 h-4" />} AI STRATEGY
                            </button>
                         </div>
                         <textarea className="w-full border-2 border-slate-100 rounded-2xl p-6 text-lg font-medium text-slate-700 bg-slate-50/20 outline-none min-h-[200px] focus:border-hospital-500 leading-relaxed" value={proposal.counselingStrategy} onChange={e => setProposal({...proposal, counselingStrategy: e.target.value})} placeholder="Draft the patient counseling approach..." />
                      </div>
                    </div>
                  </div>

                  <div className="p-8 border-t bg-slate-50/50 flex flex-wrap gap-4">
                     <button onClick={() => handleActionClick(ProposalStatus.FollowUp)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2.5 shadow-sm text-base">
                       <History className="w-6 h-6" /> Schedule Follow-up
                     </button>
                     <button onClick={() => handleActionClick(ProposalStatus.SurgeryLost)} className="flex-1 py-5 border border-red-100 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2.5 shadow-sm text-base">
                       <XCircle className="w-6 h-6" /> Mark as Lost
                     </button>
                     <button onClick={() => handleActionClick(ProposalStatus.SurgeryFixed)} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 text-lg">
                       <Trophy className="w-7 h-7" /> SURGERY FIXED!
                     </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-slate-50/20">
                  <div className="bg-white p-10 rounded-full border border-slate-100 shadow-sm mb-8">
                    <Briefcase className="w-24 h-24 text-hospital-400 opacity-20" />
                  </div>
                  <p className="text-2xl font-bold text-slate-400 tracking-tight">Select Candidate to Continue</p>
                  <p className="text-xs uppercase font-bold tracking-widest mt-3 text-slate-300">Detailed counselor dashboard will load here upon selection</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white p-24 rounded-3xl border border-slate-100 shadow-sm text-center">
           <Users className="w-24 h-24 mx-auto text-purple-600 opacity-20 mb-8" />
           <p className="font-bold text-3xl text-slate-800">Staff Management Console</p>
           <p className="text-base text-slate-400 mt-3 font-medium">Internal administrative features coming soon...</p>
        </div>
      )}

      {/* Follow Up Date Modal */}
      {showFollowUpDateModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <History className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Schedule Next Follow-up</h3>
                <p className="text-base text-slate-500 font-medium mt-3">When should this patient be contacted again?</p>
              </div>
              
              <div className="space-y-3 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Follow-up Date *</label>
                <input 
                  type="date" 
                  min={today}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-800 focus:border-hospital-500 outline-none transition-all"
                  value={proposal.followUpDate || ''}
                  onChange={(e) => setProposal({ ...proposal, followUpDate: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowFollowUpDateModal(false)} className="flex-1 py-5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all text-base">Cancel</button>
                <button 
                  disabled={!proposal.followUpDate}
                  onClick={() => executeAction(ProposalStatus.FollowUp, proposal.followUpDate)}
                  className="flex-[2] py-5 bg-hospital-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-hospital-100 hover:bg-hospital-700 transition-all disabled:opacity-30 active:scale-95"
                >
                  Set Follow-up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSurgeryDateModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Surgery Date Confirmation</h3>
                <p className="text-base text-slate-500 font-medium mt-3">Please select the planned date for surgery</p>
              </div>
              
              <div className="space-y-3 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Planned Date *</label>
                <input 
                  type="date" 
                  min={today}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-800 focus:border-emerald-500 outline-none transition-all"
                  value={proposal.outcomeDate || ''}
                  onChange={(e) => setProposal({ ...proposal, outcomeDate: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowSurgeryDateModal(false)} className="flex-1 py-5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all text-base">Cancel</button>
                <button 
                  disabled={!proposal.outcomeDate}
                  onClick={() => executeAction(pendingStatus!, proposal.outcomeDate)}
                  className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-30 active:scale-95"
                >
                  Finalize Surgery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Lost Reason Selection Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 my-auto">
            <div className="p-8 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <XCircle className="w-8 h-8 text-red-600" />
                <h3 className="text-xl font-bold text-red-900">Patient File Closing: LOST</h3>
              </div>
              <button onClick={() => setShowLostModal(false)} className="p-2 hover:bg-red-100 rounded-full transition-colors"><X className="w-6 h-6 text-red-400" /></button>
            </div>
            
            <div className="p-10 space-y-8">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 block">Select Primary Reason for Loss *</label>
                <div className="space-y-4">
                  {[
                    "Cost issue",
                    "Patient not ready",
                    "Fear / second opinion",
                    "Chose another hospital",
                    "Other"
                  ].map(reason => (
                    <label key={reason} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${lostReason === reason ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-slate-100 hover:border-slate-200'}`}>
                      <input type="radio" className="hidden" name="lostReason" value={reason} checked={lostReason === reason} onChange={() => setLostReason(reason)} />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${lostReason === reason ? 'border-red-500' : 'border-slate-300'}`}>
                        {lostReason === reason && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                      </div>
                      <span className="text-base">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(lostReason === 'Other' || lostReason) && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-3 block tracking-widest">Additional Details *</label>
                  <textarea 
                    className="w-full border-2 border-slate-100 rounded-2xl p-5 text-base font-medium outline-none focus:ring-4 focus:ring-red-50 leading-relaxed"
                    placeholder="Provide specific details regarding the loss..."
                    rows={4}
                    value={lostOtherNote}
                    onChange={e => setLostOtherNote(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => setShowLostModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all text-base">Cancel</button>
              <button 
                onClick={handleConfirmLostRequest}
                disabled={!lostReason || (lostReason === 'Other' && !lostOtherNote.trim())}
                className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-30 text-lg"
              >
                Continue to Closing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Confirmation Warning Modal for Lost Patients */}
      {showFinalLostConfirm && (
        <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-red-50">
            <div className="p-12 text-center space-y-10">
              <div className="relative inline-block">
                <div className="absolute inset-0 animate-ping rounded-full bg-red-100 opacity-75"></div>
                <div className="relative w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertTriangle className="w-12 h-12" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Are you absolutely sure?</h3>
                <p className="text-base text-slate-500 font-medium leading-relaxed px-4">
                  Closing this file as <span className="text-red-600 font-black">LOST</span> will remove the patient from the active pipeline. This action is recorded and impacts conversion metrics.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={handleFinalLostConfirm}
                  className="w-full py-5 bg-red-600 text-white rounded-[1.5rem] font-black text-xl shadow-2xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                >
                  Confirm & Close File
                </button>
                <button 
                  onClick={() => setShowFinalLostConfirm(false)}
                  className="w-full py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-[1.5rem] transition-all"
                >
                  Wait, let me rethink
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};