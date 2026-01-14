
import React, { useState, useEffect, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Gender, Condition, Patient, ProposalStatus, BookingStatus } from '../types';
import { 
  PlusCircle, Search, CheckCircle, Clock, 
  Pencil, User, Loader2, Calendar, 
  Phone, ChevronRight, AlertCircle, X,
  Stethoscope, Users, History, Timer, ArrowRight,
  Filter, ChevronLeft, ChevronRight as ChevronRightIcon,
  Globe, UserPlus, ShieldCheck, Shield, BookmarkPlus, CalendarCheck,
  UserCheck, RotateCcw
} from 'lucide-react';

type TabType = 'NEW' | 'HISTORY' | 'OLD' | 'BOOKING';

export const FrontOfficeDashboard: React.FC = () => {
  const { patients, addPatient, updatePatient, deletePatient, refreshData, lastErrorMessage, clearError, activeSubTab, setActiveSubTab } = useHospital();
  const [activeTab, setActiveTab] = useState<TabType>('HISTORY');
  const [showForm, setShowForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getCurrentTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  
  const [selectedBookingDate, setSelectedBookingDate] = useState(getTodayDate());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [otherSourceDetail, setOtherSourceDetail] = useState('');
  
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(getTodayDate());

  const [revisitPatient, setRevisitPatient] = useState<Patient | null>(null);
  const [revisitData, setRevisitData] = useState({
    date: getTodayDate(),
    time: getCurrentTime()
  });

  const getInitialFormData = (): Partial<Patient> => ({
    id: '', 
    name: '',
    dob: '',
    entry_date: getTodayDate(),
    gender: Gender.Male,
    age: 0,
    mobile: '',
    occupation: '',
    hasInsurance: 'No',
    insuranceName: '',
    source: 'Google',
    sourceDoctorName: '',
    condition: Condition.Piles,
    arrivalTime: null
  });

  const [formData, setFormData] = useState<Partial<Patient>>(getInitialFormData());

  const [bookingData, setBookingData] = useState<Partial<Patient>>({
    name: '',
    mobile: '',
    source: 'Google',
    entry_date: getTodayDate(),
    bookingTime: '',
    bookingStatus: BookingStatus.OPDFix,
    condition: Condition.Piles,
  });

  useEffect(() => {
    if (activeSubTab === 'BOOKING') {
      setActiveTab('BOOKING');
      setShowBookingForm(false); 
    } else if (activeSubTab === 'DASHBOARD') {
      setActiveTab('HISTORY');
    }
  }, [activeSubTab]);

  const historyOPDList = useMemo(() => {
    const filterDate = selectedHistoryDate;
    const list: Array<{ patient: Patient; arrivalTime: string; type: 'NEW' | 'OLD' }> = [];
    
    patients.forEach(p => {
      if (p.bookingStatus && p.bookingStatus !== BookingStatus.Arrived) return; 

      if (p.entry_date === filterDate) {
        let timeDisplay = '--:--';
        if (p.arrivalTime) {
          timeDisplay = p.arrivalTime;
        } else if (p.created_at) {
          try {
            const dateObj = new Date(p.created_at);
            if (!isNaN(dateObj.getTime())) {
              timeDisplay = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            }
          } catch (e) { console.warn("Time parse error", e); }
        }

        list.push({ 
          patient: p, 
          arrivalTime: timeDisplay,
          type: 'NEW' 
        });
      }
      
      if (p.lastFollowUpVisitDate?.startsWith(filterDate)) {
         const parts = p.lastFollowUpVisitDate.split(' ');
         const timePart = parts.length > 1 ? parts[1] : '--:--';
         list.push({
           patient: p,
           arrivalTime: timePart,
           type: 'OLD'
         });
      }
    });

    return list.sort((a, b) => b.arrivalTime.localeCompare(a.arrivalTime));
  }, [patients, selectedHistoryDate]);

  const bookingList = useMemo(() => {
    return patients.filter(p => !!p.bookingStatus)
      .filter(p => {
        const matchesSearch = !searchTerm.trim() || 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.mobile.includes(searchTerm);
        
        const matchesDate = !selectedBookingDate || p.entry_date === selectedBookingDate;
        
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => {
        if (a.bookingStatus === BookingStatus.Arrived && b.bookingStatus !== BookingStatus.Arrived) return -1;
        if (a.bookingStatus !== BookingStatus.Arrived && b.bookingStatus === BookingStatus.Arrived) return 1;
        return b.entry_date.localeCompare(a.entry_date);
      });
  }, [patients, searchTerm, selectedBookingDate]);

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
    if (!formData.name || !formData.mobile || !formData.age) {
      setLocalError("Please fill in Name, Mobile, and Age.");
      return;
    }
    if (formData.source === 'Doctor Recommended' && !formData.sourceDoctorName?.trim()) {
      setLocalError("Please enter the Doctor's Name.");
      return;
    }
    if (formData.source === 'Other' && !otherSourceDetail.trim()) {
      setLocalError("Please specify the lead source.");
      return;
    }
    if (formData.hasInsurance === 'Yes' && !formData.insuranceName?.trim()) {
      setLocalError("Please enter the Insurance Company Name.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const finalId = formData.id?.trim().toUpperCase() || `AUTO-${Date.now().toString().slice(-6)}`;

    if (!editingId && patients.some(p => p.id.toLowerCase() === finalId.toLowerCase())) {
      setLocalError(`Patient File ID "${finalId}" is already registered.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSource = formData.source === 'Other' ? `Other: ${otherSourceDetail}` : formData.source;
      
      const submissionData = { 
        ...formData, 
        source: finalSource, 
        id: finalId,
        bookingStatus: null,
        arrivalTime: formData.arrivalTime || getCurrentTime()
      };

      if (editingId) {
        const original = patients.find(p => p.id === editingId);
        if (original) {
          await updatePatient({ ...original, ...submissionData as Patient }, editingId);
        } else {
          await addPatient(submissionData as any);
        }
      } else {
        await addPatient(submissionData as any);
      }
      
      setShowForm(false);
      resetForm();
      setActiveTab('HISTORY');
    } catch (err: any) {
      setLocalError(err.message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!bookingData.name || !bookingData.mobile || !bookingData.source || !bookingData.entry_date || !bookingData.bookingTime) {
      setLocalError("Patient Name, Phone, Source, Date, and Timing are mandatory.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isExisting = !!bookingData.id;
      if (isExisting) {
        await updatePatient(bookingData as Patient);
      } else {
        const bookingId = `BOOK-${Date.now().toString().slice(-6)}`;
        const submission = {
          ...bookingData,
          id: bookingId,
          gender: Gender.Other,
          age: 1, 
          occupation: '',
          hasInsurance: 'No' as any,
          condition: bookingData.condition || Condition.Other,
        };
        await addPatient(submission as any);
      }
      setShowBookingForm(false);
      setBookingData({
        name: '',
        mobile: '',
        source: 'Google',
        entry_date: getTodayDate(),
        bookingTime: '',
        bookingStatus: BookingStatus.OPDFix,
        condition: Condition.Piles,
      });
      setActiveTab('BOOKING');
      setActiveSubTab('BOOKING');
    } catch (err: any) {
      setLocalError(err.message || "Booking failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cycleBookingStatus = async (patient: Patient) => {
    let nextStatus: BookingStatus;
    if (patient.bookingStatus === BookingStatus.OPDFix) nextStatus = BookingStatus.FollowUp;
    else nextStatus = BookingStatus.OPDFix;

    try {
      await updatePatient({ ...patient, bookingStatus: nextStatus });
    } catch (err) {
      console.error("Status update error", err);
    }
  };

  const handleMarkArrivedAndRegister = async (patient: Patient) => {
    try {
      const nowTime = getCurrentTime();
      if (patient.bookingStatus !== BookingStatus.Arrived) {
        await updatePatient({ 
          ...patient, 
          bookingStatus: BookingStatus.Arrived,
          arrivalTime: nowTime 
        });
      }

      let baseSource = patient.source;
      let detail = '';
      if (patient.source && patient.source.startsWith('Other: ')) {
        baseSource = 'Other';
        detail = patient.source.replace('Other: ', '');
      }

      setFormData({
        ...getInitialFormData(),
        name: patient.name,
        mobile: patient.mobile,
        source: baseSource,
        entry_date: getTodayDate(), 
        condition: patient.condition,
        arrivalTime: nowTime,
        id: '' 
      });
      
      setEditingId(patient.id); 
      setOtherSourceDetail(detail);
      setStep(1);
      setShowForm(true);
    } catch (err) {
      console.error("Arrived check-in failed", err);
    }
  };

  const handleRevisitSubmit = async () => {
    if (!revisitPatient) return;
    setIsSubmitting(true);
    setLocalError(null);
    try {
      const timestamp = `${revisitData.date} ${revisitData.time}`;
      await updatePatient({
        ...revisitPatient,
        isFollowUpVisit: true,
        lastFollowUpVisitDate: timestamp,
        doctorAssessment: null as any 
      });
      
      await refreshData();
      setRevisitPatient(null);
      setActiveTab('HISTORY');
      setSelectedHistoryDate(revisitData.date);
    } catch (err: any) {
      setLocalError("Revisit update failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setOtherSourceDetail('');
    setEditingId(null);
    setStep(1);
    setLocalError(null);
  };

  const handleEdit = (p: Patient) => {
    let baseSource = p.source;
    let detail = '';
    if (p.source && p.source.startsWith('Other: ')) {
      baseSource = 'Other';
      detail = p.source.replace('Other: ', '');
    }

    setFormData({ ...p, source: baseSource });
    setOtherSourceDetail(detail);
    setEditingId(p.id);
    setStep(1);
    setShowForm(true);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedHistoryDate);
    d.setDate(d.getDate() + days);
    setSelectedHistoryDate(d.toISOString().split('T')[0]);
  };

  const sources = [
    "Google", 
    "Facebook", 
    "Instagram", 
    "WhatsApp", 
    "YouTube", 
    "Website", 
    "Doctor Recommended", 
    "Friend + Online",
    "Old Patients / Relatives", 
    "Saw Hospital Board Outside", 
    "Other"
  ];

  const filteredArchive = useMemo(() => {
    if (!searchTerm.trim()) return patients.filter(p => !p.bookingStatus);
    const searchLower = searchTerm.toLowerCase();
    const cleanSearchDigits = searchTerm.replace(/\D/g, '');
    return patients.filter(p => !p.bookingStatus).filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.id.toLowerCase().includes(searchLower) ||
      (cleanSearchDigits && p.mobile.includes(cleanSearchDigits))
    );
  }, [patients, searchTerm]);

  const isToday = selectedHistoryDate === getTodayDate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Front Office</h2>
          <p className="text-gray-500 text-sm">Registry Operations & Daily OPD</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border shadow-sm max-w-full overflow-x-auto no-scrollbar">
          <button 
            onClick={() => { resetForm(); setShowForm(true); setActiveSubTab('DASHBOARD'); }} 
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'NEW' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PlusCircle className="w-4 h-4" /> Register New
          </button>
          <button 
            onClick={() => { setActiveTab('HISTORY'); setSearchTerm(''); setActiveSubTab('DASHBOARD'); }} 
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'HISTORY' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Timer className="w-4 h-4" /> OPD History
          </button>
          <button 
            onClick={() => { setActiveTab('BOOKING'); setSearchTerm(''); setSelectedBookingDate(getTodayDate()); setActiveSubTab('BOOKING'); }} 
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'BOOKING' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <CalendarCheck className="w-4 h-4" /> Scheduled Bookings
          </button>
          <button 
            onClick={() => { setActiveTab('OLD'); setSearchTerm(''); setActiveSubTab('DASHBOARD'); }} 
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'OLD' ? 'bg-hospital-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Search className="w-4 h-4" /> Archive Search
          </button>
        </div>
      </div>

      {activeTab === 'HISTORY' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`border p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-colors ${isToday ? 'bg-hospital-50 border-hospital-100' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl shadow-sm ${isToday ? 'bg-hospital-600 text-white' : 'bg-slate-700 text-white'}`}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">{isToday ? 'Today\'s OPD Ledger' : 'Historical OPD Ledger'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => shiftDate(-1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                  <input 
                    type="date" 
                    className="bg-transparent font-bold text-xs text-slate-500 uppercase tracking-widest focus:outline-none cursor-pointer hover:text-hospital-600"
                    value={selectedHistoryDate}
                    onChange={e => setSelectedHistoryDate(e.target.value)}
                  />
                  <button onClick={() => shiftDate(1)} disabled={isToday} className="p-1 hover:bg-white rounded-lg transition-colors disabled:opacity-20"><ChevronRightIcon className="w-4 h-4 text-slate-400" /></button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8 px-6 py-2 bg-white/50 rounded-2xl border border-white/50 backdrop-blur-sm">
               <div className="text-center min-w-[60px]">
                 <div className="text-2xl font-black text-slate-900 leading-none">{historyOPDList.length}</div>
                 <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Total Visits</div>
               </div>
               <div className="w-px h-10 bg-slate-200" />
               <div className="text-center min-w-[60px]">
                 <div className="text-2xl font-black text-blue-600 leading-none">{historyOPDList.filter(v => v.type === 'NEW').length}</div>
                 <div className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter mt-1">New Files</div>
               </div>
               <div className="w-px h-10 bg-slate-200" />
               <div className="text-center min-w-[60px]">
                 <div className="text-2xl font-black text-amber-600 leading-none">{historyOPDList.filter(v => v.type === 'OLD').length}</div>
                 <div className="text-[8px] font-bold text-amber-400 uppercase tracking-tighter mt-1">Revisits</div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
                <tr>
                  <th className="px-6 py-4">Arrival Time</th>
                  <th className="px-6 py-4">File ID</th>
                  <th className="px-6 py-4">Patient Profile</th>
                  <th className="px-6 py-4">Condition</th>
                  <th className="px-6 py-4">Lead Source</th>
                  <th className="px-6 py-4 text-center">Visit Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyOPDList.map((entry, idx) => (
                  <tr key={`${entry.patient.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-700">
                        <Clock className="w-4 h-4 text-slate-300 group-hover:text-hospital-500 transition-colors" />
                        {entry.arrivalTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-hospital-600 bg-hospital-50 px-2.5 py-1.5 rounded-lg border border-hospital-100">{entry.patient.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-hospital-700 transition-colors">{entry.patient.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{entry.patient.age}y • {entry.patient.gender} • {entry.patient.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-hospital-600 uppercase tracking-tighter bg-hospital-50 px-2 py-1 rounded-md">{entry.patient.condition}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <Globe className="w-3 h-3 text-slate-300" />
                        {entry.patient.source}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${entry.type === 'NEW' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {entry.type === 'NEW' ? <PlusCircle className="w-3 h-3" /> : <History className="w-3 h-3" />}
                        {entry.type === 'NEW' ? 'New Registration' : 'Return Revisit'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'BOOKING' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-3/4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search bookings by name or phone..." 
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all font-medium text-slate-700"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative w-full md:w-64">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-hospital-500 w-5 h-5" />
                <input 
                  type="date" 
                  className="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                  value={selectedBookingDate}
                  onChange={e => setSelectedBookingDate(e.target.value)}
                />
                {selectedBookingDate && (
                  <button 
                    onClick={() => setSelectedBookingDate(getTodayDate())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                    title="Reset to Today"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                setBookingData({
                  name: '',
                  mobile: '',
                  source: 'Google',
                  entry_date: getTodayDate(),
                  bookingTime: '',
                  bookingStatus: BookingStatus.OPDFix,
                  condition: Condition.Piles,
                });
                setShowBookingForm(true);
              }} 
              className="flex items-center gap-2 px-6 py-3 bg-hospital-600 text-white rounded-2xl font-bold hover:bg-hospital-700 shadow-lg shadow-hospital-100 transition-all active:scale-95 whitespace-nowrap"
            >
              <BookmarkPlus className="w-5 h-5" /> Add New Booking
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
                <tr>
                  <th className="px-6 py-4">Booking Status</th>
                  <th className="px-6 py-4">Scheduled Date</th>
                  <th className="px-6 py-4">Patient Profile</th>
                  <th className="px-6 py-4">Condition</th>
                  <th className="px-6 py-4">Lead Source</th>
                  <th className="px-6 py-4 text-center">Lifecycle Action</th>
                  <th className="px-6 py-4 text-center">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookingList.map((booking) => (
                  <tr key={booking.id} className={`hover:bg-slate-50/50 transition-colors group ${booking.bookingStatus === BookingStatus.Arrived ? 'bg-purple-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      {booking.bookingStatus === BookingStatus.Arrived ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] border bg-purple-100 text-purple-700 border-purple-200">
                          <CheckCircle className="w-3 h-3" /> ARRIVED
                        </div>
                      ) : (
                        <button 
                          onClick={() => cycleBookingStatus(booking)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-[10px] border transition-all active:scale-95 ${
                            booking.bookingStatus === BookingStatus.OPDFix ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' :
                            'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                          }`}
                        >
                          {booking.bookingStatus === BookingStatus.OPDFix ? 'OPD Fix' : 'Follow-up'}
                          <ArrowRight className="w-3 h-3 opacity-30" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-hospital-500" /> {booking.entry_date}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 ml-5">
                          {booking.bookingTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{booking.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 font-bold">{booking.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-hospital-600 uppercase tracking-tighter bg-hospital-50 px-2 py-1 rounded-md">{booking.condition}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-300" /> {booking.source}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleMarkArrivedAndRegister(booking)}
                        className={`flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 ${
                          booking.bookingStatus === BookingStatus.Arrived 
                          ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100' 
                          : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" /> 
                        {booking.bookingStatus === BookingStatus.Arrived ? 'Complete Registration' : 'Check-In Arrived'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {booking.bookingStatus !== BookingStatus.Arrived && (
                           <button 
                             onClick={() => {
                               setBookingData(booking);
                               setShowBookingForm(true);
                             }}
                             className="p-2 text-slate-300 hover:text-hospital-600 hover:bg-hospital-50 rounded-xl transition-all"
                           >
                             <Pencil className="w-4 h-4" />
                           </button>
                        )}
                        <button 
                          onClick={async () => {
                             if (confirm(`Delete booking for ${booking.name}?`)) {
                               await deletePatient(booking.id);
                             }
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bookingList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic font-medium">No bookings found {selectedBookingDate ? `for ${selectedBookingDate}` : ''}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'OLD' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="relative w-full md:w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by Patient Name, Phone Number, or File Registration ID..." 
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-hospital-50 focus:border-hospital-500 outline-none transition-all font-medium text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-shrink-0">
               <ExportButtons patients={patients} role="front_office" />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-6 py-4">File ID</th>
                    <th className="px-6 py-4">Patient Profile</th>
                    <th className="px-6 py-4">Original DOP</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4 text-center">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredArchive.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-hospital-600 bg-hospital-50 px-2.5 py-1.5 rounded-lg border border-hospital-100">{p.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-hospital-700 transition-colors">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] text-slate-400 font-medium">{p.age}y • {p.gender}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-200" />
                           <span className="text-[10px] text-hospital-500 font-bold">{p.condition}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-hospital-500" />
                          {p.entry_date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-hospital-500" />
                          {p.mobile}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => {
                              setRevisitPatient(p);
                              setRevisitData({
                                date: getTodayDate(),
                                time: getCurrentTime()
                              });
                            }} 
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-[10px] border border-amber-100 hover:bg-amber-100 transition-all shadow-sm active:scale-95"
                          >
                            <History className="w-3.5 h-3.5" /> Log Revisit
                          </button>
                          <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {showBookingForm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-hospital-600 p-3 rounded-2xl shadow-lg">
                  <BookmarkPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Scheduled Patient Booking</h3>
                  <p className="text-[10px] font-bold text-hospital-600 uppercase tracking-widest mt-0.5">Pre-Registration Appointment</p>
                </div>
              </div>
              <button onClick={() => { setShowBookingForm(false); setActiveSubTab('DASHBOARD'); setActiveTab('HISTORY'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-8 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Patient Name *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Enter Full Name"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white transition-all shadow-sm"
                      value={bookingData.name ?? ''}
                      onChange={e => setBookingData({...bookingData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number *</label>
                    <input 
                      required 
                      type="tel" 
                      placeholder="10-digit mobile"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white transition-all shadow-sm"
                      value={bookingData.mobile ?? ''}
                      onChange={e => setBookingData({...bookingData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lead Source *</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white transition-all shadow-sm"
                      value={bookingData.source ?? ''}
                      onChange={e => setBookingData({...bookingData, source: e.target.value})}
                    >
                      {sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Booking Date *</label>
                    <input 
                      required 
                      type="date"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white transition-all shadow-sm"
                      value={bookingData.entry_date ?? ''}
                      onChange={e => setBookingData({...bookingData, entry_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Preferred Timing *</label>
                    <input 
                      required 
                      type="time"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white transition-all shadow-sm"
                      value={bookingData.bookingTime ?? ''}
                      onChange={e => setBookingData({...bookingData, bookingTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Condition *</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white transition-all shadow-sm"
                      value={bookingData.condition ?? ''}
                      onChange={e => setBookingData({...bookingData, condition: e.target.value as Condition})}
                    >
                      {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Booking Status</label>
                    <select 
                      className="w-full bg-hospital-50 border-2 border-hospital-100 rounded-xl p-4 text-base font-black text-hospital-700 outline-none focus:border-hospital-500"
                      value={bookingData.bookingStatus ?? ''}
                      onChange={e => setBookingData({...bookingData, bookingStatus: e.target.value as BookingStatus})}
                    >
                      {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
               </div>

               {localError && (
                <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3 animate-pulse border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {localError}
                </div>
              )}

              <div className="pt-6 border-t flex gap-4">
                 <button type="button" onClick={() => { setShowBookingForm(false); setActiveSubTab('DASHBOARD'); setActiveTab('HISTORY'); }} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                 <button 
                   type="submit" 
                   disabled={isSubmitting}
                   className="flex-[2] bg-hospital-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-hospital-100 hover:bg-hospital-800 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarCheck className="w-5 h-5" />}
                   {bookingData.id ? 'Save Updates' : 'Confirm Booking'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {revisitPatient && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
             <div className="p-6 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-amber-200">
                    <History className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-900 leading-tight">Return Visit Log</h3>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Re-registering for current OPD</p>
                  </div>
                </div>
                <button onClick={() => setRevisitPatient(null)} className="p-2 hover:bg-amber-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-amber-400" />
                </button>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-hospital-600">
                     <User className="w-6 h-6" />
                   </div>
                   <div>
                     <div className="text-sm font-bold text-slate-800">{revisitPatient.name}</div>
                     <div className="text-[10px] font-mono font-bold text-slate-400">ID: {revisitPatient.id} • {revisitPatient.condition}</div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Revisit Date
                    </label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all"
                      value={revisitData.date ?? ''}
                      onChange={e => setRevisitData({...revisitData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Arrival Time
                    </label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all"
                      value={revisitData.time ?? ''}
                      onChange={e => setRevisitData({...revisitData, time: e.target.value})}
                    />
                  </div>
                </div>
             </div>

             <div className="p-6 bg-slate-50 border-t flex gap-4">
                <button 
                  onClick={() => setRevisitPatient(null)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRevisitSubmit}
                  disabled={isSubmitting}
                  className="flex-[2] bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-100 hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirm Revisit
                </button>
             </div>
           </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="bg-hospital-100 p-3 rounded-2xl">
                   <User className="w-8 h-8 text-hospital-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{editingId ? 'Update Registry Profile' : 'New Patient Registration'}</h1>
                  <p className="text-sm text-slate-400 font-medium">Step {step} of 2</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setActiveTab('HISTORY'); setActiveSubTab('DASHBOARD'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-8 h-8 text-slate-400" />
              </button>
            </div>

            <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="p-12 space-y-12">
              {step === 1 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
                  <div className="space-y-8">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block border-b pb-3">1. Identity</label>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Presentation Date *</label>
                      <input required type="date" className="w-full bg-hospital-50 border border-hospital-100 rounded-xl px-5 py-3.5 font-bold text-hospital-700 text-base" value={formData.entry_date ?? ''} onChange={e => setFormData({...formData, entry_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Full Legal Name *</label>
                      <input required type="text" placeholder="First Last" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium text-base" value={formData.name ?? ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Age *</label>
                        <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium text-base" value={formData.age ?? ''} onChange={e => setFormData({...formData, age: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Gender *</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium text-base" value={formData.gender ?? ''} onChange={e => setFormData({...formData, gender: e.target.value as Gender})}>
                          {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block border-b pb-3">2. Contact & Billing</label>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Mobile *</label>
                      <input required type="tel" placeholder="10-digit number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium text-base" value={formData.mobile ?? ''} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'').slice(0,10)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Primary Occupation</label>
                      <input type="text" placeholder="e.g. Professional" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium text-base" value={formData.occupation ?? ''} onChange={e => setFormData({...formData, occupation: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Insurance Cover</label>
                      <div className="flex gap-3">
                        {['Yes', 'No', 'Not Sure'].map(opt => (
                          <button key={opt} type="button" onClick={() => setFormData({...formData, hasInsurance: opt as any})} className={`flex-1 py-3 text-xs font-bold rounded-xl border-2 transition-all ${formData.hasInsurance === opt ? 'bg-hospital-500 border-hospital-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>

                      {formData.hasInsurance === 'Yes' && (
                        <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                          <label className="block text-[10px] font-bold text-hospital-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Insurance Company Name *
                          </label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Insurance Co. Name..." 
                            className="w-full bg-hospital-50 border border-hospital-100 rounded-xl px-4 py-3 font-bold text-hospital-700 text-sm focus:border-hospital-500 outline-none transition-all shadow-sm"
                            value={formData.insuranceName ?? ''}
                            onChange={e => setFormData({...formData, insuranceName: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block border-b pb-3">3. Referral & Clinical</label>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Clinical Condition *</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium text-base" value={formData.condition ?? ''} onChange={e => setFormData({...formData, condition: e.target.value as Condition})}>
                        {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Lead Source *</label>
                      <div className="grid grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-2">
                        {sources.map(s => (
                          <label key={s} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${formData.source === s ? 'bg-hospital-50 border-hospital-200 text-hospital-700 font-bold' : 'bg-white border-slate-100 text-slate-400'}`}>
                            <input type="radio" className="hidden" name="source" value={s} checked={formData.source === s} onChange={() => setFormData({...formData, source: s})} />
                            <span className="text-[10px] truncate tracking-tight">{s}</span>
                          </label>
                        ))}
                      </div>

                      {formData.source === 'Doctor Recommended' && (
                        <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                          <label className="block text-[10px] font-bold text-hospital-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                            <Stethoscope className="w-3 h-3" /> Attending Doctor Name *
                          </label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Dr. Name..." 
                            className="w-full bg-hospital-50 border border-hospital-100 rounded-xl px-4 py-3 font-bold text-hospital-700 text-sm focus:border-hospital-500 outline-none transition-all shadow-sm"
                            value={formData.sourceDoctorName ?? ''}
                            onChange={e => setFormData({...formData, sourceDoctorName: e.target.value})}
                          />
                        </div>
                      )}

                      {formData.source === 'Other' && (
                        <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Specify Other Source *</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Please specify..." 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 text-sm focus:border-hospital-500 outline-none transition-all"
                            value={otherSourceDetail}
                            onChange={e => setOtherSourceDetail(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-14">
                  <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-y-10 gap-x-12">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Patient Name</label>
                      <div className="text-2xl font-bold text-slate-900 truncate">{formData.name ?? ''}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Age</label>
                      <div className="text-2xl font-bold text-slate-900">{formData.age ?? ''} yrs</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Mobile No</label>
                      <div className="text-2xl font-bold text-slate-900">{formData.mobile ?? ''}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-hospital-600 uppercase tracking-widest block">Condition</label>
                      <div className="text-2xl font-bold text-hospital-600">{formData.condition ?? ''}</div>
                    </div>
                  </div>
                  <div className="space-y-6 text-center">
                    <label className="block text-sm font-bold text-hospital-600 uppercase tracking-widest mb-6">Registry File ID Assignment</label>
                    <input type="text" placeholder="HIMAS-XXX" className="w-full max-w-lg mx-auto border-b-4 py-6 focus:outline-none text-6xl font-mono uppercase font-bold text-center border-hospital-500 transition-colors bg-transparent placeholder:text-slate-100" value={formData.id ?? ''} onChange={e => { setFormData({...formData, id: e.target.value}); setLocalError(null); }} />
                  </div>
                </div>
              )}

              {localError && (
                <div className="p-5 bg-red-50 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-4 animate-pulse">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  {localError}
                </div>
              )}

              <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <button type="button" onClick={() => step === 2 ? setStep(1) : setShowForm(false)} className="w-full sm:w-auto text-slate-400 font-bold px-10 py-4 hover:text-slate-600 transition-colors text-base">
                  {step === 1 ? 'Cancel' : 'Go Back'}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-hospital-600 text-white px-16 py-4.5 rounded-2xl font-bold flex items-center justify-center gap-4 shadow-xl shadow-hospital-100 hover:bg-hospital-700 transition-all active:scale-95 disabled:opacity-50 text-base"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{step === 1 ? 'Confirm Details' : (editingId ? 'Save Changes' : 'Finalize Entry')}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
