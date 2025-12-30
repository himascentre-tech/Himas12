
import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal, Role, SurgeonCode, ProposalStatus } from '../types';
import { Briefcase, Calendar, AlertTriangle, Wand2, CheckCircle2, UserPlus, Users, BadgeCheck, Mail, Phone, User, Lock, Clock, Filter, Search, ArrowRight, XCircle, Trophy, History } from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal, staffUsers, registerStaff } = useHospital();
  
  // Tabs: 'counseling' | 'staff'
  const [activeTab, setActiveTab] = useState<'counseling' | 'staff'>('counseling');

  // --- Counseling Dashboard State ---
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [counselingFilter, setCounselingFilter] = useState<'PENDING' | 'DUE_FOLLOWUPS' | 'CONVERTED' | 'ALL_ACTIVE'>('DUE_FOLLOWUPS');
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

      if (counselingFilter === 'PENDING') {
        return status === ProposalStatus.Pending;
      }
      if (counselingFilter === 'DUE_FOLLOWUPS') {
        // Due today or overdue
        return status === ProposalStatus.FollowUp && (p.packageProposal?.followUpDate || '') <= today;
      }
      if (counselingFilter === 'CONVERTED') {
        return status === ProposalStatus.SurgeryFixed || status === ProposalStatus.SurgeryLost;
      }
      if (counselingFilter === 'ALL_ACTIVE') {
        return status === ProposalStatus.Pending || status === ProposalStatus.FollowUp;
      }
      return true;
    }).sort((a, b) => {
      // Sort due follow-ups by date (earliest first)
      const dateA = a.packageProposal?.followUpDate || '9999-99-99';
      const dateB = b.packageProposal?.followUpDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  }, [patients, counselingFilter, today]);

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
    if (p.packageProposal) {
      setProposal(p.packageProposal);
    } else {
      setProposal({
        decisionPattern: 'Standard',
        objectionIdentified: '',
        counselingStrategy: '',
        followUpDate: '',
        status: ProposalStatus.Pending
      });
    }
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
      const isClosingOutcome = newStatus === ProposalStatus.SurgeryFixed || newStatus === ProposalStatus.SurgeryLost;
      
      updatePackageProposal(selectedPatient.id, {
        ...proposal as PackageProposal,
        status: newStatus,
        proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString(),
        lastFollowUpAt: new Date().toISOString(),
        outcomeDate: isClosingOutcome ? today : proposal.outcomeDate
      });
      setSelectedPatient(null);
    }
  };

  const handleRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.mobile || !newStaff.role || !newStaff.email || !newStaff.password) return;
    
    if (staffUsers.some(u => u.mobile === newStaff.mobile || u.email.toLowerCase() === newStaff.email.toLowerCase())) {
      alert("User with this mobile number or email already exists.");
      return;
    }

    registerStaff(newStaff);
    setStaffSuccess(`Successfully registered ${newStaff.name} as ${newStaff.role}`);
    setNewStaff({ name: '', email: '', mobile: '', role: 'FRONT_OFFICE', password: '' });
    setTimeout(() => setStaffSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Counseling Operations</h2>
          <p className="text-gray-500 text-sm">Patient Conversion & Staff Registry</p>
        </div>
        
        <div className="flex bg-white rounded-2xl p-1.5 border shadow-sm ring-4 ring-slate-50">
          <button
            onClick={() => setActiveTab('counseling')}
            className={`px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'counseling' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Patient Pipeline
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'staff' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" /> Staff Management
          </button>
        </div>
      </div>

      {activeTab === 'counseling' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100">
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto p-1">
              <button
                onClick={() => setCounselingFilter('PENDING')}
                className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  counselingFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border hover:bg-white'
                }`}
              >
                <Clock className="w-4 h-4" /> New Candidates
              </button>
              <button
                onClick={() => setCounselingFilter('DUE_FOLLOWUPS')}
                className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  counselingFilter === 'DUE_FOLLOWUPS' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border hover:bg-white'
                }`}
              >
                <Calendar className="w-4 h-4" /> Due Follow-ups
              </button>
              <button
                onClick={() => setCounselingFilter('CONVERTED')}
                className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  counselingFilter === 'CONVERTED' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border hover:bg-white'
                }`}
              >
                <History className="w-4 h-4" /> Converted Cases
              </button>
              <button
                onClick={() => setCounselingFilter('ALL_ACTIVE')}
                className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  counselingFilter === 'ALL_ACTIVE' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border hover:bg-white'
                }`}
              >
                <Filter className="w-4 h-4" /> All Active
              </button>
            </div>
            <ExportButtons patients={patients} role="package_team" />
          </div>

          <div className="flex h-[calc(100vh-280px)] gap-6">
            {/* Candidate List Side */}
            <div className="w-1/3 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {counselingFilter === 'PENDING' ? 'Waiting for First Call' : counselingFilter === 'DUE_FOLLOWUPS' ? 'Priority Follow-ups' : counselingFilter === 'CONVERTED' ? 'Outcome Records' : 'Full Active Pipeline'}
                </span>
                <span className="bg-white border text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{filteredPatients.length}</span>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-3">
                {filteredPatients.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handlePatientSelect(p)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedPatient?.id === p.id 
                        ? 'border-hospital-500 bg-hospital-50 shadow-md ring-4 ring-hospital-50' 
                        : 'border-transparent bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-slate-800 truncate">{p.name}</div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                        p.packageProposal?.status === ProposalStatus.FollowUp ? 'bg-blue-100 text-blue-600' : 
                        p.packageProposal?.status === ProposalStatus.SurgeryFixed ? 'bg-emerald-100 text-emerald-600' :
                        p.packageProposal?.status === ProposalStatus.SurgeryLost ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {p.packageProposal?.status === ProposalStatus.SurgeryFixed ? 'Fixed' : 
                         p.packageProposal?.status === ProposalStatus.SurgeryLost ? 'Lost' : 
                         p.packageProposal?.status || 'New'}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 flex flex-wrap gap-2">
                       <span className="text-hospital-600 uppercase">{p.condition}</span>
                       <span>•</span>
                       <span>{p.doctorAssessment?.conversionReadiness}</span>
                    </div>
                    {p.packageProposal?.followUpDate && p.packageProposal.status === ProposalStatus.FollowUp && (
                       <div className={`mt-3 flex items-center gap-1.5 text-[9px] font-bold ${p.packageProposal.followUpDate <= today ? 'text-red-500' : 'text-slate-400'}`}>
                         <Calendar className="w-3 h-3" /> {p.packageProposal.followUpDate === today ? 'Due Today' : p.packageProposal.followUpDate < today ? `Overdue: ${p.packageProposal.followUpDate}` : `Next: ${p.packageProposal.followUpDate}`}
                       </div>
                    )}
                    {p.packageProposal?.outcomeDate && (p.packageProposal.status === ProposalStatus.SurgeryFixed || p.packageProposal.status === ProposalStatus.SurgeryLost) && (
                      <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                        <CheckCircle2 className="w-3 h-3" /> Outcome Date: {p.packageProposal.outcomeDate}
                      </div>
                    )}
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">All tasks completed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Interaction Form Side */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              {selectedPatient ? (
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b bg-slate-50/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
                             <User className="w-5 h-5 text-hospital-600" />
                           </div>
                           <h3 className="text-2xl font-bold text-slate-900">{selectedPatient.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                           <div className="flex flex-col">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Condition</span>
                             <span className="text-xs font-bold text-slate-700">{selectedPatient.condition}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recommended</span>
                             <span className="text-xs font-bold text-slate-700">{selectedPatient.doctorAssessment?.surgeryProcedure || 'Surgery'}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact</span>
                             <span className="text-xs font-mono font-bold text-slate-700">{selectedPatient.mobile}</span>
                           </div>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Doc Code</div>
                         <div className="bg-hospital-600 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow-lg shadow-hospital-100">
                            {selectedPatient.doctorAssessment?.quickCode}
                         </div>
                      </div>
                    </div>
                  </div>

                  <form className="flex-1 overflow-y-auto p-8 space-y-8" onSubmit={e => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <section className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5" /> Decision Pattern
                          </label>
                          <select 
                            className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:ring-4 focus:ring-slate-50 outline-none transition-all appearance-none bg-slate-50/30"
                            value={proposal.decisionPattern}
                            onChange={e => setProposal({...proposal, decisionPattern: e.target.value})}
                          >
                            <option value="Standard">Standard Case</option>
                            <option value="Quick Decider">Quick Decider</option>
                            <option value="Consultative">Family Consultation Needed</option>
                            <option value="Price Sensitive">Price Sensitive / Financial Barriers</option>
                            <option value="Skeptical">Skeptical / Needs Clinical Reassurance</option>
                          </select>
                       </section>

                       <section className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> Core Objection
                          </label>
                          <input 
                            type="text" 
                            className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:ring-4 focus:ring-slate-50 outline-none transition-all bg-slate-50/30"
                            placeholder="e.g. Cost, Time, or Fear..."
                            value={proposal.objectionIdentified}
                            onChange={e => setProposal({...proposal, objectionIdentified: e.target.value})}
                          />
                       </section>
                    </div>

                    <section className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5" /> AI Counseling Strategy
                          </label>
                          <button 
                            type="button"
                            onClick={handleGenerateAIStrategy}
                            disabled={aiLoading}
                            className="text-[9px] font-bold bg-slate-900 text-white px-4 py-1.5 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                          >
                            {aiLoading ? <Clock className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            {aiLoading ? 'Analyzing...' : 'Refresh AI Strategy'}
                          </button>
                       </div>
                       <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 border-dashed relative">
                          <textarea 
                            className="w-full bg-transparent border-none outline-none text-slate-700 font-medium italic text-sm min-h-[120px] resize-none leading-relaxed"
                            placeholder="Generate strategy or type custom approach..."
                            value={proposal.counselingStrategy}
                            onChange={e => setProposal({...proposal, counselingStrategy: e.target.value})}
                          />
                       </div>
                    </section>

                    <section className="space-y-4">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Clock className="w-3.5 h-3.5" /> New Follow-up Date (Next Call)
                       </label>
                       <input 
                         type="date" 
                         min={today}
                         className="max-w-xs border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:ring-4 focus:ring-slate-50 outline-none transition-all bg-slate-50/30 block"
                         value={proposal.followUpDate}
                         onChange={e => setProposal({...proposal, followUpDate: e.target.value})}
                       />
                    </section>

                    <div className="pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <button 
                         type="button" 
                         disabled={!proposal.followUpDate}
                         onClick={() => updateStatusAndSave(ProposalStatus.FollowUp)}
                         className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
                       >
                         <Calendar className="w-5 h-5" /> Log Follow-up Call
                       </button>
                       <button 
                         type="button" 
                         onClick={() => updateStatusAndSave(ProposalStatus.SurgeryLost)}
                         className="flex-1 py-4 border-2 border-red-50 text-red-600 hover:bg-red-50 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                       >
                         <XCircle className="w-5 h-5" /> Surgery Lost
                       </button>
                       <button 
                         type="button" 
                         onClick={() => updateStatusAndSave(ProposalStatus.SurgeryFixed)}
                         className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                       >
                         <Trophy className="w-5 h-5" /> Surgery Fixed!
                       </button>
                    </div>
                  </form>
                </div>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-slate-50/20">
                    <div className="bg-white p-10 rounded-full shadow-sm border border-slate-100 mb-6">
                       <Briefcase className="w-20 h-20 text-hospital-500 opacity-20" />
                    </div>
                    <p className="text-xl font-bold text-slate-400 tracking-tight">Counseling Hub</p>
                    <p className="text-xs text-slate-300 mt-2 font-bold uppercase tracking-widest max-w-xs">Select a candidate to manage follow-up calls and closure outcomes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // --- STAFF MANAGEMENT VIEW ---
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="md:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-purple-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-50" />
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <UserPlus className="w-6 h-6 text-purple-600" /> New Staff Member
            </h3>
            
            <form onSubmit={handleRegisterStaff} className="space-y-5 relative">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Identity Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    required type="text" placeholder="Dr. Alice Smith"
                    className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-purple-50 outline-none font-bold"
                    value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Institutional Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    required type="email" placeholder="alice@himas.com"
                    className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-purple-50 outline-none font-bold"
                    value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Access Credentials</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    required type="password" placeholder="••••••••"
                    className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-purple-50 outline-none font-bold"
                    value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Verified Mobile</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs border-r pr-2 border-slate-200">
                     +91
                  </span>
                  <input 
                    required type="tel" placeholder="9876543210"
                    className="w-full pl-24 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-purple-50 outline-none font-mono font-bold tracking-wide"
                    value={newStaff.mobile} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setNewStaff({...newStaff, mobile: val});
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Access Level (Role)</label>
                <select 
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-50 outline-none appearance-none"
                  value={newStaff.role || 'FRONT_OFFICE'}
                  onChange={e => setNewStaff({...newStaff, role: e.target.value as Role})}
                >
                  <option value="FRONT_OFFICE">Front Office / Registry</option>
                  <option value="DOCTOR">Doctor / Medical Evaluator</option>
                  <option value="PACKAGE_TEAM">Admin / Package Team</option>
                </select>
              </div>

              {staffSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-xl border border-emerald-100 flex items-center gap-2 animate-in fade-in duration-300">
                  <BadgeCheck className="w-4 h-4" /> {staffSuccess}
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-sm hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all active:scale-95">
                Register Authorized User
              </button>
            </form>
          </div>

          {/* User List */}
          <div className="md:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-slate-50/50 font-bold text-slate-700 flex justify-between items-center">
              <span className="text-sm tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Authorized Staff Directory
              </span>
              <span className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 font-bold uppercase tracking-widest">{staffUsers.length} Users Found</span>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {staffUsers.map(user => (
                  <div key={user.id} className="p-5 bg-slate-50/50 border border-slate-100 rounded-3xl flex items-center gap-4 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-inner transition-transform group-hover:scale-110
                      ${user.role === 'DOCTOR' ? 'bg-blue-500' : user.role === 'PACKAGE_TEAM' ? 'bg-purple-500' : 'bg-emerald-500'}
                    `}>
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{user.name}</div>
                      <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
                        user.role === 'DOCTOR' ? 'text-blue-500' : user.role === 'PACKAGE_TEAM' ? 'text-purple-500' : 'text-emerald-500'
                      }`}>
                        {user.role}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 font-mono truncate">{user.email}</div>
                    </div>
                    {user.role === 'PACKAGE_TEAM' && (
                      <BadgeCheck className="w-6 h-6 text-purple-500 opacity-30 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                ))}
                {staffUsers.length === 0 && (
                  <div className="col-span-full py-16 text-center">
                     <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Registered Staff</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
