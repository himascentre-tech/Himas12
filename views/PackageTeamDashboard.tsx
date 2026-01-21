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
  Zap, HeartPulse, Wallet, Gauge, PenTool, ClipboardList
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
  }, [patients, counselingFilter, startDate, endDate]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
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
  const currentPatient = selectedPatient;

  const printableRows = useMemo(() => {
    if (!currentPatient) return [];
    const docAssessment = currentPatient.doctorAssessment;
    const packageProp = currentPatient.packageProposal;

    const rows = [
      { label: 'PATIENT NAME', value: (currentPatient.name || 'N/A').toUpperCase() },
      { label: 'AGE / SEX', value: `${currentPatient.age || 0} / ${currentPatient.gender || 'N/A'}` },
      { label: 'UHID NO', value: currentPatient.id || 'N/A', isMono: true },
      { label: 'CONTACT NO', value: currentPatient.mobile || 'N/A', isMono: true },
      { label: 'REFERRED BY', value: (currentPatient.sourceDoctorName || currentPatient.source || 'N/A').toUpperCase() },
      { label: 'No of Days of Admission', value: `${proposal.stayDays || '____'} Days` },
      { label: 'PROPOSED SURGERY', value: (
          (docAssessment?.surgeryProcedure === SurgeryProcedure.Others 
            ? docAssessment?.otherSurgeryName 
            : docAssessment?.surgeryProcedure) || '________________'
        ).toUpperCase() },
      { label: 'MODE OF PAYMENT', value: proposal.paymentMode?.includes('Insurance') ? `INSURANCE (${(currentPatient.insuranceName || 'Not Specified').toUpperCase()})` : 'CASH' }
    ];

    if (packageProp?.status === ProposalStatus.SurgeryFixed && packageProp?.outcomeDate) {
      rows.push({ label: 'SCHEDULED SURGERY DATE', value: packageProp.outcomeDate });
    }
    return rows;
  }, [currentPatient, proposal.stayDays, proposal.paymentMode, proposal.outcomeDate]);

  return (
    <div className="space-y-4 md:space-y-6 relative">
      {toast && (
        <div className="fixed top-10 right-10 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 no-print">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-700' : 'bg-white border-red-100 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {currentPatient && (
        <div className="hidden print:block print-container p-4 bg-white min-h-screen text-slate-900 leading-[1.3]" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="flex justify-between items-start mb-8">
            <div className="text-left">
              <h1 className="text-xl font-bold uppercase tracking-tight pb-1 text-black">PROPOSED TARIFF</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase">DATE: {today}</p>
            </div>
            <img 
              src="https://xggnswfyegchwlplzvto.supabase.co/storage/v1/object/public/Himas/himas-file-1%20(4).webp" 
              alt="Himas Logo" 
              className="h-[25px] object-contain" 
              loading="lazy"
              decoding="async"
            />
          </div>

          <table className="w-full border-[0.5px] border-black text-sm table-fixed mb-8">
            <tbody>
              {printableRows.map((row, idx) => (
                <tr key={idx} className="border-b-[0.5px] border-black last:border-b-0">
                  <td className="px-4 py-2.5 font-semibold text-[11px] text-slate-600 w-[40%] bg-slate-50 border-r-[0.5px] border-black uppercase">{row.label}</td>
                  <td className={`px-4 py-2.5 font-normal text-[12px] text-slate-900 ${row.isMono ? 'font-mono' : ''}`}>{row.value}</td>
                </tr>
              ))}
              {proposal.paymentMode?.includes('Insurance') && (
                <tr className="border-b-[0.5px] border-black">
                  <td className="px-4 py-2.5 font-semibold text-[11px] text-slate-600 bg-slate-50 border-r-[0.5px] border-black uppercase tracking-tight">INSURANCE DOCUMENTS SHARED</td>
                  <td className="px-4 py-2.5 font-normal text-[12px] text-slate-900">{proposal.insuranceDocShared || '________________'}</td>
                </tr>
              )}
              <tr className="bg-slate-100/50">
                <td className="px-4 py-3.5 font-bold text-[13px] text-slate-900 border-r-[0.5px] border-black uppercase">Proposed Package Amount</td>
                <td className="px-4 py-3.5 font-bold text-[16px] text-slate-900">₹ {proposal.packageAmount?.toLocaleString() || '________________'}</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-8">
            <h3 className="font-bold text-[14px] uppercase mb-3 text-black">Hospital Remarks & Facilities Selection</h3>
            <p className="text-[12px] text-slate-700 leading-relaxed pl-1">
              • Room Selected: <span className="font-semibold underline decoration-slate-300">{proposal.roomType || 'N/A'}</span> <br/>
              • Pre-Op Care: <span className="font-semibold underline decoration-slate-300">{proposal.preOpInvestigation || 'Excluded'}</span> <br/>
              • Pharmacy: <span className="font-semibold underline decoration-slate-300">{proposal.surgeryMedicines || 'Excluded'}</span> <br/>
              • Equipment List: <span className="font-semibold">{proposal.equipment?.length ? proposal.equipment.join(', ') : 'Standard Items Only'}</span>
            </p>
          </div>

          <div className="mb-10">
            <h3 className="font-bold text-[14px] uppercase mb-3 text-black">Terms and Conditions</h3>
            <ol className="list-decimal list-inside space-y-2 text-[11px] font-medium text-slate-600 leading-[1.4]">
              <li>ICU Admission / Special Investigations / Special Injections / Special Consultation / Blood Transfusions - <span className="italic underline underline-offset-2 text-black">IF ANY</span> - <span className="text-red-700 font-bold uppercase">CHARGES EXTRA</span></li>
              <li>Ward Charges for One Day (24 Hrs) - For Proposed Package (Based on standard Bill Cycles)</li>
              <li>ICU Admission - <span className="uppercase text-red-700 font-bold">CHARGES EXTRA</span> (without Ventilator - 15000/day AND with Ventilator - 25000/day)</li>
            </ol>
          </div>

          <div className="border-t-[1px] border-black pt-8 mb-4">
            <p className="text-[11px] font-bold text-black text-center mb-8 italic">
              NOTE: Requested to pay <span className="underline decoration-black decoration-2">Rs. 20,000</span> as advance for SURGERY DATE confirmation and 50% of package amount TO BE CLEARED BEFORE SHIFTING TO OT
            </p>
            
            <div className="mt-12">
              <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-center text-black mb-16">ABOVE PACKAGE IS NON-NEGOTIABLE</h2>
              
              <div className="flex justify-between items-end gap-16 px-4">
                <div className="flex-1 text-center">
                  <div className="border-b-[2px] border-black mb-4 h-12 w-full"></div>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-black leading-tight">PROPOSAL EXPLAINED BY<br/>(NAME AND SIGNATURE)</p>
                </div>
                <div className="flex-1 text-center">
                  <div className="border-b-[2px] border-black mb-4 h-12 w-full"></div>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-black leading-tight">SIGNATURE<br/>(PATIENT / AUTHORIZED ATTENDER)</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto text-center opacity-40 text-[9px] uppercase font-bold tracking-[0.3em] border-t-[0.5px] pt-4">
            Official Patient Handover Copy • Himas Hospital Management System • Verified {new Date().toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'})}
          </div>
        </div>
      )}
      
      {/* Existing dashboard code continues... */}
    </div>
  );
};