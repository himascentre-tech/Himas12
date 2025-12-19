
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser } from '../types';
import { supabase } from '../services/supabaseClient';
import { syncToGoogleSheets } from '../services/googleSheetsService';

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
  isSheetsSyncEnabled: boolean;
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
  
  const isSheetsSyncEnabled = true;
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
    const query = isUpdate 
      ? supabase.from(table).update(payload).eq('id', payload.id)
      : supabase.from(table).insert(payload);

    const { data, error } = await query.select().single();
    return { data, error };
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
    } catch (e: any) {
      setSaveStatus('error');
      const cached = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (cached) {
        try { setPatients(JSON.parse(cached)); } catch(err) {}
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const hospitalId = await getEffectiveHospitalId();
      if (mounted && hospitalId) await loadData();
      else if (mounted) setIsLoading(false);
    };
    init();
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
      
      const newPatient = data as Patient;
      setPatients(prev => [newPatient, ...prev]);
      
      // Trigger Google Sheets Sync
      await syncToGoogleSheets(newPatient);

      setSaveStatus('saved');
    } catch (err: any) {
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
      
      const savedPatient = data as Patient;
      setPatients(prev => prev.map(p => p.id === savedPatient.id ? savedPatient : p));
      
      // Sync update to Google Sheets
      await syncToGoogleSheets(savedPatient);

      setSaveStatus('saved');
    } catch (err: any) {
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
      forceStopLoading, isSheetsSyncEnabled
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
