
import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { SurgeonCode, PainSeverity, Affordability, ConversionReadiness, Patient, DoctorAssessment, SurgeryProcedure } from '../types';
import { Stethoscope, Check, ChevronRight, User, Calendar, Save, Briefcase, CreditCard, Activity, Clock, Database, AlertCircle, Loader2, Info, ShieldCheck, ClipboardList, Edit3 } from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { patients, updateDoctorAssessment, lastErrorMessage } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [assessment, setAssessment] = useState<Partial<DoctorAssessment>>({
    quickCode: SurgeonCode.S1,
    surgeryProcedure: SurgeryProcedure.LapChole,
    otherSurgeryName: '',
    painSeverity: PainSeverity.Moderate,
    affordability: Affordability.A2,
    conversionReadiness: ConversionReadiness.CR2,
    tentativeSurgeryDate: '',
    doctorSignature: ''
  });

  useEffect(() => {
    if (selectedPatient) {
      if (selectedPatient.doctorAssessment) {
        setAssessment(selectedPatient.doctorAssessment);
      } else {
        setAssessment({
          quickCode: SurgeonCode.S1,
          surgeryProcedure: SurgeryProcedure.LapChole,
          otherSurgeryName: '',
          painSeverity: PainSeverity.Moderate,
          affordability: Affordability.A2,
          conversionReadiness: ConversionReadiness.CR2,
          tentativeSurgeryDate: '',
          doctorSignature: ''
        });
      }
    }
  }, [selectedPatient]);

  const isMedicationOnly = assessment.quickCode === SurgeonCode.M1;
  const isOtherProcedure = assessment.surgeryProcedure === SurgeryProcedure.Others;

  const handleQuickCodeChange = (code: SurgeonCode) => {
    if (code === SurgeonCode.M1) {
      setAssessment({
        ...assessment,
        quickCode: code,
        surgeryProcedure: undefined,
        otherSurgeryName: '',
        painSeverity: PainSeverity.Low,
        affordability: Affordability.A1,
        conversionReadiness: ConversionReadiness.CR4,
        tentativeSurgeryDate: ''
      });
    } else {
      setAssessment({ 
        ...assessment, 
        quickCode: code,
        surgeryProcedure: assessment.surgeryProcedure || SurgeryProcedure.LapChole
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatient && assessment.doctorSignature) {
      setIsSaving(true);
      try {
        await updateDoctorAssessment(selectedPatient.id, {
          ...assessment as DoctorAssessment,
          assessedAt: new Date().toISOString()
        });
        setSelectedPatient(null);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const queue = patients.filter(p => !p.doctorAssessment);
  const completed = patients.filter(p => p.doctorAssessment);

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Sidebar Queue */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
           <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
             <Stethoscope className="w-5 h-5 text-hospital-600" /> Clinical Queue ({queue.length})
           </h3>
           <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">{completed.length} Completed</span>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {queue.length === 0 && <div className="p-10 text-center text-gray-400 text-xs italic">All patients assessed!</div>}
          {queue.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatient(p)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'border-hospital-500 bg-hospital-50 shadow-md' : 'border-transparent bg-white hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start">
                <div className="font-bold text-gray-800">{p.name}</div>
                <div className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{p.id}</div>
              </div>
              <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="bg-slate-200 px-1.5 py-0.5 rounded-md text-slate-700 font-bold">{p.age}y / {p.gender.charAt(0)}</span>
                <span className="font-bold text-hospital-600 uppercase tracking-tighter">{p.condition}</span>
              </div>
            </div>
          ))}
          {completed.length > 0 && <div className="mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase px-2">Recently Completed</div>}
          {completed.slice(0, 10).map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPatient(p)} 
              className={`p-3 rounded-lg border border-gray-100 bg-gray-50 flex justify-between items-center opacity-70 hover:opacity-100 cursor-pointer ${selectedPatient?.id === p.id ? 'ring-2 ring-hospital-200 shadow-sm' : ''}`}
            >
              <span className="text-xs font-medium text-gray-600">{p.name}</span>
              <Check className="w-3.5 h-3.5 text-green-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Assessment Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {selectedPatient ? (
          <>
            {/* Header */}
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                  <Activity className="w-6 h-6 text-hospital-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Clinical Evaluation</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-slate-600">{selectedPatient.name}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs font-mono text-slate-400">FILE ID: {selectedPatient.id}</span>
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedPatient.doctorAssessment ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                {selectedPatient.doctorAssessment ? 'Assessment Done' : 'Awaiting Physician'}
              </div>
            </div>

            {/* Patient Context Summary Bar */}
            <div className="px-6 py-5 bg-white border-b grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg text-white">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter mb-0.5">Age / Gender</div>
                  <div className="text-xs font-bold text-slate-800">{selectedPatient.age} Yrs / {selectedPatient.gender}</div>
                </div>
              </div>

              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-lg text-white">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter mb-0.5">Condition</div>
                  <div className="text-xs font-bold text-slate-800">{selectedPatient.condition}</div>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg text-white">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter mb-0.5">Insurance</div>
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                    {selectedPatient.hasInsurance === 'Yes' 
                      ? (selectedPatient.insuranceName || 'Yes (Provider N/A)') 
                      : selectedPatient.hasInsurance}
                  </div>
                </div>
              </div>

              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-lg text-white">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter mb-0.5">Occupation</div>
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                    {selectedPatient.occupation || 'Not Specified'}
                  </div>
                </div>
              </div>
            </div>

            {lastErrorMessage?.includes('DATABASE ALERT') && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 text-xs animate-in slide-in-from-top-2">
                 <Database className="w-4 h-4 animate-pulse" />
                 <span className="font-bold">SYSTEM ALERT: Database table is missing columns. Data will NOT save until SQL migration is run.</span>
              </div>
            )}
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-2 border-l-4 border-hospital-500 pl-4 py-1">
                   <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Treatment Code</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(SurgeonCode).map(code => (
                    <label key={code} className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${assessment.quickCode === code ? 'border-hospital-500 bg-hospital-50 shadow-md ring-4 ring-hospital-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                      <input 
                        type="radio" 
                        name="quickCode" 
                        checked={assessment.quickCode === code}
                        onChange={() => handleQuickCodeChange(code)}
                        className="text-hospital-600 w-5 h-5 focus:ring-hospital-500"
                      />
                      <div className="ml-4">
                        <span className="block text-sm font-bold text-gray-800">{code}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Recommendation</span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {!isMedicationOnly && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-8">
                  <div className="flex items-center gap-2 border-l-4 border-hospital-500 pl-4 py-1">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Surgical Assessment</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                          <ClipboardList className="w-3.5 h-3.5 text-hospital-500" />
                          Planned Surgery Procedure *
                        </label>
                        <select 
                          required
                          className="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 focus:ring-2 focus:ring-hospital-500 outline-none transition-all appearance-none bg-slate-50/50" 
                          value={assessment.surgeryProcedure || ''} 
                          onChange={e => setAssessment({...assessment, surgeryProcedure: e.target.value as SurgeryProcedure, otherSurgeryName: e.target.value === SurgeryProcedure.Others ? assessment.otherSurgeryName : ''})}
                        >
                          <option value="" disabled>Select Procedure...</option>
                          {Object.values(SurgeryProcedure).map(sp => <option key={sp} value={sp}>{sp}</option>)}
                        </select>
                      </div>

                      {isOtherProcedure && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-hospital-600 uppercase tracking-widest mb-2">
                            <Edit3 className="w-3.5 h-3.5" />
                            Specify Other Surgery Name *
                          </label>
                          <input 
                            required
                            type="text"
                            placeholder="Type the surgery name here..."
                            className="w-full border-2 border-hospital-100 rounded-xl p-4 text-base font-bold text-slate-800 focus:ring-2 focus:ring-hospital-500 outline-none transition-all bg-hospital-50/30"
                            value={assessment.otherSurgeryName || ''}
                            onChange={e => setAssessment({...assessment, otherSurgeryName: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pain Severity Profile</label>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.values(PainSeverity).map(s => (
                        <button 
                          key={s} 
                          type="button" 
                          onClick={() => setAssessment({...assessment, painSeverity: s})} 
                          className={`py-3 text-xs font-bold rounded-xl border-2 transition-all ${
                            assessment.painSeverity === s 
                              ? 'bg-hospital-600 border-hospital-600 text-white shadow-lg' 
                              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Affordability</label>
                      <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-hospital-500 outline-none transition-all" value={assessment.affordability} onChange={e => setAssessment({...assessment, affordability: e.target.value as Affordability})}>
                        {Object.values(Affordability).map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Readiness</label>
                      <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-hospital-500 outline-none transition-all" value={assessment.conversionReadiness} onChange={e => setAssessment({...assessment, conversionReadiness: e.target.value as ConversionReadiness})}>
                        {Object.values(ConversionReadiness).map(cr => <option key={cr} value={cr}>{cr}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tentative Surgery</label>
                      <input 
                        type="date" 
                        className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-hospital-500 outline-none"
                        value={assessment.tentativeSurgeryDate}
                        onChange={e => setAssessment({...assessment, tentativeSurgeryDate: e.target.value})}
                      />
                    </div>
                  </div>
                </section>
              )}

              <section className="pt-8 border-t border-slate-100">
                <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-200 border-dashed relative group">
                  <label className="absolute -top-3 left-6 bg-white px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 rounded-full">Physician Validation</label>
                  <input 
                    required type="text" placeholder="Type your full name to sign"
                    className="w-full bg-transparent border-b-2 border-slate-300 py-3 text-3xl font-serif italic outline-none focus:border-hospital-600 transition-all placeholder:text-slate-200"
                    value={assessment.doctorSignature}
                    onChange={e => setAssessment({...assessment, doctorSignature: e.target.value})}
                  />
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic opacity-60">
                    <Check className="w-3 h-3" /> Secure Electronic Signature Active
                  </div>
                </div>
              </section>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <button type="button" onClick={() => setSelectedPatient(null)} className="px-8 py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">Cancel Assessment</button>
                <button 
                  type="submit" 
                  disabled={isSaving || !assessment.doctorSignature} 
                  className="px-12 py-4 bg-hospital-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Complete & Submit Evaluation
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-slate-50/30">
             <div className="bg-white p-8 rounded-full shadow-sm mb-6 border border-slate-100">
               <Stethoscope className="w-20 h-20 text-hospital-600 opacity-20" />
             </div>
             <p className="font-bold text-xl text-slate-400 tracking-tight">Physician Workstation Ready</p>
             <p className="text-xs text-slate-300 mt-2 uppercase tracking-widest font-bold bg-white px-4 py-2 rounded-full border border-slate-100">Select a patient from the clinical queue to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};
