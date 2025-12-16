import React, { useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { generateCounselingStrategy } from '../services/geminiService';
import { Patient, PackageProposal } from '../types';
import { Briefcase, Calendar, MessageCircle, AlertTriangle, Wand2, CheckCircle2 } from 'lucide-react';

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CR1' | 'CR2' | 'CR3' | 'CR4'>('ALL');
  const [aiLoading, setAiLoading] = useState(false);

  // Form State
  const [proposal, setProposal] = useState<Partial<PackageProposal>>({
    decisionPattern: 'Standard',
    objectionIdentified: '',
    counselingStrategy: '',
    followUpDate: ''
  });

  // Derived filtered list (Must have doctor assessment to be seen here usually, but prompt says "See full data")
  const filteredPatients = patients.filter(p => {
    if (!p.doctorAssessment) return false; // Usually package team waits for doctor
    if (filter === 'ALL') return true;
    return p.doctorAssessment.conversionReadiness.startsWith(filter);
  });

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
    if (p.packageProposal) {
      setProposal(p.packageProposal);
    } else {
      setProposal({
        decisionPattern: 'Standard',
        objectionIdentified: '',
        counselingStrategy: '',
        followUpDate: ''
      });
    }
  };

  const handleGenerateAIStrategy = async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    const strategy = await generateCounselingStrategy(selectedPatient);
    setProposal(prev => ({ ...prev, counselingStrategy: strategy }));
    setAiLoading(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatient) {
      updatePackageProposal(selectedPatient.id, {
        ...proposal as PackageProposal,
        proposalCreatedAt: new Date().toISOString()
      });
      setSelectedPatient(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Package & Counseling</h2>
          <p className="text-gray-500">Patient conversion and package proposal management</p>
        </div>
        <ExportButtons patients={patients} role="package_team" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['ALL', 'CR1', 'CR2', 'CR3', 'CR4'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {f === 'ALL' ? 'All Patients' : `${f} Candidates`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-1 h-[600px] flex flex-col">
          <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">
            Candidates for Counseling
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {filteredPatients.map(p => (
              <div 
                key={p.id}
                onClick={() => handlePatientSelect(p)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedPatient?.id === p.id ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-purple-200'
                }`}
              >
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-gray-800">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.packageProposal ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.packageProposal ? 'Done' : 'Pending'}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {p.doctorAssessment?.conversionReadiness} • {p.doctorAssessment?.affordability}
                </div>
                {p.doctorAssessment?.painSeverity === 'High' && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3" /> High Pain
                  </div>
                )}
              </div>
            ))}
            {filteredPatients.length === 0 && <div className="p-4 text-gray-400 text-center text-sm">No patients found matching filter.</div>}
          </div>
        </div>

        {/* Detailed View & Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2 flex flex-col h-[600px]">
          {selectedPatient ? (
            <div className="flex flex-col h-full">
              {/* Patient Header */}
              <div className="p-6 bg-slate-50 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedPatient.name}</h3>
                    <div className="text-sm text-gray-600 mt-1 grid grid-cols-2 gap-x-8 gap-y-1">
                      <span>Age/Gender: {selectedPatient.age} / {selectedPatient.gender}</span>
                      <span>Insurance: {selectedPatient.hasInsurance}</span>
                      <span>Occupation: {selectedPatient.occupation}</span>
                      <span>Source: {selectedPatient.source}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Doctor Rec</div>
                    <div className="bg-white border px-3 py-1 rounded-md shadow-sm">
                      <div className="font-bold text-slate-800">{selectedPatient.doctorAssessment?.quickCode}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Form */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Decision Pattern</label>
                  <select 
                    className="w-full border rounded-lg p-2"
                    value={proposal.decisionPattern}
                    onChange={e => setProposal({...proposal, decisionPattern: e.target.value})}
                  >
                    <option value="Quick Decider">Quick Decider</option>
                    <option value="Consultative">Needs Family Consultation</option>
                    <option value="Price Sensitive">Price Sensitive</option>
                    <option value="Skeptical">Skeptical / Needs Proof</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objection Identified</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-2"
                    placeholder="e.g. Cost too high, recovery time fears..."
                    value={proposal.objectionIdentified}
                    onChange={e => setProposal({...proposal, objectionIdentified: e.target.value})}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Counseling Strategy</label>
                    <button 
                      type="button"
                      onClick={handleGenerateAIStrategy}
                      disabled={aiLoading}
                      className="text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full flex items-center gap-1 hover:shadow-md transition-all disabled:opacity-50"
                    >
                      <Wand2 className="w-3 h-3" />
                      {aiLoading ? 'Generating...' : 'Generate AI Strategy'}
                    </button>
                  </div>
                  <textarea 
                    className="w-full border rounded-lg p-3 min-h-[100px] text-sm"
                    placeholder="Plan to address objections..."
                    value={proposal.counselingStrategy}
                    onChange={e => setProposal({...proposal, counselingStrategy: e.target.value})}
                  />
                  <p className="text-xs text-gray-400 mt-1">Based on doctor's assessment and patient profile.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
                  <div className="relative max-w-xs">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="date" 
                      className="w-full pl-10 pr-4 py-2 border rounded-lg"
                      value={proposal.followUpDate}
                      onChange={e => setProposal({...proposal, followUpDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                   <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4" />
                     Submit Proposal
                   </button>
                </div>
              </form>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <Briefcase className="w-16 h-16 mb-4 text-gray-200" />
               <p>Select a candidate to view details and create proposal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};