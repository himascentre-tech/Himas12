import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, Gender, Condition } from '../types';
import { supabase } from '../services/supabaseClient';

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
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEY_PATIENTS = 'himas_hospital_patients_v1';
const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';

// SHARED DATABASE KEY
const SHARED_DB_KEY = 'HIMAS_MASTER_DATA'; 

// Seed Data
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
  // 1. Initialize Role from LocalStorage
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 2. Initialize Patients (Offline First Strategy)
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : SEED_PATIENTS;
      }
      return SEED_PATIENTS;
    } catch (error) {
      return SEED_PATIENTS;
    }
  });

  // 3. Effect: Persist Role Changes
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

    console.log("SYNC: Fetching master record from Cloud...");
    setSaveStatus('saving');

    try {
      // FETCH FROM SHARED KEY (All users see the same data)
      const { data, error } = await supabase
        .from("app_data")
        .select("data")
        .eq("role", SHARED_DB_KEY)
        .maybeSingle();

      if (error) {
        console.warn("Supabase Load Error:", error.message);
        setSaveStatus('error');
        // CRITICAL: Do NOT set isDataLoaded(true) here.
        // If load fails, we should not enable auto-save, otherwise we might overwrite
        // cloud data with our local seed data.
        return;
      } 
      
      if (data?.data) {
        console.log("✅ SYNC: Master record loaded.");
        const cloudPatients = data.data as Patient[];
        if (Array.isArray(cloudPatients)) {
          setPatients(cloudPatients);
          // Update local backup
          localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(cloudPatients));
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } else {
        console.log("SYNC: No cloud data found. Initializing new DB record.");
        // If explicit success but no data, we can assume it's a fresh start
        // and allow saving our local (seed) data.
      }
      
      // Only now is it safe to enable auto-save
      setIsDataLoaded(true);

    } catch (e) {
      console.error("SYNC: Network error:", e);
      setSaveStatus('error');
      // Do NOT enable auto-save on network error
    } 
  };

  // 4. Effect: Load Data from Supabase (On Mount or Login)
  useEffect(() => {
    loadData();
  }, [currentUserRole]);

  // 5. Effect: Save Data to Supabase (On Change)
  useEffect(() => {
    // Only save if we have finished initial loading successfully
    // This prevents overwriting the cloud with seed data if the load failed.
    if (!isDataLoaded) return;

    // A. Backup to LocalStorage (Immediate)
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));

    // B. Save to Supabase (Async)
    const saveData = async () => {
      const role = localStorage.getItem("role") || currentUserRole;
      if (!role) return; // Don't save if logged out

      setSaveStatus('saving');
      
      try {
        const { error } = await supabase
          .from("app_data")
          .upsert({
            role: SHARED_DB_KEY, // Constant key for synchronization
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
        console.error("Supabase Save Exception:", e);
        setSaveStatus('error');
      }
    };

    saveData();
  }, [patients, isDataLoaded, currentUserRole]);

  // 6. Effect: Cross-tab Synchronization
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
      refreshData: loadData
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