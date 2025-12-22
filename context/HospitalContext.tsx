
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
  const pollingInterval = useRef<number | null>(null);

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

  const mapPatientFromDB = (item: any): Patient => {
    return {
      ...item,
      doctorAssessment: item.doctor_assessment || item.doctorAssessment || null,
      packageProposal: item.package_proposal || item.packageProposal || null,
      entry_date: item.entry_date || (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      age: item.age ?? 0 
    };
  };

  const mapPatientToDB = (patient: any) => {
    const { doctorAssessment, packageProposal, ...rest } = patient;
    return {
      ...rest,
      doctor_assessment: doctorAssessment,
      package_proposal: packageProposal
    };
  };

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
    const dbPayload = mapPatientToDB(payload);
    
    const runQuery = async (p: any) => {
      return isUpdate 
        ? supabase.from(table).update(p).eq('id', p.id).select().single()
        : supabase.from(table).insert(p).select().single();
    };

    let result = await runQuery(dbPayload);

    if (result.error) {
      const msg = result.error.message || "";
      const code = result.error.code;

      // Handle missing column errors (42703 is undefined_column)
      if (msg.includes('column') || code === '42703') {
         console.warn("Retrying save without newer schema columns...");
         const { entry_date, doctor_assessment, package_proposal, ...minPayload } = dbPayload;
         const retryResult = await runQuery(minPayload);
         
         if (!retryResult.error) {
            setLastErrorMessage(`DATABASE ALERT: Your database is missing columns. Data like Doctor Assessments will NOT be saved until you run the SQL migration in Supabase.`);
            return retryResult;
         }
      }
    }
    
    return result;
  };

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setSaveStatus('saving');
    if (!isBackground) setIsLoading(true);

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
      
      const mappedData = (data || []).map(mapPatientFromDB).sort((a, b) => {
        const dateA = new Date(a.entry_date).getTime();
        const dateB = new Date(b.entry_date).getTime();
        return dateB - dateA; 
      });

      setPatients(mappedData);
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(mappedData));
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
      setLastErrorMessage(e.message || "Sync failed.");
      setSaveStatus('error');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserRole) {
      pollingInterval.current = window.setInterval(() => loadData(true), 10000);
    } else {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    }
    return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
  }, [currentUserRole, loadData]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const hospitalId = await getEffectiveHospitalId();
      if (mounted && hospitalId) await loadData();
      else if (mounted) setIsLoading(false);
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

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadData]);

  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session Lost.");
      const { data, error } = await performSafeUpsert({...updatedPatient, hospital_id: hospitalId}, true);
      if (error) throw new Error(error.message);
      
      const savedPatient = mapPatientFromDB(data);
      setPatients(prev => prev.map(p => p.id === savedPatient.id ? savedPatient : p));
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Update error.");
      setSaveStatus('error');
      throw err;
    }
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, patients, 
      addPatient: async (patientData) => {
        setSaveStatus('saving');
        const hospitalId = await getEffectiveHospitalId();
        const payload = { ...patientData, id: String(patientData.id).trim().toUpperCase(), hospital_id: hospitalId };
        const { data, error } = await performSafeUpsert(payload, false);
        if (error) throw new Error(error.message);
        setPatients(prev => [mapPatientFromDB(data), ...prev]);
        setSaveStatus('saved');
      },
      updatePatient,
      deletePatient: async (id) => {
        const hospitalId = await getEffectiveHospitalId();
        await supabase.from('himas_data').delete().eq('id', id).eq('hospital_id', hospitalId);
        setPatients(prev => prev.filter(p => p.id !== id));
      },
      updateDoctorAssessment: async (pid, ass) => {
        const p = patients.find(p => p.id === pid);
        if (p) {
          const optimisticPatient = { ...p, doctorAssessment: ass };
          setPatients(prev => prev.map(item => item.id === pid ? optimisticPatient : item));
          await updatePatient(optimisticPatient);
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
