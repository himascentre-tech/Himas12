import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, Gender, Condition } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'registeredAt'>) => void; 
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  updateDoctorAssessment: (patientId: string, assessment: DoctorAssessment) => void;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => void;
  getPatientById: (id: string) => Patient | undefined;
  saveStatus: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSavedAt: Date | null;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEY_PATIENTS = 'himas_hospital_patients_v1';
const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';

// SHARED DATABASE KEY
const SHARED_DB_KEY = 'HIMAS_MASTER_DATA'; 

// Seed Data (Only for Offline Demo)
const SEED_PATIENTS: Patient[] = [
  {
    id: 'REG-1001',
    name: 'Sarah Jenkins',
    dob: '1979-05-15',
    gender: Gender.Female,
    age: 45,
    mobile: '555-0123',
    occupation: 'Teacher',
    hasInsurance: 'Yes',
    insuranceName: 'Aetna Health',
    source: 'Google',
    condition: Condition.Hernia,
    registeredAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initialize Role
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Safety Lock
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 2. Initialize Patients
  const [patients, setPatients] = useState<Patient[]>(() => {
    // If Supabase is connected, start EMPTY to avoid "Seed Data Overwrite" bug.
    // We trust loadData() to fetch the real list.
    if (isSupabaseConfigured) return [];
    
    // Only use LocalStorage/Seed if strictly offline/demo mode
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : SEED_PATIENTS;
      }
      return SEED_PATIENTS;
    } catch {
      return SEED_PATIENTS;
    }
  });

  // 3. Persist Role
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
      localStorage.setItem('role', currentUserRole); 
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem('role');
    }
  }, [currentUserRole]);

  // Function to load data from Cloud
  const loadData = async () => {
    const role = localStorage.getItem("role") || currentUserRole;
    if (!role) return;

    if (isSupabaseConfigured) {
      console.log("SYNC: Starting Cloud Sync...");
      setIsLoading(true); // Lock the UI
      setSaveStatus('saving');

      try {
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("role", SHARED_DB_KEY)
          .maybeSingle();

        if (error) {
          console.error("Supabase Load Error:", error.message);
          setSaveStatus('error');
          // Important: We do NOT unlock saving (isDataLoaded) if sync failed
          // This prevents overwriting cloud with local empty state
        } else if (data?.data) {
          console.log("✅ SYNC: Cloud Data Received");
          setPatients(data.data as Patient[]);
          localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(data.data));
          setSaveStatus('saved');
          setLastSavedAt(new Date());
          setIsDataLoaded(true); // Allow future saves
        } else {
          console.log("SYNC: No Cloud Data (New Database)");
          // Database is empty, safe to initialize with empty list (or keep current if we want)
          setIsDataLoaded(true); // Allow saving
          setSaveStatus('saved');
        }
      } catch (e) {
        console.error("SYNC: Network Error", e);
        setSaveStatus('error');
      } finally {
        setIsLoading(false); // Unlock UI
      }
    } else {
      // Offline Mode
      setIsDataLoaded(true);
      setIsLoading(false);
    }
  };

  // 4. Load Data on Login
  useEffect(() => {
    if (currentUserRole) {
      loadData();
    }
  }, [currentUserRole]);

  // 5. Save Data (Only if loaded)
  useEffect(() => {
    if (!isDataLoaded) return; // STRICT CHECK: Never save if we haven't successfully loaded first

    // A. Local Backup
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));

    // B. Cloud Save
    const saveData = async () => {
      const role = localStorage.getItem("role") || currentUserRole;
      if (!role || !isSupabaseConfigured) return;

      setSaveStatus('saving');
      
      try {
        const { error } = await supabase
          .from("app_data")
          .upsert({
            role: SHARED_DB_KEY,
            data: patients,
            updated_at: new Date().toISOString()
          }, { onConflict: 'role' });

        if (error) {
          console.error("Supabase Save Error:", error.message);
          setSaveStatus('error');
        } else {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } catch (e) {
        console.error("Save Exception:", e);
        setSaveStatus('error');
      }
    };

    // Debounce slightly to prevent thrashing
    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);

  }, [patients, isDataLoaded, currentUserRole]);

  // 6. Cross-tab Sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PATIENTS && e.newValue) {
        setPatients(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Actions
  const addPatient = (patientData: Omit<Patient, 'registeredAt'>) => {
    const id = patientData.id.trim() !== '' 
      ? patientData.id 
      : `REG-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPatient: Patient = { ...patientData, id, registeredAt: new Date().toISOString() };
    setPatients(prev => [newPatient, ...prev]);
  };

  const updatePatient = (updatedPatient: Patient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const deletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const updateDoctorAssessment = (patientId: string, assessment: DoctorAssessment) => {
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, doctorAssessment: assessment } : p));
  };

  const updatePackageProposal = (patientId: string, proposal: PackageProposal) => {
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, packageProposal: proposal } : p));
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id);

  return (
    <HospitalContext.Provider value={{
      currentUserRole,
      setCurrentUserRole,
      patients,
      addPatient,
      updatePatient,
      deletePatient,
      updateDoctorAssessment,
      updatePackageProposal,
      getPatientById,
      saveStatus,
      lastSavedAt,
      refreshData: loadData,
      isLoading
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