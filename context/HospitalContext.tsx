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
// This key ensures Front Office, Doctor, and Package Team all access the SAME record in Supabase.
const SHARED_DB_KEY = 'HIMAS_MASTER_DATA'; 

// Seed Data (Only used if absolutely no data exists anywhere)
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
  // 1. Initialize Role from LocalStorage
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 2. Initialize Patients from LocalStorage (Offline First)
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : SEED_PATIENTS;
      }
      return SEED_PATIENTS;
    } catch (error) {
      console.error("Error parsing local patients:", error);
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

  // 4. Effect: Load Data from Supabase (On Mount or Login)
  useEffect(() => {
    const loadData = async () => {
      // Check if logged in
      const role = localStorage.getItem("role") || currentUserRole;
      if (!role) {
        console.warn("No active session. Skipping Cloud Load.");
        return;
      }

      console.log("SYNC: Loading data from Cloud...");
      setSaveStatus('saving');

      try {
        // Fetch using SHARED_DB_KEY so everyone sees the same patients
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("role", SHARED_DB_KEY)
          .maybeSingle(); // Handles 0 or 1 result safely

        if (error) {
          console.warn("Supabase Load Warning:", error.message);
          setSaveStatus('unsaved');
        } else if (data?.data) {
          console.log("✅ SYNC: Data loaded from Cloud");
          // Update state with cloud data
          const cloudPatients = data.data as Patient[];
          if (Array.isArray(cloudPatients)) {
            setPatients(cloudPatients);
            // Update local storage immediately to match cloud
            localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(cloudPatients));
            setSaveStatus('saved');
            setLastSavedAt(new Date());
          }
        } else {
          console.log("SYNC: No Cloud data found. Keeping Local data.");
        }
      } catch (e) {
        console.error("SYNC: Connection failed:", e);
        setSaveStatus('unsaved');
      } finally {
        setIsDataLoaded(true); // Allow saving to start
      }
    };

    loadData();
  }, [currentUserRole]); // Re-run when user logs in

  // 5. Effect: Save Data to Supabase (On Change)
  useEffect(() => {
    // Prevent saving before initial load completes to avoid overwriting cloud with empty state
    if (!isDataLoaded) return;

    // A. Backup to LocalStorage (Synchronous/Immediate)
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));

    // B. Save to Supabase (Async)
    const saveData = async () => {
      // Verify login status (check both storage and state for robustness)
      const role = localStorage.getItem("role") || currentUserRole;
      if (!role) {
        return; // User logged out, stop saving
      }

      setSaveStatus('saving');
      
      try {
        const { error } = await supabase
          .from("app_data")
          .upsert({
            role: SHARED_DB_KEY, // Save to the shared slot
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

  // 6. Effect: Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PATIENTS && e.newValue) {
        console.log("SYNC: Tab update received");
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