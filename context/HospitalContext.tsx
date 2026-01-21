
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser, BookingStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { syncToGoogleSheets } from '../services/googleSheetsService';
import { cachedFetch, updateCache, invalidateCache } from '../utils/cache';

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
  refreshData: (force?: boolean) => Promise<void>;
  prewarmDatabase: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false); 
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  
  const cachedHospitalId = useRef<string | null>(null);
  const pollingInterval = useRef<number | null>(null);
  const loadRetryCount = useRef(0);
  const prewarmTimer = useRef<number | null>(null);

  const setCurrentUserRole = (role: Role) => {
    if (role) {
      sessionStorage.setItem(STORAGE_KEY_ROLE, role);
      setActiveSubTab('DASHBOARD');
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ROLE);
      cachedHospitalId.current = null;
      setPatients([]);
      invalidateCache(`patients_${SHARED_FACILITY_ID}`);
      if (prewarmTimer.current) {
        clearInterval(prewarmTimer.current);
        prewarmTimer.current = null;
      }
    }
    _setCurrentUserRole(role);
  };

  const clearError = () => {
    setLastErrorMessage(null);
    loadRetryCount.current = 0;
  };
  
  const forceStopLoading = () => setIsLoading(false);

  const formatError = useCallback((e: any): string => {
    if (!e) return "Unknown error occurred";
    if (typeof e === 'string') return e;
    if (e.message?.includes('Failed to fetch')) return "Network Connection Interrupted";
    if (e.name === 'QuotaExceededError' || e.message?.includes('quota exceeded')) {
      return "Local Storage Full (Cloud Syncing Active)";
    }
    return e.message || String(e);
  }, []);

  const prewarmDatabase = useCallback(async () => {
    if (prewarmTimer.current) return;
    const pulse = async () => {
      try {
        await supabase.from('himas_data').select('id', { count: 'exact', head: true }).limit(1);
      } catch (e) { }
    };
    pulse(); 
    prewarmTimer.current = window.setInterval(pulse, 45000); 
  }, []);

  const mapPatientFromDB = (item: any): Patient | null => {
    if (!item) return null;
    let doctorAssessment = null;
    try {
      doctorAssessment = typeof item.doctor_assessment === 'string' 
        ? JSON.parse(item.doctor_assessment) 
        : item.doctor_assessment;
    } catch (e) { }
    let packageProposal = null;
    try {
      packageProposal = typeof item.package_proposal === 'string' 
        ? JSON.parse(item.package_proposal) 
        : item.package_proposal;
    } catch (e) { }

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
      bookingStatus: (item.booking_status === '' || item.booking_status === null) ? null : (item.booking_status as BookingStatus),
      bookingTime: item.booking_time || null,
      followUpControl: item.follow_up_control || null,
      arrivalTime: item.arrival_time || null
    };
  };

  const mapPatientToDB = (p: any) => {
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
      doctor_assessment: p.doctorAssessment || null,
      package_proposal: p.packageProposal || null,
      is_follow_up: p.isFollowUpVisit === true,
      last_follow_up_visit_date: p.lastFollowUpVisitDate || null,
      booking_status: p.bookingStatus || null,
      booking_time: p.bookingTime || null,
      arrival_time: p.arrivalTime || null,
      follow_up_control: p.follow_up_control || null
    };
  };

  const getEffectiveHospitalId = async () => {
    if (cachedHospitalId.current) return cachedHospitalId.current;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
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

  const loadData = useCallback(async (isBackground = false, force = false) => {
    if (!isBackground) setIsLoading(true);
    setSaveStatus('saving');

    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) {
        if (!isBackground) setIsLoading(false);
        setSaveStatus('saved');
        return;
      }

      const cacheKey = `patients_${hospitalId}`;
      if (force) invalidateCache(cacheKey);

      const data = await cachedFetch(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('himas_data')
            .select('*')
            .eq('hospital_id', hospitalId)
            .order('entry_date', { ascending: false })
            .limit(300); 

          if (error) throw error;
          return data;
        },
        force ? 0 : (isBackground ? 45000 : 30000)
      );
      
      const mapped = (data || [])
        .map(mapPatientFromDB)
        .filter((p): p is Patient => p !== null);

      setPatients(mapped);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
      setLastErrorMessage(formatError(e));
      setSaveStatus('error');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [formatError]);

  useEffect(() => {
    if (currentUserRole) {
      loadData();
      pollingInterval.current = window.setInterval(() => loadData(true), 60000);
      prewarmDatabase();
    }
    return () => { 
      if (pollingInterval.current) clearInterval(pollingInterval.current); 
      if (prewarmTimer.current) clearInterval(prewarmTimer.current);
    };
  }, [currentUserRole, loadData, prewarmDatabase]);

  const addPatient = async (pd: any) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Authentication Lost. Please Log In.");
      
      const dbPayload = mapPatientToDB({ ...pd, hospital_id: hospitalId });
      const { data, error } = await supabase.from('himas_data').insert(dbPayload).select().single();
      
      if (error) throw error;
      
      const mapped = mapPatientFromDB(data);
      if (mapped) {
        // 1. Update State
        setPatients(prev => [mapped, ...prev]);
        
        // 2. Explicitly Invalidate Cache to ensure refresh shows new data
        invalidateCache(`patients_${hospitalId}`);
        
        // 3. Side effects
        syncToGoogleSheets(mapped).catch(() => {});
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(formatError(err));
      setSaveStatus('error');
      throw err;
    }
  };

  const updatePatient = async (updatedPatient: Patient, oldId?: string) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
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
      if (mapped && hospitalId) {
        setPatients(prev => {
          const filtered = prev.filter(p => p.id !== oldId && p.id !== targetId);
          return [mapped, ...filtered].sort((a, b) => 
            new Date(b.entry_date || 0).getTime() - new Date(a.entry_date || 0).getTime()
          );
        });
        invalidateCache(`patients_${hospitalId}`);
        syncToGoogleSheets(mapped).catch(() => {});
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(formatError(err));
      setSaveStatus('error');
      throw err;
    }
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, activeSubTab, setActiveSubTab, patients, updatePatient,
      addPatient,
      deletePatient: async (id) => {
        try {
          const hospitalId = await getEffectiveHospitalId();
          const { error } = await supabase.from('himas_data').delete().eq('id', id);
          if (error) throw error;
          if (hospitalId) invalidateCache(`patients_${hospitalId}`);
          setPatients(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
          console.error("Delete Error:", formatError(err));
        }
      },
      updateDoctorAssessment: async (pid, ass) => {
        const p = patients.find(p => p.id === pid);
        if (p) await updatePatient({ ...p, doctorAssessment: ass, isFollowUpVisit: false });
      }, 
      updatePackageProposal: async (pid, prop) => {
        const p = patients.find(p => p.id === pid);
        if (p) await updatePatient({ ...p, packageProposal: prop });
      },
      getPatientById: (id) => patients.find(p => p.id === id),
      staffUsers, registerStaff: async () => {},
      saveStatus, lastSavedAt, refreshData: (force) => loadData(false, force), 
      prewarmDatabase,
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
