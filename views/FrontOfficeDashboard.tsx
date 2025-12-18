import React, { useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Gender, Condition, Patient } from '../types';
import { PlusCircle, Search, CheckCircle, Clock, ArrowLeft, Save, FileText, CreditCard, Calendar, Pencil, Trash2, Activity, ChevronRight, User, Loader2 } from 'lucide-react';

export const FrontOfficeDashboard: React.FC = () => {
  const { patients, addPatient, updatePatient, deletePatient, saveStatus } = useHospital();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Patient>>({
    id: '', 
    name: '',
    dob: '',
    gender: Gender.Male,
    age: undefined,
    mobile: '',
    occupation: '',
    hasInsurance: 'No',
    insuranceName: '',
    source: '',
    condition: Condition.Piles 
  });

  const resetForm = () => {
    setFormData({
      id: '', name: '', dob: '', gender: Gender.Male, age: undefined, mobile: '', occupation: '',
      hasInsurance: 'No', insuranceName: '', source: '', condition: Condition.Piles
    });
    setEditingId(null);
    setStep(1);
  };

  const handleEdit = (patient: Patient) => {
    setFormData({
      id: patient.id,
      name: patient.name,
      dob: patient.dob || '',
      gender: patient.gender,
      age: patient.age,
      mobile: patient.mobile,
      occupation: patient.occupation,
      hasInsurance: patient.hasInsurance,
      insuranceName: patient.insuranceName || '',
      source: patient.source,
      condition: patient.condition
    });
    setEditingId(patient.id);
    setStep(1);
    setShowForm(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete record for "${name}"?`)) {
      deletePatient(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
         const originalPatient = patients.find(p => p.id === editingId);
         if (originalPatient) {
           await updatePatient({
             ...originalPatient,
             ...formData as Patient,
             id: editingId,
             age: Number(formData.age) || 0
           });
         }
      } else {
        if (patients.some(p => p.id === formData.id)) {
          alert("This File Number already exists.");
          setIsSubmitting(false);
          return;
        }
        await addPatient({ ...formData, age: Number(formData.age) || 0 } as any);
      }
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      console.error("Submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Front Office</h2>
          <p className="text-gray-500 text-sm">Patient Registration</p>
        </div>
        <div className="flex items-center gap-3">
           {saveStatus === 'error' && (
             <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-1 border border-red-100">
               <Activity className="w-3 h-3" /> Sync Failed
             </div>
           )}
           <ExportButtons patients={patients} role="front_office" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search Name or File ID..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-hospital-500 focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-hospital-600 text-white px-6 py-2.5 rounded-lg hover:bg-hospital-700 flex items-center gap-2 font-bold shadow-lg shadow-hospital-100 transition-all active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          Register Patient
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Patient' : 'Registration'}</h1>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
               <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {/* Step 1 Content Simplified */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Patient Name</label>
                      <input required type="text" className="w-full border-b-2 border-gray-200 p-2 focus:border-hospital-500 focus:outline-none text-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">File Registration ID</label>
                      <input required disabled={!!editingId} type="text" className="w-full border-b-2 border-gray-200 p-2 focus:border-hospital-500 focus:outline-none text-lg uppercase font-mono" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                      <input required type="tel" className="w-full border-b-2 border-gray-200 p-2 focus:border-hospital-500 focus:outline-none text-lg" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                      <select className="w-full border-b-2 border-gray-200 p-2 focus:border-hospital-500 focus:outline-none text-lg" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value as Condition})}>
                        {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="pt-8 border-t flex justify-end gap-4">
                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-hospital-600 text-white font-bold rounded-lg hover:bg-hospital-700 shadow-xl shadow-hospital-200 flex items-center gap-2">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? 'Update' : 'Register'}
                    </button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4">File ID</th>
              <th className="p-4">Patient Details</th>
              <th className="p-4">Condition</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Registered</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPatients.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-mono text-sm text-gray-600">{p.id}</td>
                <td className="p-4">
                  <div className="font-bold text-gray-900">{p.name}</div>
                  <div className="text-[10px] text-gray-500">{p.mobile}</div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-hospital-50 text-hospital-700 border border-hospital-100">
                    {p.condition}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-[10px]">
                       {p.doctorAssessment ? <CheckCircle className="w-3 h-3 text-green-500"/> : <Clock className="w-3 h-3 text-orange-400"/>}
                       <span className={p.doctorAssessment ? "text-green-700 font-bold" : "text-gray-400"}>Doctor</span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right text-gray-400 text-[11px] font-medium">
                  {p.created_at ? new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Recent'}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};