
import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { SurgeonCode, PainSeverity, Affordability, ConversionReadiness, Patient, DoctorAssessment } from '../types';
import { Stethoscope, Check, ChevronRight, User, Calendar, Save, Briefcase, CreditCard, Activity, Clock, Database, AlertCircle } from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { patients, updateDoctorAssessment, lastErrorMessage } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
      await updateDoctorAssessment(selectedPatient.id, {
        ...assessment as DoctorAssessment,
        assessedAt: new Date().toISOString()
      });
      setSelectedPatient(null);
    }
  };

  const queue = patients.filter(p => !p.doctorAssessment);
  const completed = patients.filter(p => p.doctorAssessment);

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
           <h3 className="font-bold text-gray-700 flex items-center gap-2">
             <Stethoscope className="w-5 h-5 text-hospital-600" /> Patient Queue
           </h3>
           <div className="flex gap-4 mt-2 text-xs">
             <span className="text-orange-600 font-semibold">{queue.length} Pending</span>
             <span className="text-green-600 font-semibold">{completed.length} Completed</span>
           </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {queue.length === 0 && <div className="p-4 text-center text-gray-400">Queue is empty</div>}
          {queue.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatient(p)}
              className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${selectedPatient?.id === p.id ? 'border-hospital-500 bg-hospital-50' : 'border-gray-200 bg-white'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.age} / {p.gender}</div>
                </div>
                <div className="text-xs font-mono text-gray-400">{p.id}</div>
              </div>
              <div className="mt-2 flex gap-2">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded flex items-center gap-1">
                  <Activity className="w-3 h-3" /> {p.condition}
                </span>
              </div>
            </div>
          ))}
          {completed.length > 0 && <div className="mt-6 mb-2 text-xs font-bold text-gray-400 uppercase px-2">Recently Completed</div>}
          {completed.slice(0, 5).map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPatient(p)} 
              className={`p-3 rounded-lg border border-gray-100 bg-gray-50 opacity-70 hover:opacity-100 cursor-pointer ${selectedPatient?.id === p.id ? 'ring-2 ring-hospital-200' : ''}`}
            >
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">{p.name}</span>
                <Check className="w-4 h-4 text-green-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {selectedPatient ? (
          <>
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Medical Evaluation</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedPatient.name}, {selectedPatient.age} yrs</span>
                  <span className="flex items-center gap-1 text-hospital-700 font-medium bg-hospital-50 px-2 py-0.5 rounded-full"><Activity className="w-3 h-3" /> {selectedPatient.condition}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">File ID</div>
                <div className="font-mono text-lg font-bold text-hospital-600">{selectedPatient.id}</div>
              </div>
            </div>

            {/* Persistent Database Warning for Doctor */}
            {lastErrorMessage?.includes('DATABASE ALERT') && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 text-xs">
                 <Database className="w-4 h-4" />
                 <span className="font-bold">NOTICE: Assessments won't save permanently. Admin must add 'doctor_assessment' column to Supabase.</span>
              </div>
            )}
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-hospital-500" /> Clinical Assessment
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Surgeon Quick Code</label>
                     <div className="space-y-2">
                       {Object.values(SurgeonCode).map(code => (
                         <label key={code} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${assessment.quickCode === code ? 'bg-blue-50 border-blue-500 shadow-sm' : 'hover:bg-gray-50'}`}>
                           <input 
                             type="radio" 
                             name="quickCode" 
                             checked={assessment.quickCode === code}
                             onChange={() => handleQuickCodeChange(code)}
                             className="text-hospital-600 focus:ring-hospital-500"
                           />
                           <span className="ml-3 text-sm font-medium text-gray-900">{code}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                   
                   {!isMedicationOnly ? (
                     <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                       <label className="block text-sm font-medium text-gray-700 mb-2">Pain Severity</label>
                       <div className="flex flex-col gap-2">
                         {Object.values(PainSeverity).map(severity => (
                           <button
                             key={severity}
                             type="button"
                             onClick={() => setAssessment({...assessment, painSeverity: severity})}
                             className={`w-full py-3 rounded-lg border text-sm font-medium transition-all ${
                               assessment.painSeverity === severity
                                 ? severity === 'High' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                 : severity === 'Moderate' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                                 : 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                                 : 'hover:bg-gray-50 border-gray-200 text-gray-600'
                             }`}
                           >
                             {severity}
                           </button>
                         ))}
                       </div>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl p-6 bg-gray-50/50">
                        <div className="text-center">
                          <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pain Assessment Hidden for M1</p>
                        </div>
                     </div>
                   )}
                </div>
              </section>

              {!isMedicationOnly && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <hr className="border-gray-100" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-hospital-500" /> Conversion Indicators
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Affordability</label>
                      <select 
                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-hospital-500"
                        value={assessment.affordability}
                        onChange={e => setAssessment({...assessment, affordability: e.target.value as Affordability})}
                      >
                        {Object.values(Affordability).map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Readiness</label>
                      <select 
                        className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-hospital-500"
                        value={assessment.conversionReadiness}
                        onChange={e => setAssessment({...assessment, conversionReadiness: e.target.value as ConversionReadiness})}
                      >
                        {Object.values(ConversionReadiness).map(cr => <option key={cr} value={cr}>{cr}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tentative Surgery Date</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-hospital-500"
                        value={assessment.tentativeSurgeryDate}
                        onChange={e => setAssessment({...assessment, tentativeSurgeryDate: e.target.value})}
                      />
                    </div>
                  </div>
                </section>
              )}

              <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
                <input 
                  type="text" 
                  placeholder="Type Doctor Name to Sign"
                  className="w-full border-b-2 border-gray-400 bg-transparent py-2 text-xl font-serif italic focus:outline-none focus:border-hospital-600"
                  value={assessment.doctorSignature}
                  onChange={e => setAssessment({...assessment, doctorSignature: e.target.value})}
                  required
                />
              </div>

              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setSelectedPatient(null)} className="px-6 py-2 text-gray-600 font-bold">Cancel</button>
                <button 
                  type="submit" 
                  className="px-8 py-2.5 bg-hospital-600 text-white rounded-lg hover:bg-hospital-700 shadow-lg font-bold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Assessment
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <Stethoscope className="w-16 h-16 mb-4 text-gray-200" />
             <p className="font-medium text-lg">Select a patient to start evaluation</p>
          </div>
        )}
      </div>
    </div>
  );
};
