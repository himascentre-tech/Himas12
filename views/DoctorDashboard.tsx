
import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { Patient, DoctorAssessment, SurgeonCode, SurgeryProcedure, PainSeverity, Affordability, ConversionReadiness } from '../types';
import { 
  Stethoscope, User, Activity, Loader2, ClipboardList, Clock, 
  Search, CheckCircle2, AlertCircle, ChevronRight, Info, Save, 
  Thermometer, CreditCard, MousePointer2, FileText, Check
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { patients, updateDoctorAssessment, refreshData, isLoading } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Local form state for the assessment
  const [assessmentForm, setAssessmentForm] = useState<Partial<DoctorAssessment>>({
    quickCode: SurgeonCode.M1,
    painSeverity: PainSeverity.Moderate,
    affordability: Affordability.A2,
    conversionReadiness: ConversionReadiness.CR2,
    notes: ''
  });

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Sync form when patient changes
  useEffect(() => {
    if (selectedPatient) {
      setAssessmentForm(selectedPatient.doctorAssessment || {
        quickCode: SurgeonCode.M1,
        painSeverity: PainSeverity.Moderate,
        affordability: Affordability.A2,
        conversionReadiness: ConversionReadiness.CR2,
        notes: '',
        tentativeSurgeryDate: new Date().toISOString().split('T')[0]
      });
    }
  }, [selectedPatient]);

  const awaitingAssessment = patients.filter(p => !p.doctorAssessment && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.includes(searchTerm)));
  const completedAssessment = patients.filter(p => !!p.doctorAssessment).slice(0, 10);

  const handleSave = async () => {
    if (!selectedPatient) return;
    setIsSaving(true);
    try {
      const assessment: DoctorAssessment = {
        ...assessmentForm,
        assessedAt: new Date().toISOString(),
        doctorSignature: 'DR. SIGNATURE',
      } as DoctorAssessment;
      
      await updateDoctorAssessment(selectedPatient.id, assessment);
      setSelectedPatient(null); // Return to empty state after save
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 overflow-hidden">
      {/* Left Sidebar: Clinical Queue */}
      <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-hospital-50 flex items-center justify-center">
                <Stethoscope className="w-3 h-3 text-hospital-600" />
              </div>
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Clinical Queue ({awaitingAssessment.length})</h2>
            </div>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{patients.filter(p => !!p.doctorAssessment).length} Completed</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input 
              type="text"
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] focus:ring-2 focus:ring-hospital-500/20 outline-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Active Queue */}
          <div className="divide-y divide-slate-50">
            {awaitingAssessment.map(patient => (
              <button 
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`w-full p-5 text-left transition-all relative group ${selectedPatient?.id === patient.id ? 'bg-hospital-50/50' : 'hover:bg-slate-50'}`}
              >
                {selectedPatient?.id === patient.id && <div className="absolute inset-y-0 left-0 w-1 bg-hospital-600" />}
                <div className="flex justify-between items-start mb-1">
                  <div className="font-black text-slate-800 text-[11px] tracking-tight uppercase">{patient.name}</div>
                  <div className="text-[8px] font-black text-slate-300">{patient.id.slice(-6)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400">{patient.age}y / {patient.gender.charAt(0)}</span>
                  <span className="text-[9px] font-black text-hospital-500 uppercase tracking-widest">{patient.condition}</span>
                  {patient.isFollowUpVisit && (
                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                      <Clock className="w-2 h-2" /> Revisit
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Recently Seen */}
          {completedAssessment.length > 0 && (
            <div className="mt-4 pb-10">
              <div className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">Recently Seen</div>
              <div className="divide-y divide-slate-50">
                {completedAssessment.map(patient => (
                  <div key={patient.id} className="w-full p-5 flex items-center justify-between opacity-60">
                    <div>
                      <div className="font-bold text-slate-600 text-[11px] uppercase">{patient.name}</div>
                      <div className="text-[8px] font-bold text-slate-400 mt-0.5">{patient.condition}</div>
                    </div>
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Physician Workstation */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        {selectedPatient ? (
          <>
            {/* Active Clinical Entry Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-hospital-50 rounded-2xl flex items-center justify-center text-hospital-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">{selectedPatient.name}</h1>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    {selectedPatient.age}y {selectedPatient.gender} <span className="text-slate-200">|</span> ID: <span className="text-hospital-600">{selectedPatient.id}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-500 transition-all"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
              {/* Section 1: Clinical Findings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-hospital-500" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Findings & Notes</h3>
                </div>
                <textarea 
                  className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium focus:border-hospital-500 focus:ring-4 focus:ring-hospital-500/5 outline-none transition-all placeholder:text-slate-300"
                  placeholder="Record patient complaints, examination findings, and medical history..."
                  value={assessmentForm.notes}
                  onChange={(e) => setAssessmentForm({...assessmentForm, notes: e.target.value})}
                />
              </section>

              {/* Section 2: Surgical Recommendation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-hospital-500" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Surgical Recommendation</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[SurgeonCode.M1, SurgeonCode.S1].map(code => (
                      <button 
                        key={code}
                        onClick={() => setAssessmentForm({...assessmentForm, quickCode: code})}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                          assessmentForm.quickCode === code 
                          ? 'border-hospital-600 bg-hospital-50/50 shadow-lg shadow-hospital-100' 
                          : 'border-slate-100 hover:border-slate-200 text-slate-400'
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest">{code.split(' - ')[0]}</span>
                        <span className={`text-[11px] font-bold ${assessmentForm.quickCode === code ? 'text-hospital-700' : 'text-slate-500'}`}>{code.split(' - ')[1]}</span>
                      </button>
                    ))}
                  </div>

                  {assessmentForm.quickCode === SurgeonCode.S1 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Procedure</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-hospital-500"
                        value={assessmentForm.surgeryProcedure}
                        onChange={(e) => setAssessmentForm({...assessmentForm, surgeryProcedure: e.target.value as SurgeryProcedure})}
                      >
                        <option value="">Select specific procedure...</option>
                        {Object.values(SurgeryProcedure).map(sp => <option key={sp} value={sp}>{sp}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-orange-500" />
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pain & Readiness</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.values(PainSeverity).map(lvl => (
                        <button 
                          key={lvl}
                          onClick={() => setAssessmentForm({...assessmentForm, painSeverity: lvl})}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            assessmentForm.painSeverity === lvl ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <MousePointer2 className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Readiness</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(ConversionReadiness).map(cr => (
                        <button 
                          key={cr}
                          onClick={() => setAssessmentForm({...assessmentForm, conversionReadiness: cr})}
                          className={`py-3 px-4 rounded-xl text-[9px] font-bold text-left border transition-all ${
                            assessmentForm.conversionReadiness === cr ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {cr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <Info className="w-3.5 h-3.5" /> Assessment for {selectedPatient.condition}
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-3 px-12 py-4 bg-hospital-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-hospital-700 transition-all shadow-xl shadow-hospital-100 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Submit Clinical Assessment
              </button>
            </div>
          </>
        ) : (
          /* Exact Placeholder State from Screenshot */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 animate-in fade-in duration-700">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 border border-slate-50 shadow-[0_0_50px_rgba(14,165,233,0.05)]">
              <div className="w-24 h-24 rounded-full border-4 border-hospital-50 border-t-hospital-500 flex items-center justify-center relative">
                 <Stethoscope className="w-10 h-10 text-hospital-500/20" />
                 <div className="absolute inset-0 m-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Activity className="w-6 h-6 text-hospital-500 animate-pulse" />
                 </div>
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Physician Workstation Ready</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">SELECT A PATIENT PROFILE TO BEGIN CLINICAL RE-EVALUATION</p>
            
            <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg opacity-40">
               <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">History</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Surgical</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Thermometer className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pain</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
