
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser, BookingStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { syncToGoogleSheets } from '../services/googleSheetsService';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => Promise<void>; 
  updatePatient: (patient: Patient, oldId?: string) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  updateDoctorAssessment: (patientId: string, assessment: DoctorAssessment) => Promise<void>;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  staffUsers: StaffUser[];
  registerStaff: (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => Promise<void>;
  saveStatus: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSavedAt: Date | null;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  isStaffLoaded: boolean;
  lastErrorMessage: string | null;
  clearError: () => void;
  forceStopLoading: () => void;
  formatError: (e: any) => string;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = 'himas_hospital_role_session';
const SHARED_FACILITY_ID = 'himas_main_facility_2024';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, _setCurrentUserRole] = useState<Role>(() => {
    try {
      return (sessionStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
    } catch (e) {
      return null;
    }
  });

  const [activeSubTab, setActiveSubTab] = useState<string>('DASHBOARD');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  
  const cachedHospitalId = useRef<string | null>(null);
  const pollingInterval = useRef<number | null>(null);

  const setCurrentUserRole = (role: Role) => {
    if (role) {
      sessionStorage.setItem(STORAGE_KEY_ROLE, role);
      setActiveSubTab('DASHBOARD');
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ROLE);
      cachedHospitalId.current = null;
      setPatients([]);
    }
    _setCurrentUserRole(role);
  };

  const clearError = () => setLastErrorMessage(null);
  const forceStopLoading = () => setIsLoading(false);

  const formatError = useCallback((e: any): string => {
    if (!e) return "Unknown error occurred";
    if (typeof e === 'string') return e;
    
    const parts = [];
    if (e.message) parts.push(e.message);
    if (e.details) parts.push(`Details: ${e.details}`);
    if (e.hint) parts.push(`Hint: ${e.hint}`);
    if (e.code) parts.push(`Code: ${e.code}`);
    
    if (parts.length > 0) return parts.join(" | ");
    
    if (e.error?.message) return e.error.message;
    if (e.data?.message) return e.data.message;
    
    try {
      const str = JSON.stringify(e);
      if (str === '{}' || str === '[]') return String(e);
      return str;
    } catch {
      return String(e);
    }
  }, []);

  const mapPatientFromDB = (item: any): Patient | null => {
    if (!item) return null;
    
    let dbAssessment = null;
    try {
      dbAssessment = typeof item.doctor_assessment === 'string' 
        ? JSON.parse(item.doctor_assessment) 
        : item.doctor_assessment;
    } catch (e) { console.error("Parse error doctor_assessment", e); }
      
    let packageProposal = null;
    try {
      packageProposal = typeof item.package_proposal === 'string' 
        ? JSON.parse(item.package_proposal) 
        : item.package_proposal;
    } catch (e) { console.error("Parse error package_proposal", e); }

    // Unified extraction logic: handles both column-based and JSON-meta-based storage
    const rawStatus = item.booking_status || dbAssessment?.__booking_status;
    const bookingStatus = (rawStatus === null || rawStatus === undefined || rawStatus === '') ? null : (rawStatus as BookingStatus);
    
    const bookingTime = item.booking_time || dbAssessment?.__booking_time || null;
    const arrivalTime = item.arrival_time || dbAssessment?.__arrival_time || null;
    const followUpControl = item.follow_up_control || dbAssessment?.__follow_up_control || null;

    // Clean the assessment object for the frontend model (remove metadata keys)
    let doctorAssessment = null;
    if (dbAssessment) {
      const { __booking_status, __booking_time, __arrival_time, __follow_up_control, ...cleanAss } = dbAssessment;
      doctorAssessment = Object.keys(cleanAss).length > 0 ? cleanAss : null;
    }

    return {
      id: item.id,
      hospital_id: item.hospital_id,
      name: item.name,
      dob: item.dob || null,
      entry_date: item.entry_date || null,
      gender: item.gender || 'Other',
      age: Number(item.age) || 0,
      mobile: item.mobile || '',
      occupation: item.occupation || '',
      hasInsurance: item.has_insurance || 'No',
      insuranceName: item.insurance_name || '',
      source: item.source || 'Other',
      sourceDoctorName: item.source_doctor_name || '',
      condition: item.condition || 'Other',
      created_at: item.created_at,
      doctorAssessment: doctorAssessment as DoctorAssessment || null,
      packageProposal: packageProposal || null,
      isFollowUpVisit: Boolean(item.is_follow_up),
      lastFollowUpVisitDate: item.last_follow_up_visit_date || null,
      bookingStatus: bookingStatus,
      bookingTime: bookingTime,
      followUpControl: followUpControl,
      arrivalTime: arrivalTime
    };
  };

  const mapPatientToDB = (p: any) => {
    // Strategy: Bundle metadata to avoid PGRST204 (missing columns)
    const assessmentPayload = {
      ...(p.doctorAssessment || {}),
      __booking_status: p.bookingStatus || null,
      __booking_time: p.bookingTime || null,
      __arrival_time: p.arrivalTime || null,
      __follow_up_control: p.followUpControl || null
    };

    return {
      id: p.id,
      hospital_id: p.hospital_id,
      name: p.name,
      dob: p.dob || null,
      entry_date: p.entry_date || null,
      gender: p.gender,
      age: Number(p.age) || 0,
      mobile: p.mobile,
      occupation: p.occupation || null,
      has_insurance: p.hasInsurance,
      insurance_name: p.insuranceName || null,
      source: p.source,
      source_doctor_name: p.sourceDoctorName || null,
      condition: p.condition,
      doctor_assessment: assessmentPayload,
      package_proposal: p.packageProposal === undefined || p.packageProposal === null ? null : p.packageProposal,
      is_follow_up: p.isFollowUpVisit === true,
      last_follow_up_visit_date: p.lastFollowUpVisitDate || null,
      notes: p.doctorAssessment?.notes || null
    };
  };

  const getEffectiveHospitalId = async () => {
    if (cachedHospitalId.current) return cachedHospitalId.current;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) return null;
      const email = session.user.email || '';
      const demoEmails = ['office@himas.com', 'doctor@himas.com', 'team@himas.com'];
      const id = demoEmails.includes(email.toLowerCase()) 
        ? SHARED_FACILITY_ID 
        : (session.user.user_metadata?.hospital_id || session.user.id);
      cachedHospitalId.current = id;
      return id;
    } catch (e) {
      return null;
    }
  };

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    setSaveStatus('saving');

    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) {
        if (!isBackground) setIsLoading(false);
        setSaveStatus('saved');
        return;
      }

      const { data, error } = await supabase
        .from('himas_data')
        .select('*')
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      
      const mapped = (data || [])
        .map(mapPatientFromDB)
        .filter((p): p is Patient => p !== null)
        .sort((a, b) => new Date(b.entry_date || 0).getTime() - new Date(a.entry_date || 0).getTime());

      setPatients(mapped);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setLastErrorMessage(null);
    } catch (e: any) {
      const msg = formatError(e);
      console.error("Data Loading Error:", msg, e);
      setLastErrorMessage(msg);
      setSaveStatus('error');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [formatError]);

  useEffect(() => {
    if (currentUserRole) {
      loadData();
      pollingInterval.current = window.setInterval(() => loadData(true), 20000);
    } else {
      setIsLoading(false);
    }
    return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
  }, [currentUserRole, loadData]);

  const updatePatient = async (updatedPatient: Patient, oldId?: string) => {
    setSaveStatus('saving');
    clearError();
    try {
      const dbPayload = mapPatientToDB(updatedPatient);
      const targetId = oldId || dbPayload.id;

      const { data, error } = await supabase
        .from('himas_data')
        .update(dbPayload)
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      
      const mapped = mapPatientFromDB(data);
      if (mapped) {
        setPatients(prev => {
          // Filter out BOTH the old ID and the new ID to prevent duplicates during ID changes
          const filtered = prev.filter(p => p.id !== oldId && p.id !== targetId);
          return [mapped, ...filtered].sort((a, b) => new Date(b.entry_date || 0).getTime() - new Date(a.entry_date || 0).getTime());
        });
        syncToGoogleSheets(mapped).catch(e => console.error("Sheets Sync Error:", e));
      }
      
      setSaveStatus('saved');
    } catch (err: any) {
      const msg = formatError(err);
      setLastErrorMessage(msg);
      setSaveStatus('error');
      console.error("Update Patient Error:", msg, err);
      throw err;
    }
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, activeSubTab, setActiveSubTab, patients, updatePatient,
      addPatient: async (pd) => {
        setSaveStatus('saving');
        clearError();
        try {
          const hospitalId = await getEffectiveHospitalId();
          if (!hospitalId) throw new Error("Not logged in.");
          const dbPayload = mapPatientToDB({ ...pd, hospital_id: hospitalId });
          const { data, error } = await supabase.from('himas_data').insert(dbPayload).select().single();
          if (error) throw error;
          const mapped = mapPatientFromDB(data);
          if (mapped) {
            setPatients(prev => [mapped, ...prev]);
            syncToGoogleSheets(mapped).catch(e => console.error("Sheets Sync Error:", e));
          }
          setSaveStatus('saved');
        } catch (err: any) {
          const msg = formatError(err);
          setLastErrorMessage(msg);
          setSaveStatus('error');
          console.error("Add Patient Error:", msg, err);
          throw err;
        }
      },
      deletePatient: async (id) => {
        try {
          const hospitalId = await getEffectiveHospitalId();
          const { error } = await supabase.from('himas_data').delete().eq('id', id).eq('hospital_id', hospitalId);
          if (error) throw error;
          setPatients(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
          console.error("Delete Error:", formatError(err));
        }
      },
      updateDoctorAssessment: async (pid, ass) => {
        const p = patients.find(p => p.id === pid);
        if (p) {
          await updatePatient({ 
            ...p, 
            doctorAssessment: ass,
            isFollowUpVisit: false 
          });
        }
      }, 
      updatePackageProposal: async (pid, prop) => {
        const p = patients.find(p => p.id === pid);
        if (p) await updatePatient({ ...p, packageProposal: prop });
      },
      getPatientById: (id) => patients.find(p => p.id === id),
      staffUsers, registerStaff: async () => {},
      saveStatus, lastSavedAt, refreshData: () => loadData(), 
      isLoading, isStaffLoaded: true, lastErrorMessage, clearError,
      forceStopLoading, formatError
    }}>
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) throw new Error('useHospital must be used within a HospitalProvider');
  return context;
};
