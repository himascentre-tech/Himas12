
import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal, SurgeonCode, ProposalStatus, SurgeryProcedure } from '../types';
import { 
  Briefcase, Calendar, Wand2, Users, Trophy, History, X, 
  Download, User, Activity, 
  ShieldCheck, Phone, AlertCircle,
  DollarSign, Clock, XCircle, CheckCircle2,
  Globe, Loader2, CreditCard, Syringe, ClipboardCheck, BedDouble, Stethoscope as FollowUpIcon,
  FileCheck, ChevronLeft, ChevronRight as ChevronRightIcon,
  ChevronDown, ChevronUp, AlertTriangle, CalendarDays, FileText, Eye, File,
  Zap, HeartPulse, Wallet, Gauge, PenTool, ClipboardList, Printer, Search,
  Shield, MapPin
} from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal } = useHospital();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [counselingFilter, setCounselingFilter] = useState<'PENDING' | 'DUE_FOLLOWUPS' | 'CONVERTED' | 'LOST_LIST' | 'ALL_ACTIVE'>('ALL_ACTIVE');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [aiLoading, setAiLoading] = useState(false);
  
  // States for Modals
  const [showLostModal, setShowLostModal] = useState(false);
  const [showSurgeryDateModal, setShowSurgeryDateModal] = useState(false);
  const [showFollowUpDateModal, setShowFollowUpDateModal] = useState(false);
  
  const [lostReason, setLostReason] = useState('');
  const [lostOtherNote, setLostOtherNote] = useState('');
  const [pendingDate, setPendingDate] = useState('');

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
    equipment: [],
    packageAmount: 0,
    stayDays: 0
  });

  const today = new Date().toISOString().split('T')[0];

  const getISODate = () => new Date().toISOString().split('T')[0];
  const getISTDisplayTime = () => {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Only include patients with a surgical recommendation (S1)
      if (!p.doctorAssessment || p.doctorAssessment.quickCode === SurgeonCode.M1) return false;
      
      const status = p.packageProposal?.status || ProposalStatus.Pending;
      let matchesTab = false;
      let targetDate = p.entry_date;

      if (counselingFilter === 'PENDING') matchesTab = status === ProposalStatus.Pending;
      else if (counselingFilter === 'DUE_FOLLOWUPS') matchesTab = status === ProposalStatus.FollowUp;
      else if (counselingFilter === 'CONVERTED') matchesTab = status === ProposalStatus.SurgeryFixed;
      else if (counselingFilter === 'LOST_LIST') matchesTab = status === ProposalStatus.SurgeryLost;
      else if (counselingFilter === 'ALL_ACTIVE') matchesTab = status === ProposalStatus.Pending || status === ProposalStatus.FollowUp;
      
      if (!matchesTab) return false;

      // Search Filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchLower) || 
        p.id.toLowerCase().includes(searchLower) ||
        p.mobile.includes(searchTerm);

      if (!matchesSearch) return false;

      // Date Range Filter
      if (startDate && targetDate < startDate) return false;
      if (endDate && targetDate > endDate) return false;

      return true;
    }).sort((a, b) => {
      const dateA = a.packageProposal?.outcomeDate || a.entry_date;
      const dateB = b.packageProposal?.outcomeDate || b.entry_date;
      return dateB.localeCompare(dateA);
    });
  }, [patients, counselingFilter, startDate, endDate, searchTerm]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
    setProposal({
      decisionPattern: '',
      objectionIdentified: '',
      counselingStrategy: '',
      followUpDate: '',
      status: ProposalStatus.Pending,
      paymentMode: 'Cash',
      insuranceDocShared: 'No',
      preOpInvestigation: 'Included',
      surgeryMedicines: 'Included',
      icuCharges: 'Excluded',
      roomType: 'Semi',
      postOpFollowUp: 'Included',
      equipment: [],
      packageAmount: 0,
      stayDays: 2,
      ...p.packageProposal
    });
    if (window.innerWidth < 1024) setIsSidebarCollapsed(true);
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
      showToast(`${newStatus} updated successfully!`);
      setSelectedPatient(null);
      setShowSurgeryDateModal(false);
      setShowFollowUpDateModal(false);
      setShowLostModal(false);
      setPendingDate('');
    } catch (err) {
      showToast("Update failed", "error");
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
    setProposal({
      ...proposal,
      equipment: current.includes(item) ? current.filter(i => i !== item) : [...current, item]
    });
  };

  const printableRows = useMemo(() => {
    if (!selectedPatient) return [];
    const docAssessment = selectedPatient.doctorAssessment;
    const insuranceValue = selectedPatient.hasInsurance === 'Yes' 
      ? (selectedPatient.insuranceName || 'YES (TPA)').toUpperCase()
      : selectedPatient.hasInsurance.toUpperCase();

    return [
      { label: 'PATIENT NAME', value: selectedPatient.name.toUpperCase() },
      { label: 'UHID NO', value: selectedPatient.id, isMono: true },
      { label: 'INSURANCE', value: insuranceValue },
      { label: 'LEAD SOURCE', value: selectedPatient.source.toUpperCase() },
      { label: 'REFERRED BY', value: (selectedPatient.sourceDoctorName || 'N/A').toUpperCase() },
      { label: 'PROPOSED SURGERY', value: (docAssessment?.surgeryProcedure === SurgeryProcedure.Others ? docAssessment?.otherSurgeryName : docAssessment?.surgeryProcedure)?.toUpperCase() || 'N/A' },
      { label: 'PAYMENT MODE', value: proposal.paymentMode?.toUpperCase() || 'CASH' },
      { label: 'ROOM TYPE', value: proposal.roomType?.toUpperCase() || 'SEMI' },
      { label: 'EXPECTED STAY', value: `${proposal.stayDays || 0} DAYS` }
    ];
  }, [selectedPatient, proposal]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6 overflow-hidden">
      {/* Sidebar: Patient List */}
      <div className={`${isSidebarCollapsed ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-slate-100 flex-col overflow-hidden transition-all duration-300`}>
        <div className="p-4 border-b bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-hospital-600" /> Counseling Queue
            </h3>
            <span className="text-[10px] font-bold text-slate-400">{filteredPatients.length} Patients</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search patients..." 
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-hospital-50 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {['ALL_ACTIVE', 'PENDING', 'DUE_FOLLOWUPS', 'CONVERTED', 'LOST_LIST'].map(tab => (
              <button 
                key={tab}
                onClick={() => setCounselingFilter(tab as any)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${counselingFilter === tab ? 'bg-hospital-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredPatients.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs italic">No patients found.</div>
          ) : (
            filteredPatients.map(p => (
              <div 
                key={p.id}
                onClick={() => handlePatientSelect(p)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'border-hospital-500 bg-hospital-50 shadow-sm' : 'border-transparent bg-white hover:bg-slate-50 border-slate-100'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                  <div className="text-[9px] font-mono font-bold text-hospital-600 bg-hospital-50 px-1.5 py-0.5 rounded">{p.id}</div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-bold text-slate-600">{p.condition}</span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span>DOP: {p.entry_date}</span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {p.hasInsurance === 'Yes' && (
                    <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-widest border border-emerald-100">
                      <Shield className="w-2 h-2" /> Insured
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
                    <Globe className="w-2 h-2" /> {p.source}
                  </div>
                </div>

                {p.packageProposal?.followUpDate && p.packageProposal.status === ProposalStatus.FollowUp && (
                   <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit border border-blue-100">
                     <History className="w-3 h-3" /> Follow-up Due: {p.packageProposal.followUpDate}
                   </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden ${!selectedPatient && isSidebarCollapsed ? 'hidden' : 'flex'}`}>
        {selectedPatient ? (
          <>
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center no-print">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarCollapsed(false)} className="lg:hidden p-2 hover:bg-slate-200 rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                  <Briefcase className="w-6 h-6 text-hospital-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Counseling Workstation</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-xs font-medium text-slate-500">
                    <span>{selectedPatient.name}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-hospital-600 font-bold tracking-tight uppercase text-[10px]">{selectedPatient.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all">
                  <Printer className="w-4 h-4" /> Print Proposal
                </button>
                <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-print">
              {/* Doctor Summary Section + Intake Info */}
              <section className="bg-hospital-50/50 p-6 rounded-3xl border border-hospital-100 space-y-6">
                 <div className="flex items-center gap-2 text-hospital-700 font-black text-[10px] uppercase tracking-widest">
                   <Activity className="w-4 h-4" /> Comprehensive Patient Profile
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Procedure Recommended</label>
                      <div className="font-bold text-hospital-700 text-sm truncate">{selectedPatient.doctorAssessment?.surgeryProcedure}</div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Quick Code</label>
                      <div className="font-bold text-slate-800 text-sm">{selectedPatient.doctorAssessment?.quickCode}</div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Pain Level</label>
                      <div className={`font-bold text-sm ${selectedPatient.doctorAssessment?.painSeverity === 'High' ? 'text-red-500' : 'text-slate-700'}`}>{selectedPatient.doctorAssessment?.painSeverity}</div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Patient Readiness</label>
                      <div className="font-bold text-slate-700 text-sm">{selectedPatient.doctorAssessment?.conversionReadiness}</div>
                    </div>
                    {/* Insurance Column */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block flex items-center gap-1.5"><Shield className="w-3 h-3 text-emerald-500" /> Insurance Status</label>
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        {selectedPatient.hasInsurance === 'Yes' ? (
                          <span className="text-emerald-600">{selectedPatient.insuranceName || 'Standard TPA'}</span>
                        ) : (
                          <span className="text-slate-400 italic">No Insurance</span>
                        )}
                      </div>
                    </div>
                    {/* Source Column */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block flex items-center gap-1.5"><MapPin className="w-3 h-3 text-blue-500" /> Lead Source</label>
                      <div className="font-bold text-slate-800 text-sm truncate">
                        {selectedPatient.source}
                        {selectedPatient.sourceDoctorName && <span className="block text-[8px] text-slate-400 font-medium">Referred by {selectedPatient.sourceDoctorName}</span>}
                      </div>
                    </div>
                 </div>
                 
                 {selectedPatient.doctorAssessment?.notes && (
                   <div className="pt-3 border-t border-hospital-100">
                      <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed">
                        <FileText className="w-3 h-3 inline mr-1 opacity-40" />
                        "{selectedPatient.doctorAssessment.notes}"
                      </p>
                   </div>
                 )}
              </section>

              {/* Counseling Form */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                 <div className="space-y-8">
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                           <PenTool className="w-4 h-4 text-hospital-600" /> AI-Strategy & Strategy
                         </h3>
                         <button 
                           onClick={handleGenerateAIStrategy}
                           disabled={aiLoading}
                           className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-purple-100 hover:bg-purple-700 disabled:opacity-50 transition-all"
                         >
                           {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                           Generate AI Tactic
                         </button>
                      </div>
                      <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-4 focus:ring-hospital-50 focus:bg-white transition-all min-h-[100px]"
                        placeholder="Define conversation focus or use AI tactic..."
                        value={proposal.counselingStrategy || ''}
                        onChange={e => setProposal({...proposal, counselingStrategy: e.target.value})}
                      />
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-hospital-600" /> Package Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Total Package (₹) *</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-hospital-700 outline-none"
                            value={proposal.packageAmount || ''}
                            onChange={e => setProposal({...proposal, packageAmount: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Expected Stay (Days)</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-700 outline-none"
                            value={proposal.stayDays || ''}
                            onChange={e => setProposal({...proposal, stayDays: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Room Category</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                            value={proposal.roomType || ''}
                            onChange={e => setProposal({...proposal, roomType: e.target.value as any})}
                          >
                            <option value="Semi">Semi-Private</option>
                            <option value="Private">Private Room</option>
                            <option value="Deluxe">Deluxe Room</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Payment Method</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                            value={proposal.paymentMode || ''}
                            onChange={e => setProposal({...proposal, paymentMode: e.target.value as any})}
                          >
                            <option value="Cash">Cash / Digital Payment</option>
                            <option value="Insurance Pending">Insurance (TPA Pending)</option>
                            <option value="Insurance Accepted">Insurance (Pre-Auth Done)</option>
                          </select>
                        </div>
                      </div>
                    </section>
                 </div>

                 <div className="space-y-8">
                    <section className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-hospital-600" /> Facilities Selection
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'preOpInvestigation', label: 'Pre-Op Tests' },
                          { key: 'surgeryMedicines', label: 'OT Pharmacy' },
                          { key: 'icuCharges', label: 'ICU Access' },
                          { key: 'postOpFollowUp', label: 'Post-Op Follow-up' }
                        ].map(item => (
                          <div key={item.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                             <span className="text-xs font-bold text-slate-600">{item.label}</span>
                             <button 
                               onClick={() => setProposal({...proposal, [item.key]: proposal[item.key as keyof PackageProposal] === 'Included' ? 'Excluded' : 'Included'})}
                               className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${proposal[item.key as keyof PackageProposal] === 'Included' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                             >
                               {proposal[item.key as keyof PackageProposal] || 'Excluded'}
                             </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-4">
                       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Surgical Consumables</h3>
                       <div className="flex flex-wrap gap-2">
                          {['Mesh (15x15)', 'Mesh (12x6)', 'Harmonic Scalpel', 'Stapler Device', 'Disposable Kit'].map(item => (
                             <button 
                               key={item} 
                               onClick={() => toggleEquipment(item)}
                               className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${proposal.equipment?.includes(item) ? 'bg-hospital-600 border-hospital-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                             >
                               {item}
                             </button>
                          ))}
                       </div>
                    </section>
                 </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                 <div className="flex gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => setShowLostModal(true)}
                      className="flex-1 md:px-10 py-4 border-2 border-red-100 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" /> Surgery Lost
                    </button>
                    <button 
                      onClick={() => setShowFollowUpDateModal(true)}
                      className="flex-1 md:px-10 py-4 border-2 border-blue-100 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                      <History className="w-5 h-5" /> Set Follow-up
                    </button>
                 </div>
                 <button 
                   onClick={() => setShowSurgeryDateModal(true)}
                   className="w-full md:w-auto px-16 py-4.5 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                   <CheckCircle2 className="w-6 h-6" /> Fix Surgery Date
                 </button>
              </div>
            </div>
            
            {/* PRINT TEMPLATE (Hidden in UI, visible on Print) */}
            <div className="hidden print:block print-container p-4 bg-white min-h-screen text-slate-900 leading-[1.3]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <div className="flex justify-between items-start mb-8">
                <div className="text-left">
                  <h1 className="text-xl font-bold uppercase tracking-tight pb-1 text-black">PROPOSED TARIFF</h1>
                  <p className="text-xs font-semibold text-slate-500 uppercase">DATE: {today}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-hospital-700 tracking-tighter">HIMAS</div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Hospital Management</div>
                </div>
              </div>

              <table className="w-full border-[0.5px] border-black text-sm table-fixed mb-8">
                <tbody>
                  {printableRows.map((row, idx) => (
                    <tr key={idx} className="border-b-[0.5px] border-black last:border-b-0">
                      <td className="px-4 py-2.5 font-semibold text-[11px] text-slate-600 w-[40%] bg-slate-50 border-r-[0.5px] border-black uppercase">{row.label}</td>
                      <td className={`px-4 py-2.5 font-normal text-[12px] text-slate-900 ${row.isMono ? 'font-mono' : ''}`}>{row.value}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/50">
                    <td className="px-4 py-3.5 font-bold text-[13px] text-slate-900 border-r-[0.5px] border-black uppercase">Proposed Package Amount</td>
                    <td className="px-4 py-3.5 font-bold text-[16px] text-slate-900">₹ {proposal.packageAmount?.toLocaleString() || '________________'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mb-8">
                <h3 className="font-bold text-[14px] uppercase mb-3 text-black">Hospital Remarks & Facilities</h3>
                <p className="text-[12px] text-slate-700 leading-relaxed pl-1">
                  • Room Category: <span className="font-semibold underline">{proposal.roomType || 'Standard'}</span> <br/>
                  • Medicines: <span className="font-semibold underline">{proposal.surgeryMedicines || 'Included'}</span> <br/>
                  • Pre-Op Care: <span className="font-semibold underline">{proposal.preOpInvestigation || 'Included'}</span> <br/>
                  • Equipment: <span className="font-semibold">{proposal.equipment?.length ? proposal.equipment.join(', ') : 'Standard OT Kit'}</span>
                </p>
              </div>

              <div className="mb-10">
                <h3 className="font-bold text-[14px] uppercase mb-3 text-black">Important Terms</h3>
                <ol className="list-decimal list-inside space-y-2 text-[11px] font-medium text-slate-600">
                  <li>Special investigations or consultations beyond basic package are CHARGED EXTRA.</li>
                  <li>Advance of ₹ 20,000 required for date confirmation.</li>
                  <li>ICU Charges (if required) are ₹ 15,000/day excluding Ventilator support.</li>
                </ol>
              </div>

              <div className="mt-12 flex justify-between gap-16 px-4">
                <div className="flex-1 text-center">
                  <div className="border-b border-black mb-4 h-12 w-full"></div>
                  <p className="text-[9px] font-bold uppercase tracking-tight text-black">COUNSELOR SIGNATURE</p>
                </div>
                <div className="flex-1 text-center">
                  <div className="border-b border-black mb-4 h-12 w-full"></div>
                  <p className="text-[9px] font-bold uppercase tracking-tight text-black">PATIENT SIGNATURE</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
             <div className="bg-white p-8 rounded-full shadow-sm mb-6 border border-slate-100">
               <Briefcase className="w-20 h-20 text-hospital-600 opacity-20" />
             </div>
             <p className="font-bold text-xl text-slate-400 tracking-tight">Counseling Portal Ready</p>
             <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mt-2">Select a patient from the queue to start financial evaluation</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSurgeryDateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
               <CalendarDays className="w-6 h-6 text-emerald-600" /> Set Surgery Date
            </h3>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-base font-bold outline-none mb-6"
              value={pendingDate}
              onChange={e => setPendingDate(e.target.value)}
            />
            <div className="flex gap-4">
               <button onClick={() => setShowSurgeryDateModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
               <button onClick={() => executeAction(ProposalStatus.SurgeryFixed, pendingDate)} className="flex-[2] bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-emerald-700">Confirm Date</button>
            </div>
          </div>
        </div>
      )}

      {showFollowUpDateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
               <History className="w-6 h-6 text-blue-600" /> Set Follow-up Date
            </h3>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-base font-bold outline-none mb-6"
              value={pendingDate}
              onChange={e => setPendingDate(e.target.value)}
            />
            <div className="flex gap-4">
               <button onClick={() => setShowFollowUpDateModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
               <button onClick={() => executeAction(ProposalStatus.FollowUp, pendingDate)} className="flex-[2] bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700">Set Schedule</button>
            </div>
          </div>
        </div>
      )}

      {showLostModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
               <AlertTriangle className="w-6 h-6 text-red-600" /> Surgery Lost Confirmation
            </h3>
            <div className="space-y-4 mb-8">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Primary Reason</p>
               <div className="grid grid-cols-2 gap-2">
                  {['High Package Cost', 'Going Elsewhere', 'Insurance Issue', 'Financial Hardship', 'Surgery Fear', 'Other'].map(r => (
                    <button 
                      key={r}
                      onClick={() => setLostReason(r)}
                      className={`px-3 py-3 rounded-xl text-[10px] font-bold border transition-all ${lostReason === r ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-500'}`}
                    >
                      {r}
                    </button>
                  ))}
               </div>
               {lostReason === 'Other' && (
                  <input 
                    type="text" 
                    placeholder="Provide details..."
                    className="w-full border p-3 rounded-xl text-xs font-bold"
                    value={lostOtherNote}
                    onChange={e => setLostOtherNote(e.target.value)}
                  />
               )}
            </div>
            <div className="flex gap-4">
               <button onClick={() => setShowLostModal(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancel</button>
               <button onClick={() => executeAction(ProposalStatus.SurgeryLost)} className="flex-[2] bg-red-600 text-white font-bold py-3 rounded-xl">Mark as Lost</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
