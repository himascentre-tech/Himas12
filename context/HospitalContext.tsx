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
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = 'himas_hospital_role_session';
const STORAGE_KEY_PATIENTS = 'himas_patients_cache_v8';
const SHARED_FACILITY_ID = 'himas_main_facility_2024';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, _setCurrentUserRole] = useState<Role>(() => {
    try {
      return (sessionStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
    } catch (e) {
      return null;
    }
  });

  const setCurrentUserRole = (role: Role) => {
    if (role) {
      sessionStorage.setItem(STORAGE_KEY_ROLE, role);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem(STORAGE_KEY_PATIENTS); 
    }
    _setCurrentUserRole(role);
  };

  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  
  const cachedHospitalId = useRef<string | null>(null);

  const clearError = () => setLastErrorMessage(null);

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
      console.error("Session check failed", e);
      return null;
    }
  };

  const performSafeUpsert = async (payload: any, isUpdate = false) => {
    const table = 'himas_data';
    let query = isUpdate 
      ? supabase.from(table).update(payload).eq('id', payload.id)
      : supabase.from(table).insert(payload);

    let { data, error } = await query.select().single();

    if (error && error.code === '42703' && /column "?age"?/i.test(error.message)) {
      const { age, ...safePayload } = payload;
      let retryQuery = isUpdate
        ? supabase.from(table).update(safePayload).eq('id', payload.id)
        : supabase.from(table).insert(safePayload);
      
      const retry = await retryQuery.select().single();
      data = retry.data;
      error = retry.error;
    }
    return { data, error };
  };

  const loadData = useCallback(async () => {
    // START LOAD DATA
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) {
        // No session or ID, can't load but must stop loading indicator
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('himas_data')
        .select('*')
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      
      const sortedData = (data || []).map(item => ({
        ...item,
        age: item.age ?? 0 
      })).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; 
      });

      setPatients(sortedData);
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(sortedData));
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setLastErrorMessage(null);
    } catch (e: any) {
      console.error("Cloud Fetch Error:", e);
      setLastErrorMessage(e.message || "Cloud Connection Error");
      setSaveStatus('error');
      
      const cached = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (cached) {
        try {
          setPatients(JSON.parse(cached));
        } catch (parseErr) {
          console.error("Cache corrupted", parseErr);
        }
      }
    } finally {
      // GUARANTEE: This is called no matter what happens in the try/catch
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Fail-safe: Force stop loading after 8 seconds if Supabase hangs
    const safetyTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn("Safety trigger: Forcing loading state to false after timeout.");
        setIsLoading(false);
      }
    }, 8000);

    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (sessionError) {
          console.error("Supabase Session Error:", sessionError);
          setIsLoading(false);
          return;
        }

        if (session) {
          await loadData();
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Init sequence failed", err);
        if (mounted) setIsLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [loadData]);

  const addPatient = async (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session expired. Please log in again.");

      const payload = {
        id: patientData.id,
        name: patientData.name,
        dob: patientData.dob || null,
        gender: patientData.gender,
        age: Number(patientData.age) || 0,
        mobile: patientData.mobile,
        occupation: patientData.occupation || '',
        hasInsurance: patientData.hasInsurance,
        insuranceName: patientData.insuranceName || null,
        source: patientData.source || '',
        condition: patientData.condition,
        hospital_id: hospitalId
      };

      const { data, error } = await performSafeUpsert(payload, false);
      if (error) {
        if (error.code === '23505') throw new Error(`Duplicate Entry: ID "${patientData.id}" already exists.`);
        throw error;
      }
      setPatients(prev => [data as Patient, ...prev]);
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Failed to sync.");
      setSaveStatus('error');
      throw err;
    }
  };

  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session Lost.");

      const payload = {
        ...updatedPatient,
        age: Number(updatedPatient.age) || 0,
        hospital_id: hospitalId
      };

      const { data, error } = await performSafeUpsert(payload, true);
      if (error) throw error;
      setPatients(prev => prev.map(p => p.id === updatedPatient.id ? (data as Patient) : p));
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Update failed");
      setSaveStatus('error');
      throw err;
    }
  };

  const deletePatient = async (id: string) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) return;
      const { error } = await supabase.from('himas_data').delete().eq('id', id).eq('hospital_id', hospitalId);
      if (error) throw error;
      setPatients(prev => prev.filter(p => p.id !== id));
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Delete failed");
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
      isLoading, isStaffLoaded: true, lastErrorMessage, clearError
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
