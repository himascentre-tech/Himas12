import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';
const STORAGE_KEY_PATIENTS = 'himas_patients_cache_v1';
const SHARED_STAFF_KEY = 'HIMAS_STAFF_DATA';

// Fixed hospital ID for the demo environment to ensure all roles see the same patient list
const SHARED_FACILITY_ID = 'himas_main_facility_2024';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    const cached = localStorage.getItem(STORAGE_KEY_PATIENTS);
    return cached ? JSON.parse(cached) : [];
  });

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaffLoaded, setIsStaffLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (patients.length > 0) {
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    }
  }, [patients]);

  const getEffectiveHospitalId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    
    // For demo accounts, we enforce a shared facility ID so data is visible across logins
    const demoEmails = ['office@himas.com', 'doctor@himas.com', 'team@himas.com'];
    if (demoEmails.includes(session.user.email || '')) {
      return SHARED_FACILITY_ID;
    }
    
    return session.user.user_metadata?.hospital_id || session.user.id;
  };

  const loadData = useCallback(async () => {
    if (!currentUserRole) {
      setIsLoading(false);
      return;
    }
    
    setSaveStatus('saving');
    setLastErrorMessage(null);

    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) {
        // Brief retry for session initialization
        await new Promise(r => setTimeout(r, 800));
        const retryId = await getEffectiveHospitalId();
        if (!retryId) throw new Error("Database session lost. Please login again.");
      }

      const hid = hospitalId || SHARED_FACILITY_ID;
      const { data, error } = await supabase
        .from('himas_data')
        .select('*')
        .eq('hospital_id', hid);

      if (error) throw error;
      
      const sortedData = (data || []).sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      setPatients(sortedData);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
      const msg = e.message || JSON.stringify(e);
      console.error("Cloud Fetch Error:", msg);
      setLastErrorMessage(msg);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && currentUserRole) {
        await loadData();
      } else if (!session && currentUserRole) {
        setCurrentUserRole(null);
        setPatients([]);
      } else {
        setIsLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUserRole(null);
          setPatients([]);
          localStorage.removeItem(STORAGE_KEY_PATIENTS);
          localStorage.removeItem(STORAGE_KEY_ROLE);
        } else if (event === 'SIGNED_IN') {
          if (currentUserRole) await loadData();
        }
      });
      return () => subscription.unsubscribe();
    };
    initAuth();
  }, [currentUserRole, loadData]);

  const addPatient = async (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => {
    setSaveStatus('saving');
    setLastErrorMessage(null);
    
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("No active database session.");

      // Ensure data types match Supabase schema (Age as Number)
      const payload = {
        id: patientData.id, // Primary Key (File Number)
        hospital_id: hospitalId,
        name: patientData.name,
        dob: patientData.dob || null,
        gender: patientData.gender,
        age: Number(patientData.age) || 0,
        mobile: patientData.mobile,
        occupation: patientData.occupation || '',
        hasInsurance: patientData.hasInsurance,
        insuranceName: patientData.insuranceName || null,
        source: patientData.source,
        condition: patientData.condition
        // Note: 'created_at' is omitted so Postgres can handle it automatically
      };

      const { error } = await supabase.from('himas_data').insert(payload);
      
      if (error) {
        if (error.code === '23505') throw new Error("Patient File ID already exists in Database.");
        throw error;
      }
      
      setSaveStatus('saved');
      await loadData(); // Refresh list to see new record
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err);
      setLastErrorMessage(msg);
      setSaveStatus('error');
      alert(`Database Save Failed: ${msg}`);
      throw new Error(msg);
    }
  };

  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    setLastErrorMessage(null);
    
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session Lost.");

      const { error } = await supabase
        .from('himas_data')
        .update({
          ...updatedPatient,
          age: Number(updatedPatient.age) || 0
        })
        .eq('id', updatedPatient.id)
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      
      setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || JSON.stringify(err));
      setSaveStatus('error');
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
      setLastErrorMessage(err.message || JSON.stringify(err));
      setSaveStatus('error');
    }
  };

  const updateDoctorAssessment = async (patientId: string, assessment: DoctorAssessment) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      await updatePatient({ ...patient, doctorAssessment: assessment });
    }
  };

  const updatePackageProposal = async (patientId: string, proposal: PackageProposal) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      await updatePatient({ ...patient, packageProposal: proposal });
    }
  };

  const registerStaff = async (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => {
    const newStaff: StaffUser = { ...staffData, id: `USR-${Date.now()}`, registeredAt: new Date().toISOString() };
    const updatedStaff = [...staffUsers, newStaff];
    setStaffUsers(updatedStaff);
    await supabase.from("app_data").upsert({ role: SHARED_STAFF_KEY, data: updatedStaff });
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id);

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, patients, addPatient, updatePatient, deletePatient,
      updateDoctorAssessment, updatePackageProposal, getPatientById, staffUsers, registerStaff,
      saveStatus, lastSavedAt, refreshData: loadData, isLoading, isStaffLoaded, lastErrorMessage
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