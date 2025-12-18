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

    if (!editingId && (!formData.id || formData.id.trim().length === 0)) {
        setLocalError("Please provide a File Registration ID.");
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
      // Ensure we display a string message, not an object
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
              </div>
            </div>
            <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 md:p-8 flex items-start justify-center">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="p-10 space-y-12">
                {step === 1 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                    <div className="space-y-10">
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2">Patient Full Name:</label>
                        <input required type="text" placeholder="Enter name" className="w-full border-b border-slate-200 py-2 focus:border-hospital-500 outline-none text-lg font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-4">Gender:</label>
                        <div className="flex gap-8">
                          {Object.values(Gender).map(g => (
                            <label key={g} className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" className="w-4 h-4" name="gender" value={g} checked={formData.gender === g} onChange={() => setFormData({...formData, gender: g})} />
                              <span className="text-sm font-semibold">{g}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-2">DOB:</label>
                          <input type="date" className="w-full border-b border-slate-200 py-2 focus:border-hospital-500 outline-none" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-2">Age:</label>
                          <input required type="number" className="w-full border-b border-slate-200 py-2 focus:border-hospital-500 outline-none" value={formData.age} onChange={e => setFormData({...formData, age: Number(e.target.value)})} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-10">
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">Mobile Number:</label>
                        <input required type="tel" placeholder="10 digit number" className="w-full border-b border-slate-200 py-2 outline-none text-lg font-medium" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-6">Condition:</label>
                        <select className="w-full border-b border-slate-200 py-2 outline-none font-bold" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value as any})}>
                          {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto py-10 space-y-8">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-slate-900">Final Step</h2>
                      <p className="text-slate-500 mt-2">Enter the File Registration ID to save.</p>
                    </div>
                    <div className="space-y-6 text-center">
                        <label className="block text-sm font-bold text-slate-800 mb-2 uppercase tracking-widest">Custom File Registration ID</label>
                        <input required disabled={!!editingId} type="text" placeholder="e.g. HIMAS-101" className="w-full border-b-2 py-3 outline-none text-3xl font-mono uppercase font-bold text-center border-hospital-500" value={formData.id} onChange={e => { setFormData({...formData, id: e.target.value}); setLocalError(null); }} />
                        {localError && <p className="text-red-500 text-xs font-bold mt-2">{localError}</p>}
                    </div>
                  </div>
                )}

                <div className="pt-10 flex justify-between items-center border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                  <button type="button" onClick={() => step === 2 ? setStep(1) : setShowForm(false)} className="text-slate-500 font-bold px-6 py-2">
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-hospital-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        {step === 1 ? 'Next Step' : 'Save Patient Record'}
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

      {/* Main Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
              <tr>
                <th className="p-6">File ID</th>
                <th className="p-6">Patient</th>
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
                    <div className="text-[10px] text-slate-400">{p.age}yrs • {p.condition}</div>
                  </td>
                  <td className="p-6">
                     <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${p.doctorAssessment ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                        {p.doctorAssessment ? 'Evaluated' : 'Pending'}
                     </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => window.confirm('Delete?') && deletePatient(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};