
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser } from '../types';
import { supabase } from '../services/supabaseClient';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => Promise<void>; 
  updatePatient: (patient: Patient) => Promise<void>;
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
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = 'himas_hospital_role_session';
const STORAGE_KEY_PATIENTS = 'himas_patients_cache_v13';
const SHARED_FACILITY_ID = 'himas_main_facility_2024';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, _setCurrentUserRole] = useState<Role>(() => {
    try {
      return (sessionStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
    } catch (e) {
      return null;
    }
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  
  const cachedHospitalId = useRef<string | null>(null);

  const setCurrentUserRole = (role: Role) => {
    if (role) {
      sessionStorage.setItem(STORAGE_KEY_ROLE, role);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem(STORAGE_KEY_PATIENTS); 
    }
    _setCurrentUserRole(role);
  };

  const clearError = () => setLastErrorMessage(null);
  const forceStopLoading = () => setIsLoading(false);

  const getEffectiveHospitalId = async () => {
    if (cachedHospitalId.current) return cachedHospitalId.current;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;
      
      const email = session.user.email || '';
      const demoEmails = ['office@himas.com', 'doctor@himas.com', 'team@himas.com'];
      const id = demoEmails.includes(email) 
        ? SHARED_FACILITY_ID 
        : (session.user.user_metadata?.hospital_id || session.user.id);
      
      cachedHospitalId.current = id;
      return id;
    } catch (e) {
      return null;
    }
  };

  const performSafeUpsert = async (payload: any, isUpdate = false) => {
    const table = 'himas_data';
    
    const runQuery = async (p: any) => {
      return isUpdate 
        ? supabase.from(table).update(p).eq('id', p.id).select().single()
        : supabase.from(table).insert(p).select().single();
    };

    let result = await runQuery(payload);

    if (result.error) {
      const msg = result.error.message || "";
      const code = result.error.code;

      // Handle missing 'entry_date' column specifically (Postgres 42703 is undefined_column)
      if (msg.includes('entry_date') || msg.includes('column') || code === '42703') {
         console.warn("Attempting recovery: Saving without 'entry_date' column...");
         const { entry_date, ...fallbackPayload } = payload;
         const retryResult = await runQuery(fallbackPayload);
         
         if (!retryResult.error) {
            setLastErrorMessage(`CRITICAL: 'entry_date' column is missing in your Database. Please run the ALTER TABLE SQL provided in the warning below.`);
            return retryResult;
         }
      }
    }
    
    return result;
  };

  const loadData = useCallback(async () => {
    setSaveStatus('saving');
    setIsLoading(true);

    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) {
        setIsLoading(false);
        setSaveStatus('saved');
        return;
      }

      const { data, error } = await supabase
        .from('himas_data')
        .select('*')
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      
      const sortedData = (data || []).map(item => ({
        ...item,
        // Fallback for UI if entry_date column exists but is null, OR if column is missing entirely from query
        entry_date: item.entry_date || (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        age: item.age ?? 0 
      })).sort((a, b) => {
        const dateA = new Date(a.entry_date).getTime();
        const dateB = new Date(b.entry_date).getTime();
        return dateB - dateA; 
      });

      setPatients(sortedData);
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(sortedData));
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      // Don't auto-clear the error if it's a schema warning to keep the user informed
      if (!lastErrorMessage?.includes('column is missing')) setLastErrorMessage(null);
    } catch (e: any) {
      console.error("Sync Error:", e);
      setLastErrorMessage(e.message || "Database connection failed.");
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [lastErrorMessage]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const hospitalId = await getEffectiveHospitalId();
        if (mounted && hospitalId) await loadData();
        else if (mounted) setIsLoading(false);
      } catch (err) {
        if (mounted) setIsLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN') {
        cachedHospitalId.current = null;
        await loadData();
      } else if (event === 'SIGNED_OUT') {
        cachedHospitalId.current = null;
        setPatients([]);
        setCurrentUserRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadData]);

  const addPatient = async (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session expired.");

      const payload = {
        ...patientData,
        id: String(patientData.id).trim().toUpperCase(),
        age: Number(patientData.age) || 0,
        hospital_id: hospitalId
      };

      const { data, error } = await performSafeUpsert(payload, false);
      if (error) throw new Error(error.message);
      
      const newPatient = {
        ...data,
        entry_date: data.entry_date || (data.created_at ? data.created_at.split('T')[0] : payload.entry_date)
      } as Patient;
      
      setPatients(prev => [newPatient, ...prev]);
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Submit failed.");
      setSaveStatus('error');
      throw err;
    }
  };

  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session Lost.");
      const { data, error } = await performSafeUpsert({...updatedPatient, hospital_id: hospitalId}, true);
      if (error) throw new Error(error.message);
      
      const savedPatient = {
        ...data,
        entry_date: data.entry_date || updatedPatient.entry_date
      } as Patient;
      
      setPatients(prev => prev.map(p => p.id === savedPatient.id ? savedPatient : p));
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Update error.");
      setSaveStatus('error');
      throw err;
    }
  };

  const deletePatient = async (id: string) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) return;
      await supabase.from('himas_data').delete().eq('id', id).eq('hospital_id', hospitalId);
      setPatients(prev => prev.filter(p => p.id !== id));
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
    }
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, patients, addPatient, updatePatient, deletePatient,
      updateDoctorAssessment: async (pid, ass) => {
        const p = patients.find(p => p.id === pid);
        if (p) await updatePatient({ ...p, doctorAssessment: ass });
      }, 
      updatePackageProposal: async (pid, prop) => {
        const p = patients.find(p => p.id === pid);
        if (p) await updatePatient({ ...p, packageProposal: prop });
      },
      getPatientById: (id: string) => patients.find(p => p.id === id),
      staffUsers, registerStaff: async () => {},
      saveStatus, lastSavedAt, refreshData: loadData, 
      isLoading, isStaffLoaded: true, lastErrorMessage, clearError,
      forceStopLoading
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
