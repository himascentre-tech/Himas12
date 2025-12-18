import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Gender, Condition, Patient } from '../types';
import { 
  PlusCircle, Search, CheckCircle, Clock, ArrowLeft, 
  Pencil, Trash2, Activity, User, Loader2, Calendar, 
  Phone, Briefcase, ChevronRight, Check, AlertCircle, X, Database
} from 'lucide-react';

export const FrontOfficeDashboard: React.FC = () => {
  const { patients, addPatient, updatePatient, deletePatient, saveStatus, lastErrorMessage, clearError } = useHospital();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState<Partial<Patient>>({
    id: '', 
    name: '',
    dob: '',
    gender: Gender.Male,
    age: 0,
    mobile: '',
    occupation: '',
    hasInsurance: 'No',
    insuranceName: '',
    source: '',
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
    if (step === 1) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Local validation for ID
    if (!editingId && (!formData.id || formData.id.trim().length === 0)) {
        setLocalError("Please provide a File Registration ID.");
        return;
    }

    // Check for duplicate ID locally
    if (!editingId && patients.some(p => p.id.toLowerCase() === formData.id?.trim().toLowerCase())) {
      setLocalError(`Patient File ID "${formData.id}" is already registered.`);
      return;
    }

    setIsSubmitting(true);
    
    // Safety timeout to reset UI if DB hangs
    const submissionTimeout = setTimeout(() => {
        setIsSubmitting(false);
        setLocalError("Database is taking too long to respond. Please check your connection.");
    }, 10000);

    try {
      if (editingId) {
        const original = patients.find(p => p.id === editingId);
        if (original) {
          await updatePatient({ ...original, ...formData as Patient });
        }
      } else {
        await addPatient({ ...formData, id: formData.id?.trim().toUpperCase() } as any);
      }
      
      clearTimeout(submissionTimeout);
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      clearTimeout(submissionTimeout);
      console.error("Submission failed:", err);
      setLocalError(err.message || "A database error occurred. Entry not saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '', name: '', dob: '', gender: Gender.Male, age: 0, mobile: '', occupation: '',
      hasInsurance: 'No', insuranceName: '', source: '', condition: Condition.Piles
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
          New Patient
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-sm flex flex-col overflow-y-auto">
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Patient Record' : 'New Patient Registration'}</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Follow the steps to register</p>
              </div>
            </div>
            <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 md:p-8 flex items-start justify-center">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="px-10 py-5 bg-slate-50/50 border-b flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-hospital-600 text-white' : 'bg-green-500 text-white'}`}>
                    {step === 1 ? '1' : <Check className="w-4 h-4"/>}
                  </div>
                  <span className="font-bold text-slate-800 text-sm">Patient Demographics</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  <span className={step === 1 ? 'text-hospital-600' : ''}>Step 1</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className={step === 2 ? 'text-hospital-600' : ''}>Step 2</span>
                </div>
              </div>

              <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="p-10 space-y-12">
                {step === 1 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                    <div className="space-y-10">
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2">My Name Is:</label>
                        <input required type="text" placeholder="Enter full name" className="w-full border-b border-slate-200 py-2 focus:border-hospital-500 outline-none text-lg placeholder:text-slate-300 font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-4">I Am:</label>
                        <div className="flex gap-8">
                          {Object.values(Gender).map(g => (
                            <label key={g} className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.gender === g ? 'border-hospital-500' : 'border-slate-300 group-hover:border-hospital-400'}`}>
                                {formData.gender === g && <div className="w-2.5 h-2.5 bg-hospital-500 rounded-full" />}
                              </div>
                              <input type="radio" className="hidden" name="gender" value={g} checked={formData.gender === g} onChange={() => setFormData({...formData, gender: g})} />
                              <span className={`text-sm font-semibold ${formData.gender === g ? 'text-slate-900' : 'text-slate-500'}`}>{g}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-2">Date of Birth:</label>
                          <div className="relative">
                            <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="date" className="w-full border-b border-slate-200 py-2 pl-7 focus:border-hospital-500 outline-none text-sm font-medium" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-2">My Age:</label>
                          <div className="flex items-center gap-2">
                             <input required type="number" className="w-full border-b border-slate-200 py-2 focus:border-hospital-500 outline-none text-lg font-medium" value={formData.age} onChange={e => setFormData({...formData, age: Number(e.target.value)})} />
                             <span className="text-slate-400 text-sm">yrs</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8">
                        <label className="block text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-hospital-500" />
                          How Did You Know Himas Hospital Today?
                        </label>
                        <div className="grid grid-cols-2 gap-y-4">
                           {sources.map(s => (
                             <label key={s} className="flex items-center gap-3 cursor-pointer group">
                               <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.source === s ? 'bg-hospital-600 border-hospital-600' : 'border-slate-200 group-hover:border-slate-300'}`}>
                                 {formData.source === s && <Check className="w-3 h-3 text-white" />}
                               </div>
                               <input type="radio" className="hidden" name="source" value={s} checked={formData.source === s} onChange={() => setFormData({...formData, source: s})} />
                               <span className={`text-xs font-semibold ${formData.source === s ? 'text-slate-900' : 'text-slate-400'}`}>{s}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">My Mobile Number:</label>
                        <div className="flex items-center border-b border-slate-200 focus-within:border-hospital-500 transition-colors">
                           <span className="text-slate-900 font-bold mr-2">+91</span>
                           <input required type="tel" placeholder="9876543210" className="flex-1 py-2 outline-none text-lg font-medium placeholder:text-slate-300" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2">My Occupation:</label>
                        <input type="text" placeholder="Current Job / Profession" className="w-full border-b border-slate-200 py-2 focus:border-hospital-500 outline-none text-lg placeholder:text-slate-300 font-medium" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-4">Do I Have Health Insurance?</label>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                          {['Yes', 'No', 'Not Sure'].map(opt => (
                            <button key={opt} type="button" onClick={() => setFormData({...formData, hasInsurance: opt as any})} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${formData.hasInsurance === opt ? 'bg-hospital-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="block text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-red-500" />
                          Condition / Complaint
                        </label>
                        <div className="space-y-3">
                           {Object.values(Condition).map(c => (
                             <label key={c} className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${formData.condition === c ? 'border-hospital-500 bg-hospital-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
                               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.condition === c ? 'border-hospital-500' : 'border-slate-200'}`}>
                                 {formData.condition === c && <div className="w-2.5 h-2.5 bg-hospital-500 rounded-full" />}
                               </div>
                               <input type="radio" className="hidden" name="condition" value={c} checked={formData.condition === c} onChange={() => setFormData({...formData, condition: c})} />
                               <span className={`font-bold ${formData.condition === c ? 'text-slate-900' : 'text-slate-600'}`}>{c}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto py-10 space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-hospital-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-hospital-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">Final Confirmation</h2>
                      <p className="text-slate-500 mt-2">Please assign a File Registration ID to complete this entry.</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2">File Registration ID</label>
                        <input required disabled={!!editingId} type="text" placeholder="e.g. HIMAS-101" className={`w-full border-b-2 py-3 focus:outline-none text-2xl font-mono uppercase font-bold text-center transition-colors ${localError ? 'border-red-500 text-red-600' : 'border-slate-200 focus:border-hospital-500'}`} value={formData.id} onChange={e => { setFormData({...formData, id: e.target.value}); setLocalError(null); }} />
                      </div>

                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-slate-400">Patient:</span>
                          <span className="text-slate-900 font-bold">{formData.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-slate-400">Mobile:</span>
                          <span className="text-slate-900">+91 {formData.mobile}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-slate-400">Condition:</span>
                          <span className="text-hospital-600 font-bold">{formData.condition}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(localError || lastErrorMessage) && (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-3xl flex flex-col gap-3 text-red-700 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      Database Sync Warning
                    </div>
                    <p className="text-sm font-medium opacity-90 leading-relaxed">
                      {localError || lastErrorMessage}
                    </p>
                  </div>
                )}

                <div className="pt-10 flex justify-between items-center border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                  <button type="button" onClick={() => step === 2 ? setStep(1) : setShowForm(false)} className="text-slate-500 font-bold px-6 py-2 hover:text-slate-900 transition-colors">
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-hospital-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        {step === 1 ? 'Next Step' : 'Complete Registration'}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Table View */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
              <tr>
                <th className="p-6">File ID</th>
                <th className="p-6">Patient</th>
                <th className="p-6">Contact</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="p-6">
                    <span className="font-mono text-xs font-bold text-hospital-600 bg-hospital-50 px-2 py-1 rounded">{p.id}</span>
                  </td>
                  <td className="p-6">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">{p.age}yrs • {p.gender}</div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                       <Phone className="w-3.5 h-3.5 text-slate-300" /> {p.mobile}
                    </div>
                  </td>
                  <td className="p-6">
                     <div className="flex items-center gap-1.5 text-[10px]">
                       {p.doctorAssessment ? (
                         <span className="bg-green-50 text-green-600 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                           <CheckCircle className="w-3 h-3"/> Evaluated
                         </span>
                       ) : (
                         <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                           <Clock className="w-3 h-3"/> In Queue
                         </span>
                       )}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => window.confirm('Delete this record permanently?') && deletePatient(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="max-w-xs mx-auto text-slate-300">
                       <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                       <p className="text-sm font-medium">No records found matching your search.</p>
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