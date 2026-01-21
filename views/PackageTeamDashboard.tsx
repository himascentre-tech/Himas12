
import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal, ProposalStatus, SurgeryProcedure, ConversionReadiness, PainSeverity, SurgeonCode } from '../types';
import { 
  Briefcase, Activity, User, Phone, Wand2, History, Search, 
  ArrowRight, DollarSign, ShieldCheck, CheckCircle2, XCircle, 
  Clock, CreditCard, Syringe, ClipboardCheck, BedDouble, 
  Stethoscope as FollowUpIcon, Loader2, Info, AlertCircle, Save,
  Printer, X, MapPin, MousePointer2, Thermometer
} from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal, refreshData, isLoading } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PENDING' | 'FOLLOWUP' | 'CONVERT'>('ALL');

  // Local state for the package form
  const [packageForm, setPackageForm] = useState<Partial<PackageProposal>>({});

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Sync local form when patient changes
  useEffect(() => {
    if (selectedPatient) {
      setPackageForm(selectedPatient.packageProposal || {
        packageAmount: 0,
        paymentMode: 'Cash',
        roomType: 'Semi',
        stayDays: 2,
        status: ProposalStatus.Pending,
        equipment: [],
        preOpInvestigation: 'Included',
        surgeryMedicines: 'Included',
        icuCharges: 'Excluded',
        postOpFollowUp: 'Included'
      });
    }
  }, [selectedPatient]);

  const surgeryReadyPatients = patients.filter(p => {
    const s = searchTerm.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(s);
    const mobileMatch = (p.mobile || '').toLowerCase().includes(s);
    const idMatch = (p.id || '').toLowerCase().includes(s);
    const matchesSearch = nameMatch || mobileMatch || idMatch;

    const isSurgical = p.doctorAssessment && (p.doctorAssessment.quickCode || '').includes('S1');
    const currentStatus = p.packageProposal?.status || ProposalStatus.Pending;
    
    if (queueFilter === 'PENDING') return isSurgical && currentStatus === ProposalStatus.Pending && matchesSearch;
    if (queueFilter === 'FOLLOWUP') return isSurgical && currentStatus === ProposalStatus.FollowUp && matchesSearch;
    if (queueFilter === 'CONVERT') return isSurgical && currentStatus === ProposalStatus.SurgeryFixed && matchesSearch;
    return isSurgical && matchesSearch;
  });

  const handleGenerateAI = async () => {
    if (!selectedPatient) return;
    setIsGeneratingAI(true);
    try {
      const strategy = await generateCounselingStrategy(selectedPatient);
      setPackageForm(prev => ({ ...prev, counselingStrategy: strategy }));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const toggleEquipment = (item: string) => {
    const current = packageForm.equipment || [];
    if (current.includes(item)) {
      setPackageForm({ ...packageForm, equipment: current.filter(i => i !== item) });
    } else {
      setPackageForm({ ...packageForm, equipment: [...current, item] });
    }
  };

  const handleSavePackage = async (statusOverride?: ProposalStatus) => {
    if (!selectedPatient) return;
    setIsSaving(true);
    try {
      const finalProposal: PackageProposal = {
        decisionPattern: packageForm.decisionPattern || 'Standard',
        objectionIdentified: packageForm.objectionIdentified || 'None',
        counselingStrategy: packageForm.counselingStrategy || '',
        followUpDate: packageForm.followUpDate || new Date().toISOString().split('T')[0],
        status: statusOverride || packageForm.status || ProposalStatus.Pending,
        proposalCreatedAt: packageForm.proposalCreatedAt || new Date().toISOString(),
        outcomeDate: (statusOverride === ProposalStatus.SurgeryFixed || statusOverride === ProposalStatus.SurgeryLost) 
          ? new Date().toISOString().split('T')[0] 
          : undefined,
        ...packageForm
      } as PackageProposal;
      await updatePackageProposal(selectedPatient.id, finalProposal);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 overflow-hidden">
      {/* Sidebar: Counseling Queue */}
      <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-hospital-600" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Counseling Queue</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">{surgeryReadyPatients.length} Patients</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-hospital-500/20 outline-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL', label: 'ALL ACTIVE' },
              { id: 'PENDING', label: 'PENDING' },
              { id: 'FOLLOWUP', label: 'DUE FOLLOWUPS' },
              { id: 'CONVERT', label: 'CONVERT' }
            ].map((f) => (
              <button 
                key={f.id}
                onClick={() => setQueueFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  queueFilter === f.id 
                    ? 'bg-hospital-600 text-white' 
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
          {surgeryReadyPatients.map(patient => (
            <button 
              key={patient.id}
              onClick={() => setSelectedPatient(patient)}
              className={`w-full p-5 text-left transition-all relative group ${selectedPatient?.id === patient.id ? 'bg-hospital-50' : 'hover:bg-slate-50'}`}
            >
              {selectedPatient?.id === patient.id && <div className="absolute inset-y-0 left-0 w-1 bg-hospital-600" />}
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-slate-800 text-sm tracking-tight">{patient.name}</div>
                <div className="text-[9px] font-black text-hospital-500">{patient.id.slice(-6)}</div>
              </div>
              <div className="text-[10px] font-medium text-slate-400 flex items-center gap-2 mb-3">
                {patient.condition} <span className="text-slate-200">•</span> DOP: {patient.entry_date}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${patient.hasInsurance === 'Yes' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                  {patient.hasInsurance === 'Yes' ? 'INSURED' : 'UNINSURED'}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-slate-200">
                  {patient.source || 'DIRECT'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Counseling Workstation */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative print-container">
        {selectedPatient ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between no-print">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-hospital-50 rounded-xl flex items-center justify-center text-hospital-600">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Counseling Workstation</h1>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {selectedPatient.name} <span className="text-slate-200">|</span> <span className="text-hospital-500">{selectedPatient.id}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Proposal
                </button>
                <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Comprehensive Profile */}
              <section className="bg-hospital-50/50 rounded-3xl border border-hospital-100 p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-4 h-4 text-hospital-500" />
                  <h3 className="text-[10px] font-black text-hospital-600 uppercase tracking-[0.2em]">Comprehensive Patient Profile</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Procedure Recommended</p>
                    <p className="text-xs font-bold text-hospital-700">{selectedPatient.doctorAssessment?.surgeryProcedure || 'General Surgery'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quick Code</p>
                    <p className="text-xs font-bold text-slate-700">{selectedPatient.doctorAssessment?.quickCode || 'S1'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pain Level</p>
                    <p className="text-xs font-bold text-slate-700">{selectedPatient.doctorAssessment?.painSeverity || 'Moderate'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient Readiness</p>
                    <p className="text-xs font-bold text-slate-700">{selectedPatient.doctorAssessment?.conversionReadiness || 'CR2 - Needs Push'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Insurance Status</p>
                    <p className={`text-xs font-bold ${selectedPatient.hasInsurance === 'Yes' ? 'text-emerald-600' : 'text-slate-400 italic'}`}>
                      {selectedPatient.hasInsurance === 'Yes' ? 'Active Coverage' : 'No Insurance'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Source</p>
                    <p className="text-xs font-bold text-slate-700">{selectedPatient.source || 'Doctor Recommended'}</p>
                  </div>
                </div>

                <div className="pt-5 border-t border-hospital-100">
                  <p className="text-xs text-slate-500 italic flex items-center gap-3">
                    <FileText className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    "{selectedPatient.doctorAssessment?.notes || 'No clinical notes provided'}"
                  </p>
                </div>
              </section>

              {/* Strategy & Facilities Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <MousePointer2 className="w-3.5 h-3.5 text-indigo-500" /> AI-Strategy & Strategy
                    </label>
                    <button 
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Generate AI Tactic
                    </button>
                  </div>
                  <textarea 
                    className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Define conversation focus or use AI tactic..."
                    value={packageForm.counselingStrategy || ''}
                    onChange={(e) => setPackageForm({...packageForm, counselingStrategy: e.target.value})}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <BedDouble className="w-3.5 h-3.5 text-emerald-500" /> Facilities Selection
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Pre-Op Tests', key: 'preOpInvestigation' },
                      { label: 'OT Pharmacy', key: 'surgeryMedicines' },
                      { label: 'ICU Access', key: 'icuCharges' },
                      { label: 'Post-Op Follow-up', key: 'postOpFollowUp' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-hospital-200 transition-all">
                        <span className="text-xs font-bold text-slate-600">{item.label}</span>
                        <button 
                          onClick={() => setPackageForm({...packageForm, [item.key]: (packageForm as any)[item.key] === 'Included' ? 'Excluded' : 'Included'})}
                          className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${
                            (packageForm as any)[item.key] === 'Included' 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {(packageForm as any)[item.key] || 'Excluded'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Package Details & Consumables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Package Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Package (₹) *</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-hospital-500 outline-none"
                        value={packageForm.packageAmount || ''}
                        onChange={(e) => setPackageForm({...packageForm, packageAmount: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Expected Stay (Days)</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-hospital-500 outline-none"
                        value={packageForm.stayDays || 2}
                        onChange={(e) => setPackageForm({...packageForm, stayDays: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Category</label>
                      <select 
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-hospital-500"
                        value={packageForm.roomType}
                        onChange={(e) => setPackageForm({...packageForm, roomType: e.target.value as any})}
                      >
                        <option value="Semi">Semi-Private</option>
                        <option value="Private">Private Room</option>
                        <option value="Deluxe">Deluxe Suite</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                      <select 
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-hospital-500"
                        value={packageForm.paymentMode}
                        onChange={(e) => setPackageForm({...packageForm, paymentMode: e.target.value as any})}
                      >
                        <option value="Cash">Cash / Digital Payment</option>
                        <option value="Insurance Pending">Insurance (TPA)</option>
                        <option value="Insurance Accepted">Pre-Approved</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Surgical Consumables</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['Mesh (15×15)', 'Mesh (12×6)', 'Harmonic Scalpel', 'Stapler Device', 'Disposable Kit', 'Knee Implant', 'Stent'].map(item => (
                      <button 
                        key={item}
                        onClick={() => toggleEquipment(item)}
                        className={`px-4 py-3 rounded-xl text-[10px] font-bold border transition-all ${
                          (packageForm.equipment || []).includes(item)
                          ? 'bg-hospital-50 border-hospital-500 text-hospital-700 shadow-md'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between no-print">
               <div className="flex gap-4">
                  <button 
                    onClick={() => handleSavePackage(ProposalStatus.SurgeryLost)}
                    className="flex items-center gap-2 px-8 py-4 border-2 border-red-500 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95"
                  >
                    <XCircle className="w-4 h-4" /> Surgery Lost
                  </button>
                  <button 
                    onClick={() => handleSavePackage(ProposalStatus.FollowUp)}
                    className="flex items-center gap-2 px-8 py-4 border-2 border-hospital-500 text-hospital-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-hospital-50 transition-all active:scale-95"
                  >
                    <Clock className="w-4 h-4" /> Set Follow-Up
                  </button>
               </div>
               
               <button 
                onClick={() => handleSavePackage(ProposalStatus.SurgeryFixed)}
                disabled={isSaving}
                className="flex items-center gap-3 px-12 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50"
               >
                 {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                 Fix Surgery Date
               </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-20">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100">
               <Briefcase className="w-10 h-10 opacity-10" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Select a Patient Profile</h3>
            <p className="text-xs text-slate-400 mt-3 font-medium text-center max-w-xs">
              Review doctor assessments and build personalized financial packages for surgical candidates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const FileText: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
