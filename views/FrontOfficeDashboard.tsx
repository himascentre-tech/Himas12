
import React, { useState, useEffect, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Gender, Condition, Patient, ProposalStatus } from '../types';
import { 
  PlusCircle, Search, CheckCircle, Clock, 
  Pencil, User, Loader2, Calendar, 
  Phone, ChevronRight, AlertCircle, X,
  Stethoscope, Users, History, Timer, ArrowRight,
  Filter, ChevronLeft, ChevronRight as ChevronRightIcon,
  Globe, UserPlus, ShieldCheck
} from 'lucide-react';

type TabType = 'NEW' | 'HISTORY' | 'OLD';

export const FrontOfficeDashboard: React.FC = () => {
  const { patients, addPatient, updatePatient, lastErrorMessage, clearError } = useHospital();
  const [activeTab, setActiveTab] = useState<TabType>('HISTORY');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [otherSourceDetail, setOtherSourceDetail] = useState('');
  
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date().toISOString().split('T')[0]);

  const [revisitPatient, setRevisitPatient] = useState<Patient | null>(null);
  const [revisitData, setRevisitData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  });

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<Patient>>({
    id: '', 
    name: '',
    dob: '',
    entry_date: getTodayDate(),
    gender: Gender.Male,
    age: 0,
    mobile: '',
    occupation: '',
    hasInsurance: 'No',
    insuranceName: '',
    source: 'Google',
    sourceDoctorName: '',
    condition: Condition.Piles 
  });

  const historyOPDList = useMemo(() => {
    const filterDate = selectedHistoryDate;
    const list: Array<{ patient: Patient; arrivalTime: string; type: 'NEW' | 'OLD' }> = [];
    
    patients.forEach(p => {
      if (p.entry_date === filterDate) {
        let timeDisplay = '--:--';
        if (p.created_at) {
          try {
            const dateObj = new Date(p.created_at);
            if (!isNaN(dateObj.getTime())) {
              // Standardize to 24h HH:mm format
              timeDisplay = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            }
          } catch (e) { console.warn("Time parse error", e); }
        }

        list.push({ 
          patient: p, 
          arrivalTime: timeDisplay,
          type: 'NEW' 
        });
      }
      
      if (p.lastFollowUpVisitDate?.startsWith(filterDate)) {
         const parts = p.lastFollowUpVisitDate.split(' ');
         const timePart = parts.length > 1 ? parts[1] : '--:--';
         list.push({
           patient: p,
           arrivalTime: timePart,
           type: 'OLD'
         });
      }
    });

    return list.sort((a, b) => b.arrivalTime.localeCompare(a.arrivalTime));
  }, [patients, selectedHistoryDate]);

  useEffect(() => {
    if (formData.dob) {
      const birth = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, age: age > 0 ? age : 0 }));
    }
  }, [formData.dob]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!formData.name || !formData.mobile || !formData.age) {
      setLocalError("Please fill in Name, Mobile, and Age.");
      return;
    }
    if (formData.hasInsurance === 'Yes' && !formData.insuranceName?.trim()) {
      setLocalError("Please specify the Insurance Provider Name.");
      return;
    }
    if (formData.source === 'Doctor Recommended' && !formData.sourceDoctorName?.trim()) {
      setLocalError("Referral Doctor Name is required for Doctor Recommended source.");
      return;
    }
    if (formData.source === 'Other' && !otherSourceDetail.trim()) {
      setLocalError("Please specify the source details.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Registry ID is optional - generate unique fallback if left blank
    const finalId = formData.id?.trim().toUpperCase() || `AUTO-${Date.now().toString().slice(-6)}`;

    // Check for duplicate File ID only if we are creating NEW and ID was provided
    if (!editingId && patients.some(p => p.id.toLowerCase() === finalId.toLowerCase())) {
      setLocalError(`Patient File ID "${finalId}" is already registered.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSource = formData.source === 'Other' ? `Other: ${otherSourceDetail}` : formData.source;
      const submissionData = { ...formData, source: finalSource, id: finalId };

      if (editingId) {
        const original = patients.find(p => p.id === editingId);
        if (original) {
          // Allow updating the actual Primary Key 'id'
          await updatePatient({ ...original, ...submissionData as Patient }, editingId);
        }
      } else {
        await addPatient(submissionData as any);
      }
      
      setShowForm(false);
      resetForm();
      setActiveTab('HISTORY');
    } catch (err: any) {
      setLocalError(err.message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevisitSubmit = async () => {
    if (!revisitPatient) return;
    setIsSubmitting(true);
    try {
      const timestamp = `${revisitData.date} ${revisitData.time}`;
      await updatePatient({
        ...revisitPatient,
        isFollowUpVisit: true,
        lastFollowUpVisitDate: timestamp
      });
      setRevisitPatient(null);
      setActiveTab('HISTORY');
      setSelectedHistoryDate(revisitData.date);
    } catch (err: any) {
      setLocalError("Revisit update failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '', name: '', dob: '', entry_date: getTodayDate(), gender: Gender.Male, age: 0, mobile: '', occupation: '',
      hasInsurance: 'No', insuranceName: '', source: 'Google', sourceDoctorName: '', condition: Condition.Piles
    });
    setOtherSourceDetail('');
    setEditingId(null);
    setStep(1);
    setLocalError(null);
  };

  const handleEdit = (p: Patient) => {
    let baseSource = p.source;
    let detail = '';
    if (p.source && p.source.startsWith('Other: ')) {
      baseSource = 'Other';
      detail = p.source.replace('Other: ', '');
    }

    setFormData({ ...p, source: baseSource });
    setOtherSourceDetail(detail);
    setEditingId(p.id);
    setStep(1);
    setShowForm(true);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedHistoryDate);
    d.setDate(d.getDate() + days);
    setSelectedHistoryDate(d.toISOString().split('T')[0]);
  };

  const sources = [
    "Google", "Facebook", "Instagram", "WhatsApp", "YouTube", 
    "Website", "Doctor Recommended", "Old Patient / Friends / Relatives", 
    "Saw Hospital Board Outside", "Other"
  ];

  const filteredArchive = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const searchLower = searchTerm.toLowerCase();
    const cleanSearchDigits = searchTerm.replace(/\D/g, '');
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.id.toLowerCase().includes(searchLower) ||
      (cleanSearchDigits && p.mobile.includes(cleanSearchDigits))
    );
  }, [patients, searchTerm]);

  const isToday = selectedHistoryDate === getTodayDate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Front Office</h2>
          <p className="text-gray-500 text-sm">Registry Operations & Daily OPD</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border shadow-sm">
          <button 
            onClick={() => { resetForm(); setShowForm(true); }} 
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === 'NEW' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PlusCircle className="w-4 h-4" /> Register New
          </button>
          <button 
            onClick={() => { setActiveTab('HISTORY'); setSearchTerm(''); }} 
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === 'HISTORY' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Timer className="w-4 h-4" /> OPD History
          </button>
          <button 
            onClick={() => { setActiveTab('OLD'); setSearchTerm(''); }} 
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === 'OLD' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Search className="w-4 h-4" /> Archive Search
          </button>
        </div>
      </div>

      {activeTab === 'HISTORY' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`border p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-colors ${isToday ? 'bg-hospital-50 border-hospital-100' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl shadow-sm ${isToday ? 'bg-hospital-600 text-white' : 'bg-slate-700 text-white'}`}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">{isToday ? 'Today\'s OPD Ledger' : 'Historical OPD Ledger'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => shiftDate(-1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                  <input 
                    type="date" 
                    className="bg-transparent font-bold text-xs text-slate-500 uppercase tracking-widest focus:outline-none cursor-pointer hover:text-hospital-600"
                    value={selectedHistoryDate}
                    onChange={e => setSelectedHistoryDate(e.target.value)}
                  />
                  <button onClick={() => shiftDate(1)} disabled={isToday} className="p-1 hover:bg-white rounded-lg transition-colors disabled:opacity-20"><ChevronRightIcon className="w-4 h-4 text-slate-400" /></button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8 px-6 py-2 bg-white/50 rounded-2xl border border-white/50 backdrop-blur-sm">
               <div className="text-center min-w-[60px]">
                 <div className="text-2xl font-black text-slate-900 leading-none">{historyOPDList.length}</div>
                 <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Total Visits</div>
               </div>
               <div className="w-px h-10 bg-slate-200" />
               <div className="text-center min-w-[60px]">
                 <div className="text-2xl font-black text-blue-600 leading-none">{historyOPDList.filter(v => v.type === 'NEW').length}</div>
                 <div className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter mt-1">New Files</div>
               </div>
               <div className="w-px h-10 bg-slate-200" />
               <div className="text-center min-w-[60px]">
                 <div className="text-2xl font-black text-amber-600 leading-none">{historyOPDList.filter(v => v.type === 'OLD').length}</div>
                 <div className="text-[8px] font-bold text-amber-400 uppercase tracking-tighter mt-1">Revisits</div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
                <tr>
                  <th className="px-6 py-4">Arrival Time</th>
                  <th className="px-6 py-4">File ID</th>
                  <th className="px-6 py-4">Patient Profile</th>
                  <th className="px-6 py-4">Condition</th>
                  <th className="px-6 py-4">Lead Source</th>
                  <th className="px-6 py-4 text-center">Visit Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyOPDList.map((entry, idx) => (
                  <tr key={`${entry.patient.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-700">
                        <Clock className="w-4 h-4 text-slate-300 group-hover:text-hospital-500 transition-colors" />
                        {entry.arrivalTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-hospital-600 bg-hospital-50 px-2 py-1 rounded-lg border border-hospital-100">{entry.patient.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-hospital-700 transition-colors">{entry.patient.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{entry.patient.age}y • {entry.patient.gender} • {entry.patient.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-hospital-600 uppercase tracking-tighter bg-hospital-50 px-2 py-1 rounded-md">{entry.patient.condition}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <Globe className="w-3 h-3 text-slate-300" />
                        {entry.patient.source}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${entry.type === 'NEW' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {entry.type === 'NEW' ? <PlusCircle className="w-3 h-3" /> : <History className="w-3 h-3" />}
                        {entry.type === 'NEW' ? 'New Registration' : 'Return Revisit'}
                      </span>
                    </td>
                  </tr>
                ))}
                {historyOPDList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-24 text-center">
                      <div className="bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-slate-100">
                        <Users className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-slate-400 text-sm font-bold">No visits recorded for this date.</p>
                      <button onClick={() => setSelectedHistoryDate(getTodayDate())} className="text-hospital-600 text-[10px] uppercase font-bold tracking-widest mt-2 hover:underline">Return to Today</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'OLD' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="relative w-full md:w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by Patient Name, Phone Number, or File Registration ID..." 
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all font-medium text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-shrink-0">
               <ExportButtons patients={patients} role="front_office" />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-6 py-4">File ID</th>
                    <th className="px-6 py-4">Patient Profile</th>
                    <th className="px-6 py-4">Original DOP</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4 text-center">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredArchive.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-hospital-600 bg-hospital-50 px-2.5 py-1.5 rounded-lg border border-hospital-100">{p.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-hospital-700 transition-colors">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] text-slate-400 font-medium">{p.age}y • {p.gender}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-200" />
                           <span className="text-[10px] text-hospital-500 font-bold">{p.condition}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-hospital-500" />
                          {p.entry_date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-hospital-500" />
                          {p.mobile}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => setRevisitPatient(p)} 
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-[10px] border border-amber-100 hover:bg-amber-100 transition-all shadow-sm active:scale-95"
                          >
                            <History className="w-3.5 h-3.5" /> Log Revisit
                          </button>
                          <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="bg-hospital-100 p-3 rounded-2xl">
                   <User className="w-8 h-8 text-hospital-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{editingId ? 'Update Registry Profile' : 'New Patient Registration'}</h1>
                  <p className="text-sm text-slate-400 font-medium">Step {step} of 2 • {step === 1 ? 'Core Demographics' : 'Registry Assignment'}</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setActiveTab('HISTORY'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-8 h-8 text-slate-400" />
              </button>
            </div>

            <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="p-12 space-y-12">
              {step === 1 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-14 animate-in slide-in-from-left-4 duration-300">
                  <div className="space-y-8">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block border-b pb-3">1. Identity</label>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Presentation Date *</label>
                      <input required type="date" className="w-full bg-hospital-50 border border-hospital-100 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-hospital-500 outline-none font-bold text-hospital-700 text-base" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Full Legal Name *</label>
                      <input required type="text" placeholder="First Last" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium text-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Age *</label>
                        <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium text-base" value={formData.age || ''} onChange={e => setFormData({...formData, age: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Gender *</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium text-base" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as Gender})}>
                          {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block border-b pb-3">2. Contact & Billing</label>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Mobile *</label>
                      <input required type="tel" placeholder="10-digit number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium text-base" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Primary Occupation</label>
                      <input type="text" placeholder="e.g. Professional" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium text-base" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Insurance Cover</label>
                      <div className="flex gap-3">
                        {['Yes', 'No', 'Not Sure'].map(opt => (
                          <button key={opt} type="button" onClick={() => {
                            setFormData({...formData, hasInsurance: opt as any});
                            if (opt !== 'Yes') setFormData(prev => ({...prev, insuranceName: ''}));
                          }} className={`flex-1 py-3 text-xs font-bold rounded-xl border-2 transition-all ${formData.hasInsurance === opt ? 'bg-hospital-500 border-hospital-500 text-white shadow-md shadow-hospital-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                      {formData.hasInsurance === 'Yes' && (
                        <div className="animate-in slide-in-from-top-2 duration-200 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 mt-4">
                          <label className="block text-xs font-bold text-emerald-600 uppercase mb-2 tracking-widest">Insurance Provider Name *</label>
                          <div className="relative">
                             <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                             <input required type="text" placeholder="e.g. Star Health, LIC..." className="w-full pl-12 pr-5 py-3.5 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-base text-slate-700" value={formData.insuranceName || ''} onChange={e => setFormData({...formData, insuranceName: e.target.value})} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block border-b pb-3">3. Referral & Clinical</label>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Clinical Condition *</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium text-base" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value as Condition})}>
                        {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Lead Source *</label>
                      <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {sources.map(s => (
                          <label key={s} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${formData.source === s ? 'bg-hospital-50 border-hospital-200 text-hospital-700 font-bold' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                            <input type="radio" className="hidden" name="source" value={s} checked={formData.source === s} onChange={() => { 
                              setFormData({...formData, source: s, sourceDoctorName: ''});
                              if (s !== 'Other') setOtherSourceDetail('');
                            }} />
                            <span className="text-[11px] truncate tracking-tight">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-14 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-y-10 gap-x-12">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Patient Name</label>
                      <div className="text-2xl font-bold text-slate-900 truncate">{formData.name}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Age</label>
                      <div className="text-2xl font-bold text-slate-900">{formData.age} yrs</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Mobile No</label>
                      <div className="text-2xl font-bold text-slate-900">{formData.mobile}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Condition</label>
                      <div className="text-2xl font-bold text-hospital-600">{formData.condition}</div>
                    </div>
                  </div>
                  <div className="space-y-6 text-center">
                    <label className="block text-sm font-bold text-hospital-600 uppercase tracking-widest mb-6">Registry File ID Assignment</label>
                    <input type="text" placeholder="HIMAS-XXX" className="w-full max-w-lg mx-auto border-b-4 py-6 focus:outline-none text-6xl font-mono uppercase font-bold text-center border-hospital-500 transition-colors bg-transparent placeholder:text-slate-100" value={formData.id} onChange={e => { setFormData({...formData, id: e.target.value}); setLocalError(null); }} />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Unique Physical File Identifier (Optional)</p>
                  </div>
                </div>
              )}

              {localError && (
                <div className="p-5 bg-red-50 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-4 animate-pulse">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  {localError}
                </div>
              )}

              <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <button type="button" onClick={() => step === 2 ? setStep(1) : setShowForm(false)} className="w-full sm:w-auto text-slate-400 font-bold px-10 py-4 hover:text-slate-600 transition-colors text-base">
                  {step === 1 ? 'Cancel' : 'Go Back'}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-hospital-600 text-white px-16 py-4.5 rounded-2xl font-bold flex items-center justify-center gap-4 shadow-xl shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50 text-base"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{step === 1 ? 'Confirm Details' : (editingId ? 'Save Changes' : 'Finalize Entry')}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
