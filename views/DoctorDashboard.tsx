
import React, { useState, useEffect, useRef } from 'react';
import { useHospital } from '../context/HospitalContext';
import { SurgeonCode, PainSeverity, Affordability, ConversionReadiness, Patient, DoctorAssessment, SurgeryProcedure, Prescription } from '../types';
import { Stethoscope, Check, User, Activity, Briefcase, Loader2, ShieldCheck, ClipboardList, Edit3, History, FileText, Plus, File, X, Trash2, Clock } from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { patients, updateDoctorAssessment, lastErrorMessage } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assessment, setAssessment] = useState<Partial<DoctorAssessment>>({
    quickCode: undefined,
    surgeryProcedure: undefined,
    otherSurgeryName: '',
    painSeverity: undefined,
    affordability: undefined,
    conversionReadiness: undefined,
    tentativeSurgeryDate: '',
    doctorSignature: '',
    notes: '',
    prescriptions: []
  });

  useEffect(() => {
    if (selectedPatient) {
      if (selectedPatient.doctorAssessment) {
        setAssessment({
          ...selectedPatient.doctorAssessment,
          notes: selectedPatient.doctorAssessment.notes || '',
          prescriptions: selectedPatient.doctorAssessment.prescriptions || []
        });
      } else {
        setAssessment({
          quickCode: undefined,
          surgeryProcedure: undefined,
          otherSurgeryName: '',
          painSeverity: undefined,
          affordability: undefined,
          conversionReadiness: undefined,
          tentativeSurgeryDate: '',
          doctorSignature: '',
          notes: '',
          prescriptions: []
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
        surgeryProcedure: undefined,
        painSeverity: undefined,
        affordability: undefined,
        conversionReadiness: undefined
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Explicitly typing file as any to fix the 'unknown' type inference that causes name/type property errors
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const now = new Date();
        const timestamp = now.toISOString().split('T')[0] + ' ' + 
                         now.getHours().toString().padStart(2, '0') + ':' + 
                         now.getMinutes().toString().padStart(2, '0');
        
        const newPrescription: Prescription = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          // Fix: Accessing 'name' and 'type' on casted 'file' object
          name: file.name,
          type: file.type,
          data: base64String,
          uploadedAt: timestamp
        };

        setAssessment(prev => ({
          ...prev,
          prescriptions: [...(prev.prescriptions || []), newPrescription]
        }));
      };
      // Fix: Casting file ensures it's treated as a Blob for readAsDataURL
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePrescription = (id: string) => {
    setAssessment(prev => ({
      ...prev,
      prescriptions: (prev.prescriptions || []).filter(p => p.id !== id)
    }));
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

  const queue = patients.filter(p => !p.bookingStatus && (!p.doctorAssessment || p.isFollowUpVisit));
  const completed = patients.filter(p => !p.bookingStatus && p.doctorAssessment && !p.isFollowUpVisit);

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
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
                {p.isFollowUpVisit && (
                   <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-tight">
                     <History className="w-2.5 h-2.5" /> Revisit
                   </span>
                )}
              </div>
            </div>
          ))}
          {completed.length > 0 && <div className="mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase px-2">Recently Seen</div>}
          {completed.slice(0, 10).map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPatient(p)} 
              className={`p-3 rounded-lg border border-gray-100 bg-gray-50 flex justify-between items-center opacity-70 hover:opacity-100 cursor-pointer ${selectedPatient?.id === p.id ? 'ring-2 ring-hospital-200 shadow-sm' : ''}`}
            >
              <span className="text-xs font-medium text-gray-600 truncate max-w-[140px]">{p.name}</span>
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {selectedPatient ? (
          <>
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                  <Activity className="w-6 h-6 text-hospital-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedPatient.isFollowUpVisit ? 'Revisit / Follow-up Evaluation' : 'Clinical Evaluation'}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-slate-600">{selectedPatient.name}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs font-mono text-slate-400">FILE ID: {selectedPatient.id}</span>
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedPatient.doctorAssessment ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                {selectedPatient.doctorAssessment ? 'Reviewing' : 'Awaiting Physician'}
              </div>
            </div>

            <div className="px-6 py-5 bg-white border-b grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg text-white"><User className="w-4 h-4" /></div>
                <div>
                  <div className="text-[9px] font-bold text-blue-400 uppercase mb-0.5 tracking-tighter">Age / Gender</div>
                  <div className="text-xs font-bold text-slate-800">{selectedPatient.age}y / {selectedPatient.gender}</div>
                </div>
              </div>
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-lg text-white"><Activity className="w-4 h-4" /></div>
                <div>
                  <div className="text-[9px] font-bold text-purple-400 uppercase mb-0.5 tracking-tighter">Intake Condition</div>
                  <div className="text-xs font-bold text-slate-800">{selectedPatient.condition}</div>
                </div>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg text-white"><ShieldCheck className="w-4 h-4" /></div>
                <div>
                  <div className="text-[9px] font-bold text-emerald-400 uppercase mb-0.5 tracking-tighter">Insurance Cover</div>
                  <div className="text-xs font-bold text-slate-800 truncate">{selectedPatient.hasInsurance}</div>
                </div>
              </div>
              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-lg text-white"><Briefcase className="w-4 h-4" /></div>
                <div>
                  <div className="text-[9px] font-bold text-orange-400 uppercase mb-0.5 tracking-tighter">Presentation Date</div>
                  <div className="text-xs font-bold text-slate-800">{selectedPatient.entry_date}</div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-2 border-l-4 border-hospital-500 pl-4 py-1">
                   <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Clinical Recommendation</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(SurgeonCode).map(code => (
                    <label key={code} className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${assessment.quickCode === code ? 'border-hospital-500 bg-hospital-50 shadow-md ring-4 ring-hospital-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                      <input type="radio" name="quickCode" checked={assessment.quickCode === code} onChange={() => handleQuickCodeChange(code)} className="text-hospital-600 w-5 h-5 focus:ring-hospital-500" />
                      <div className="ml-4">
                        <span className="block text-sm font-bold text-gray-800">{code}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {assessment.quickCode && !isMedicationOnly && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-8">
                  <div className="flex items-center gap-2 border-l-4 border-hospital-500 pl-4 py-1">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Surgical Assessment Detail</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <ClipboardList className="w-3.5 h-3.5 text-hospital-500" />
                        Surgery Procedure *
                      </label>
                      <select required className="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 bg-slate-50/50 outline-none" value={assessment.surgeryProcedure || ''} onChange={e => setAssessment({...assessment, surgeryProcedure: e.target.value as SurgeryProcedure})}>
                        <option value="" disabled>Select Procedure...</option>
                        {Object.values(SurgeryProcedure).map(sp => <option key={sp} value={sp}>{sp}</option>)}
                      </select>
                    </div>

                    {isOtherProcedure && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-hospital-600 uppercase mb-2 block">Specify Custom Surgery Name *</label>
                        <input required type="text" className="w-full border-2 border-hospital-100 rounded-xl p-4 text-base font-bold text-slate-800 bg-hospital-50/30 outline-none" value={assessment.otherSurgeryName || ''} onChange={e => setAssessment({...assessment, otherSurgeryName: e.target.value})} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Pain Severity Profile</label>
                      <div className="flex gap-2">
                         {Object.values(PainSeverity).map(s => (
                           <button key={s} type="button" onClick={() => setAssessment({...assessment, painSeverity: s})} className={`flex-1 py-3 text-[10px] font-bold rounded-xl border-2 transition-all ${assessment.painSeverity === s ? 'bg-hospital-600 border-hospital-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>{s}</button>
                         ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Financial Affordability</label>
                      <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none" value={assessment.affordability || ''} onChange={e => setAssessment({...assessment, affordability: e.target.value as Affordability})}>
                        <option value="" disabled>Select Affordability...</option>
                        {Object.values(Affordability).map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Patient Readiness</label>
                      <select className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none" value={assessment.conversionReadiness || ''} onChange={e => setAssessment({...assessment, conversionReadiness: e.target.value as ConversionReadiness})}>
                        <option value="" disabled>Select Readiness...</option>
                        {Object.values(ConversionReadiness).map(cr => <option key={cr} value={cr}>{cr}</option>)}
                      </select>
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-hospital-500 pl-4 py-1">
                   <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Clinical Findings & Notes</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-hospital-500" />
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Physical Examination / Remarks</label>
                  </div>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-hospital-50 transition-all min-h-[120px]" 
                    placeholder="Enter detailed clinical findings, medical history, or specific instructions..."
                    value={assessment.notes || ''}
                    onChange={e => setAssessment({...assessment, notes: e.target.value})}
                  />
                </div>
              </section>

              {/* Prescription Uploads Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-l-4 border-hospital-500 pl-4 py-1">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Prescription Uploads (Optional)</h3>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 uppercase tracking-widest"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Prescription
                  </button>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,image/png,image/jpeg,image/jpg" 
                    onChange={handleFileUpload}
                  />
                </div>

                {assessment.prescriptions && assessment.prescriptions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assessment.prescriptions.map((file) => (
                      <div key={file.id} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm group hover:border-hospital-100 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-hospital-50 p-2 rounded-lg text-hospital-600 flex-shrink-0">
                              <File className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>{file.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-medium text-slate-400">{file.uploadedAt}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removePrescription(file.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-2xl p-8 text-center">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-xs font-medium text-slate-400 italic">No prescriptions uploaded yet.</p>
                  </div>
                )}
              </section>

              <section className="pt-8 border-t border-slate-100">
                <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-200 border-dashed relative">
                  <label className="absolute -top-3 left-6 bg-white px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 rounded-full">Attending Physician Validation</label>
                  <input required type="text" placeholder="Type name to e-sign" className="w-full bg-transparent border-b-2 border-slate-300 py-3 text-3xl font-serif italic outline-none focus:border-hospital-600 transition-all placeholder:text-slate-200" value={assessment.doctorSignature || ''} onChange={e => setAssessment({...assessment, doctorSignature: e.target.value})} />
                </div>
              </section>

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setSelectedPatient(null)} className="px-8 py-3 text-slate-400 font-bold">Close</button>
                <button type="submit" disabled={isSaving || !assessment.doctorSignature} className="px-12 py-4 bg-hospital-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stethoscope className="w-5 h-5" />}
                  Submit Evaluation
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
             <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mt-2">Select a patient profile to begin clinical re-evaluation</p>
          </div>
        )}
      </div>
    </div>
  );
};
