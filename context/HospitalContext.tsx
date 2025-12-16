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
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEY_PATIENTS = 'himas_hospital_patients_v1';
const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';

// SHARED DATABASE KEY
// We use a constant key for the 'role' column in Supabase so that
// Front Office, Doctor, and Package Team all share the SAME patient list.
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
  },
  {
    id: 'REG-1002',
    name: 'Michael Chen',
    dob: '1962-08-20',
    gender: Gender.Male,
    age: 62,
    mobile: '555-0198',
    occupation: 'Retired',
    hasInsurance: 'No',
    source: 'Doctor Recommended',
    condition: Condition.Piles,
    registeredAt: new Date().toISOString(),
  }
];

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persist Login State
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Initialize Patients State
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (saved) return JSON.parse(saved);
      return SEED_PATIENTS;
    } catch (error) {
      return SEED_PATIENTS;
    }
  });

  // Effect to persist role
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
      localStorage.setItem('role', currentUserRole); // Compatibility with user prompt
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem('role');
    }
  }, [currentUserRole]);

  // --- SUPABASE LOAD LOGIC ---
  useEffect(() => {
    const loadData = async () => {
      // 1. Verify Role exists in LocalStorage
      const role = localStorage.getItem("role");
      if (!role) {
        console.warn("No role found in localStorage. Skipping load.");
        return;
      }

      console.log("LOADING DATA FOR USER ROLE:", role);
      setSaveStatus('saving');

      try {
        // 2. Fetch data from Supabase using the SHARED key
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("role", SHARED_DB_KEY) // We query the shared data
          .single();

        if (error) {
          console.warn("Supabase Load Error (or no data yet):", error.message);
          setSaveStatus('unsaved');
        } else if (data?.data) {
          console.log("✅ Loaded data from Supabase");
          setPatients(data.data as Patient[]);
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } catch (e) {
        console.error("Connection failed:", e);
        setSaveStatus('unsaved');
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, [currentUserRole]);

  // --- SUPABASE SAVE LOGIC (Auto-Save) ---
  useEffect(() => {
    if (!isDataLoaded) return;

    // Local Backup
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));

    const saveData = async () => {
      // 1. Verify Role exists
      const role = localStorage.getItem("role");
      if (!role) {
        console.error("No role found in localStorage. Login required to save!");
        setSaveStatus('unsaved');
        return;
      }

      setSaveStatus('saving');
      
      try {
        // 2. Upsert data to Supabase using the SHARED key
        const { error } = await supabase
          .from("app_data")
          .upsert({
            role: SHARED_DB_KEY, // Use shared key so everyone sees updates
            data: patients,
            updated_at: new Date().toISOString()
          }, { onConflict: 'role' });

        if (error) {
          console.error("Supabase Save Error:", error.message);
          setSaveStatus('error');
        } else {
          console.log("Data saved successfully for role:", role);
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } catch (e) {
        console.error("Supabase Save Exception:", e);
        setSaveStatus('error');
      }
    };

    const timeoutId = setTimeout(saveData, 2000); // Debounce
    return () => clearTimeout(timeoutId);
  }, [patients, isDataLoaded]);

  // Sync tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PATIENTS && e.newValue) {
        setPatients(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
      lastSavedAt
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