
import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Patient } from '../types';
import { 
  PlusCircle, Search, Clock, 
  History, Calendar, 
  Phone, User, Loader2
} from 'lucide-react';

type TabType = 'NEW' | 'HISTORY' | 'OLD' | 'BOOKING';

// Fixed: Completed the component implementation to ensure it returns a valid React Node, resolving the TypeScript error.
export const FrontOfficeDashboard: React.FC = () => {
  const { patients, refreshData, currentUserRole } = useHospital();
  
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  const [activeTab, setActiveTab] = useState<TabType>('HISTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingDate, setSelectedBookingDate] = useState(getTodayDate());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [otherSourceDetail, setOtherSourceDetail] = useState('');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(getTodayDate());

  // Rule 5: Lazy loading - Fetch data when entering the dashboard
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Front Office Dashboard</h2>
          <p className="text-slate-500 text-sm">Manage patient registrations and clinical bookings</p>
        </div>
        <ExportButtons patients={patients} role={currentUserRole || ''} />
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {(['HISTORY', 'BOOKING', 'NEW'] as TabType[]).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab ? 'text-hospital-600 border-b-2 border-hospital-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab === 'HISTORY' && <div className="flex items-center gap-2"><History className="w-4 h-4" /> Patient Records</div>}
            {tab === 'BOOKING' && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Appointments</div>}
            {tab === 'NEW' && <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" /> New Entry</div>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by patient name or mobile number..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-hospital-500/10 focus:border-hospital-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-hospital-600 text-white rounded-2xl text-sm font-bold hover:bg-hospital-700 transition-all shadow-lg shadow-hospital-100 active:scale-[0.98]">
            <PlusCircle className="w-4 h-4" /> Register Patient
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Full Name & Contact</th>
                <th className="px-8 py-5">Medical Condition</th>
                <th className="px-8 py-5">Entry Date</th>
                <th className="px-8 py-5">Booking Status</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length > 0 ? (
                filteredPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-hospital-100 flex items-center justify-center text-hospital-700 font-bold text-sm">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{patient.name}</div>
                          <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {patient.mobile}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {patient.condition}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-500 text-sm font-semibold italic">
                      {patient.entry_date}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5" /> {patient.bookingStatus || 'Registered'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-hospital-600 transition-all active:scale-90">
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center text-slate-300">
                      <User className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-black uppercase tracking-widest">No matching records found</p>
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
