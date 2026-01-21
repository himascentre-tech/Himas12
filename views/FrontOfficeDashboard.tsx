
import React, { useState, useEffect, useCallback } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Patient, Gender, Condition, BookingStatus } from '../types';
import { 
  PlusCircle, Search, Clock, History, Calendar, Phone, User, 
  Loader2, UserPlus, Fingerprint, MapPin, Briefcase, ShieldCheck, 
  MousePointer2, Save, X, ChevronRight, Activity, Trash2
} from 'lucide-react';

export const FrontOfficeDashboard: React.FC = () => {
  const { patients, addPatient, updatePatient, deletePatient, refreshData, currentUserRole, isLoading } = useHospital();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState<Partial<Patient>>({
    name: '',
    age: 0,
    gender: Gender.Male,
    mobile: '',
    occupation: '',
    hasInsurance: 'No',
    source: 'Direct Visit',
    condition: Condition.Piles,
    entry_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (selectedPatient) {
      setForm({ ...selectedPatient });
    } else {
      setForm({
        name: '',
        age: 0,
        gender: Gender.Male,
        mobile: '',
        occupation: '',
        hasInsurance: 'No',
        source: 'Direct Visit',
        condition: Condition.Piles,
        entry_date: new Date().toISOString().split('T')[0]
      });
    }
  }, [selectedPatient]);

  const handlePatientSelect = useCallback((p: Patient) => {
    setSelectedPatient(p);
  }, []);

  const filteredQueue = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.mobile.includes(searchTerm) || 
    p.id.includes(searchTerm)
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedPatient) {
        await updatePatient(form as Patient);
      } else {
        const newId = `HIMAS-${Math.floor(100000 + Math.random() * 900000)}`;
        await addPatient({ ...form, id: newId } as any);
      }
      setSelectedPatient(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this record?")) {
      await deletePatient(id);
      setSelectedPatient(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 overflow-hidden">
      {/* Sidebar: Registration Queue */}
      <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print z-[10]">
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-hospital-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-tighter">Registration Queue</h2>
            </div>
            <button 
              onClick={() => setSelectedPatient(null)}
              className="p-1.5 hover:bg-hospital-50 rounded-lg text-hospital-600 transition-all cursor-pointer"
              title="New Registration"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] focus:ring-2 focus:ring-hospital-500/20 outline-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
          {filteredQueue.map(p => (
            <button 
              key={p.id}
              onClick={() => handlePatientSelect(p)}
              className={`w-full p-5 text-left transition-all relative group cursor-pointer pointer-events-auto ${selectedPatient?.id === p.id ? 'bg-hospital-50/50' : 'hover:bg-slate-50'}`}
            >
              {selectedPatient?.id === p.id && <div className="absolute inset-y-0 left-0 w-1 bg-hospital-600" />}
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-slate-800 text-[11px] tracking-tight uppercase pointer-events-none">{p.name}</div>
                <div className="text-[8px] font-black text-slate-300 pointer-events-none">{p.id.slice(-6)}</div>
              </div>
              <div className="flex items-center gap-2 mb-2 pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400">{p.age}y / {p.gender.charAt(0)}</span>
                <span className="text-[9px] font-black text-hospital-500 uppercase tracking-widest">{p.condition}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-medium pointer-events-none">
                <Phone className="w-2.5 h-2.5" /> {p.mobile}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Registration Workstation */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative z-[5]">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-hospital-50 rounded-xl flex items-center justify-center text-hospital-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{selectedPatient ? 'Edit Patient Profile' : 'New Patient Intake'}</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {selectedPatient ? selectedPatient.id : 'Awaiting Data Entry'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons patients={patients} role={currentUserRole || ''} />
            {selectedPatient && (
              <button 
                onClick={() => handleDelete(selectedPatient.id)}
                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-hospital-500" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identity & Demographics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-hospital-500 outline-none transition-all"
                  value={form.name || ''}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Patient Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
                <input 
                  type="number" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-hospital-500 outline-none transition-all"
                  value={form.age || ''}
                  onChange={e => setForm({...form, age: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                <select 
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-hospital-500"
                  value={form.gender}
                  onChange={e => setForm({...form, gender: e.target.value as Gender})}
                >
                  {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact & Occupation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <input 
                  type="tel" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-hospital-500 outline-none transition-all"
                  value={form.mobile || ''}
                  onChange={e => setForm({...form, mobile: e.target.value})}
                  placeholder="10-digit number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Occupation</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-hospital-500 outline-none transition-all"
                  value={form.occupation || ''}
                  onChange={e => setForm({...form, occupation: e.target.value})}
                  placeholder="e.g. Teacher, Engineer"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Intake Context</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Principal Condition</label>
                <select 
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-hospital-500"
                  value={form.condition}
                  onChange={e => setForm({...form, condition: e.target.value as Condition})}
                >
                  {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Insurance Check</label>
                <select 
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-hospital-500"
                  value={form.hasInsurance}
                  onChange={e => setForm({...form, hasInsurance: e.target.value as any})}
                >
                  <option value="No">No Insurance</option>
                  <option value="Yes">Has Active Policy</option>
                  <option value="Not Sure">Need Clarification</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lead Source</label>
                <select 
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-hospital-500"
                  value={form.source}
                  onChange={e => setForm({...form, source: e.target.value})}
                >
                  <option value="Direct Visit">Direct / Walk-in</option>
                  <option value="Google">Google Search</option>
                  <option value="Facebook">Facebook Ads</option>
                  <option value="YouTube">YouTube Content</option>
                  <option value="Referral">Patient Referral</option>
                  <option value="Doctor Reference">External Doctor</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <button 
            onClick={() => setSelectedPatient(null)}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all flex items-center gap-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Reset Intake Form
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || !form.name || !form.mobile}
            className="flex items-center gap-3 px-12 py-4 bg-hospital-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-hospital-700 transition-all shadow-xl shadow-hospital-100 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {selectedPatient ? 'Update Patient Profile' : 'Complete Registration'}
          </button>
        </div>
      </div>
    </div>
  );
};
