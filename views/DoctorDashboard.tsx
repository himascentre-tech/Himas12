
import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { SurgeonCode, PainSeverity, Affordability, ConversionReadiness, Patient, DoctorAssessment } from '../types';
import { Stethoscope, Check, ChevronRight, User, Calendar, Save, Briefcase, CreditCard, Activity, Clock, Database, AlertCircle, Loader2 } from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { patients, updateDoctorAssessment, lastErrorMessage } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [assessment, setAssessment] = useState<Partial<DoctorAssessment>>({
    quickCode: SurgeonCode.S1,
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

  const handleQuickCodeChange = (code: SurgeonCode) => {
    if (code === SurgeonCode.M1) {
      setAssessment({
        ...assessment,
        quickCode: code,
        painSeverity: PainSeverity.Low,
        affordability: Affordability.A1,
        conversionReadiness: ConversionReadiness.CR4,
        tentativeSurgeryDate: ''
      });
    } else {
      setAssessment({ ...assessment, quickCode: code });
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
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
           <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
             <Stethoscope className="w-5 h-5 text-hospital-600" /> Queue ({queue.length})
           </h3>
           <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">{completed.length} Done</span>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {queue.length === 0 && <div className="p-10 text-center text-gray-400 text-xs italic">All patients assessed!</div>}
          {queue.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatient(p)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'border-hospital-500 bg-hospital-50' : 'border-gray-200 bg-white hover:border-hospital-200'}`}
            >
              <div className="flex justify-between items-start">
                <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                <div className="text-[10px] font-mono text-gray-400">{p.id}</div>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{p.age} yrs • {p.gender} • {p.condition}</div>
            </div>
          ))}
          {completed.length > 0 && <div className="mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase px-2">Recently Completed</div>}
          {completed.slice(0, 10).map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPatient(p)} 
              className={`p-3 rounded-lg border border-gray-100 bg-gray-50 flex justify-between items-center opacity-70 hover:opacity-100 cursor-pointer ${selectedPatient?.id === p.id ? 'ring-2 ring-hospital-200' : ''}`}
            >
              <span className="text-xs font-medium text-gray-600">{p.name}</span>
              <Check className="w-3.5 h-3.5 text-green-500" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {selectedPatient ? (
          <>
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Clinical Evaluation</h2>
                <div className="text-sm text-gray-500 mt-1">
                  {selectedPatient.name} ({selectedPatient.id})
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${selectedPatient.doctorAssessment ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {selectedPatient.doctorAssessment ? 'Assessment Done' : 'Evaluation Required'}
              </div>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-8">
              <section className="space-y-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Treatment Code</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(SurgeonCode).map(code => (
                    <label key={code} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${assessment.quickCode === code ? 'border-hospital-500 bg-hospital-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input 
                        type="radio" 
                        name="quickCode" 
                        checked={assessment.quickCode === code}
                        onChange={() => handleQuickCodeChange(code)}
                        className="text-hospital-600 w-4 h-4"
                      />
                      <span className="ml-3 text-sm font-bold text-gray-700">{code}</span>
                    </label>
                  ))}
                </div>
              </section>

              {!isMedicationOnly && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-8">
                  <hr className="border-gray-100" />
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Surgical Assessment</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">Pain Severity</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.values(PainSeverity).map(s => (
                        <button key={s} type="button" onClick={() => setAssessment({...assessment, painSeverity: s})} className={`py-2 text-xs font-bold rounded-lg border transition-all ${assessment.painSeverity === s ? 'bg-hospital-600 border-hospital-600 text-white' : 'bg-white text-gray-400 hover:border-gray-300'}`}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">Affordability</label>
                      <select className="w-full border rounded-lg p-2.5 text-sm font-medium" value={assessment.affordability} onChange={e => setAssessment({...assessment, affordability: e.target.value as Affordability})}>
                        {Object.values(Affordability).map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">Readiness</label>
                      <select className="w-full border rounded-lg p-2.5 text-sm font-medium" value={assessment.conversionReadiness} onChange={e => setAssessment({...assessment, conversionReadiness: e.target.value as ConversionReadiness})}>
                        {Object.values(ConversionReadiness).map(cr => <option key={cr} value={cr}>{cr}</option>)}
                      </select>
                    </div>
                  </div>
                </section>
              )}

              <section className="pt-8 border-t border-gray-100">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 border-dashed">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Physician Signature</label>
                  <input 
                    required type="text" placeholder="Full Professional Name"
                    className="w-full bg-transparent border-b-2 border-slate-300 py-2 text-2xl font-serif italic outline-none focus:border-hospital-600"
                    value={assessment.doctorSignature}
                    onChange={e => setAssessment({...assessment, doctorSignature: e.target.value})}
                  />
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setSelectedPatient(null)} className="px-6 py-2 text-gray-400 font-bold text-sm">Cancel</button>
                <button type="submit" disabled={isSaving || !assessment.doctorSignature} className="px-10 py-3 bg-hospital-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-hospital-100 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Complete Assessment
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
             <Stethoscope className="w-20 h-20 mb-4 opacity-20" />
             <p className="font-bold text-lg">Select patient to begin evaluation</p>
          </div>
        )}
      </div>
    </div>
  );
};
