
import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Gender, Condition, Patient } from '../types';
import { 
  PlusCircle, Search, CheckCircle, Clock, ArrowLeft, 
  Pencil, Trash2, Activity, User, Loader2, Calendar, 
  Phone, Briefcase, ChevronRight, Check, AlertCircle, X, Search as SearchIcon, Hash, MapPin, Cake,
  FileText, Info
} from 'lucide-react';

export const FrontOfficeDashboard: React.FC = () => {
  const { patients, addPatient, updatePatient, deletePatient, saveStatus, lastErrorMessage, clearError } = useHospital();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
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
    condition: Condition.Piles 
  });

  // Auto-calculate age from DOB
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
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!editingId && (!formData.id || formData.id.trim().length === 0)) {
        setLocalError("Please provide a File Registration ID in Step 2.");
        return;
    }

    if (!editingId && patients.some(p => p.id.toLowerCase() === formData.id?.trim().toLowerCase())) {
      setLocalError(`Patient File ID "${formData.id}" is already registered.`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingId) {
        const original = patients.find(p => p.id === editingId);
        if (original) {
          await updatePatient({ ...original, ...formData as Patient });
        }
      } else {
        await addPatient({ ...formData, id: formData.id?.trim().toUpperCase() } as any);
      }
      
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      console.error("Submission failed:", err);
      const errorMessage = err instanceof Error ? err.message : 
                          (typeof err === 'string' ? err : 
                          (err?.message ? err.message : "Submission failed. Check your database setup."));
      setLocalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '', name: '', dob: '', entry_date: getTodayDate(), gender: Gender.Male, age: 0, mobile: '', occupation: '',
      hasInsurance: 'No', insuranceName: '', source: 'Google', condition: Condition.Piles
    });
    setEditingId(null);
    setStep(1);
    setLocalError(null);
    clearError();
  };

  const handleEdit = (p: Patient) => {
    setFormData({ ...p });
    setEditingId(p.id);
    setStep(1);
    setShowForm(true);
  };

  const sources = [
    "Google", "Facebook", "Instagram", "WhatsApp", "YouTube", 
    "Website", "Doctor Recommended", "Old Patient / Family / Friend", 
    "Hospital Board / Signage", "Other"
  ];

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Front Office</h2>
          <p className="text-gray-500 text-sm">Patient Intake & Registration</p>
        </div>
        <div className="flex items-center gap-3">
           <ExportButtons patients={patients} role="front_office" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search files or names..." 
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-hospital-600 text-white px-6 py-2.5 rounded-xl hover:bg-hospital-700 flex items-center gap-2 font-bold shadow-lg shadow-hospital-100 transition-all active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          New Patient Entry
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-hospital-100 p-2.5 rounded-2xl">
                   <User className="w-6 h-6 text-hospital-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{editingId ? 'Update Patient Record' : 'Register New Patient'}</h1>
                  <p className="text-xs text-slate-400 font-medium">Step {step} of 2 • {step === 1 ? 'Patient Details' : 'File Assignment'}</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="p-8 space-y-8">
              {step === 1 ? (
                /* STEP 1: Details Collection */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in slide-in-from-left-4 duration-300">
                  {/* Personal Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-hospital-600 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Context</h3>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">DOP (Entry Date) *</label>
                      <input required type="date" className="w-full bg-hospital-50 border border-hospital-100 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-hospital-500 outline-none font-bold text-hospital-700" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Patient Full Name *</label>
                      <input required type="text" placeholder="John Doe" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Age *</label>
                        <input required type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium" value={formData.age || ''} onChange={e => setFormData({...formData, age: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date of Birth</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Gender *</label>
                      <div className="flex gap-4">
                        {Object.values(Gender).map(g => (
                          <label key={g} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 cursor-pointer transition-all ${formData.gender === g ? 'border-hospital-500 bg-hospital-50 text-hospital-700 font-bold' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100'}`}>
                            <input type="radio" className="hidden" name="gender" value={g} checked={formData.gender === g} onChange={() => setFormData({...formData, gender: g})} />
                            <span className="text-xs">{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-hospital-600 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Contact & Insurance</h3>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mobile Number *</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-hospital-500 transition-all">
                        <span className="text-slate-400 font-bold mr-2">+91</span>
                        <input required type="tel" placeholder="9876543210" className="bg-transparent flex-1 outline-none font-medium" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Occupation</label>
                      <input type="text" placeholder="e.g. Self-Employed" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Insurance Availability</label>
                      <div className="flex gap-2">
                        {['Yes', 'No', 'Not Sure'].map(opt => (
                          <button key={opt} type="button" onClick={() => setFormData({...formData, hasInsurance: opt as any})} className={`flex-1 py-2 text-xs font-bold rounded-xl border-2 transition-all ${formData.hasInsurance === opt ? 'bg-hospital-500 border-hospital-500 text-white shadow-md shadow-hospital-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.hasInsurance === 'Yes' && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Insurance Provider Name</label>
                        <input type="text" placeholder="e.g. Star Health" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium" value={formData.insuranceName} onChange={e => setFormData({...formData, insuranceName: e.target.value})} />
                      </div>
                    )}
                  </div>

                  {/* Referral Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-hospital-600 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Case Details</h3>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Presenting Condition *</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-hospital-500 outline-none font-medium" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value as Condition})}>
                        {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Source of Reference</label>
                      <div className="grid grid-cols-2 gap-2">
                        {sources.map(s => (
                          <label key={s} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${formData.source === s ? 'bg-hospital-50 border-hospital-200 text-hospital-700 font-bold' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                            <input type="radio" className="hidden" name="source" value={s} checked={formData.source === s} onChange={() => setFormData({...formData, source: s})} />
                            <span className="text-[10px] truncate">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 2: ID Assignment & Confirmation */
                <div className="max-w-3xl mx-auto space-y-10 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Patient Name</label>
                      <div className="text-xl font-bold text-slate-900">{formData.name}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Date of Birth</label>
                      <div className="text-xl font-bold text-slate-900">{formData.dob ? new Date(formData.dob).toLocaleDateString('en-IN') : 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Phone Number</label>
                      <div className="text-xl font-bold text-slate-900">+91 {formData.mobile}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Age / Gender</label>
                      <div className="text-xl font-bold text-slate-900">{formData.age} yrs • {formData.gender}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Presenting Condition</label>
                      <div className="text-xl font-bold text-hospital-600">{formData.condition}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">DOP (Entry Date)</label>
                      <div className="text-xl font-bold text-slate-900">{formData.entry_date ? new Date(formData.entry_date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'N/A'}</div>
                    </div>
                  </div>

                  <div className="space-y-4 text-center">
                    <label className="block text-xs font-bold text-hospital-600 uppercase tracking-widest mb-4">Assign File Registration ID *</label>
                    <input required disabled={!!editingId} type="text" placeholder="HIMAS-101" className="w-full max-w-md mx-auto border-b-4 py-4 focus:outline-none text-5xl font-mono uppercase font-bold text-center border-hospital-500 transition-colors bg-transparent placeholder:text-slate-100" value={formData.id} onChange={e => { setFormData({...formData, id: e.target.value}); setLocalError(null); }} />
                    <p className="text-xs text-slate-400 font-medium">Verify all details before finalizing registration</p>
                  </div>
                </div>
              )}

              {/* Status / Error Messages */}
              {(localError || lastErrorMessage) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-red-700 animate-in shake-in duration-300">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold">Registration Alert</p>
                    <p className="font-medium opacity-80 leading-relaxed mt-1">{localError || lastErrorMessage}</p>
                    {lastErrorMessage?.includes('entry_date') && (
                      <div className="mt-3 p-3 bg-red-100/50 rounded-xl border border-red-200">
                         <p className="text-xs font-bold text-red-900 mb-1">Administrator Fix Needed:</p>
                         <code className="text-[10px] bg-white px-2 py-1 rounded block">ALTER TABLE himas_data ADD COLUMN entry_date DATE;</code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button type="button" onClick={() => step === 2 ? setStep(1) : setShowForm(false)} className="w-full sm:w-auto text-slate-400 font-bold px-8 py-3 hover:text-slate-600 transition-colors">
                  {step === 1 ? 'Cancel' : 'Back to Step 1'}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-hospital-600 text-white px-10 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <span>{step === 1 ? 'Next Step' : (editingId ? 'Update Profile' : 'Complete Registration')}</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patients Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">File ID</th>
                <th className="px-6 py-4">Patient Profile</th>
                <th className="px-6 py-4">DOP (Entry Date)</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-hospital-600 bg-hospital-50 px-2.5 py-1.5 rounded-lg border border-hospital-100">{p.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] text-slate-400 font-medium">{p.age} yrs • {p.gender}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-200" />
                       <span className="text-[10px] text-hospital-500 font-bold">{p.condition}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-hospital-500" />
                      {p.entry_date ? new Date(p.entry_date).toLocaleDateString('en-IN') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-hospital-500" />
                      {p.mobile}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${p.doctorAssessment ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {p.doctorAssessment ? <CheckCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                        {p.doctorAssessment ? 'Assessment Done' : 'Awaiting Doc'}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 rounded-xl transition-all" title="Edit Profile"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => window.confirm('Permanently delete this patient record?') && deletePatient(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Profile"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="max-w-xs mx-auto text-slate-300">
                       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 opacity-20" />
                       </div>
                       <p className="text-sm font-bold text-slate-400">No Patient Matches</p>
                       <p className="text-xs font-medium text-slate-300 mt-1">Try searching for a different name or file ID.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
