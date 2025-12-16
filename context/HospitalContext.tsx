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

// We use a shared key so Front Office, Doctor, and Package Team all see the SAME data.
// This simulates a shared database environment.
const SUPABASE_DB_KEY = 'HIMAS_MASTER_DATA'; 

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

  // Flag to prevent overwriting cloud data with empty local state on initial load
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Initialize Patients State with Local Storage fallback
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
      // Also set the generic 'role' key as requested for compatibility/debugging
      localStorage.setItem('role', currentUserRole);
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem('role');
    }
  }, [currentUserRole]);

  // --- SUPABASE INTEGRATION ---

  // 1. LOAD DATA ON MOUNT OR LOGIN
  useEffect(() => {
    const loadData = async () => {
      // Check if role exists as per requirements
      const role = localStorage.getItem('role');
      if (!role) {
        setSaveStatus('unsaved');
        return; 
      }

      try {
        setSaveStatus('saving'); // Indicate loading
        // Attempt to fetch from Supabase
        // We use a shared key (SUPABASE_DB_KEY) to ensure all roles share the same patient data
        const { data, error } = await supabase
          .from('app_data')
          .select('data')
          .eq('role', SUPABASE_DB_KEY)
          .single();

        if (data?.data) {
          console.log('✅ Loaded data from Supabase');
          setPatients(data.data as Patient[]);
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        } else if (error) {
          console.warn('Supabase fetch error (using local data):', error.message);
          setSaveStatus('unsaved');
        }
      } catch (e) {
        console.error('Supabase connection failed, using offline data.');
        setSaveStatus('unsaved');
      } finally {
        setIsDataLoaded(true); // Mark as loaded so we can start saving updates
      }
    };
    loadData();
  }, [currentUserRole]); // Reload when user logs in

  // 2. SAVE DATA ON CHANGE (Auto-save)
  useEffect(() => {
    // Only save if we have finished the initial load to avoid race conditions
    if (!isDataLoaded) return;

    // Save to LocalStorage (Immediate Offline Backup)
    try {
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    } catch (error) {
      console.error('Local storage save failed:', error);
    }

    // Save to Supabase (Cloud Persistence)
    const saveData = async () => {
      // Validate role exists before saving
      const role = localStorage.getItem('role');
      if (!role) {
        console.warn('Role missing in localStorage. Skipping Supabase save.');
        return;
      }

      setSaveStatus('saving');
      try {
        const { error } = await supabase
          .from('app_data')
          .upsert({
            role: SUPABASE_DB_KEY, // Use shared key for data persistence
            data: patients,
            updated_at: new Date().toISOString()
          }, { onConflict: 'role' });

        if (error) {
          console.error('Supabase save error:', error.message);
          setSaveStatus('error');
        } else {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } catch (e) {
        console.error('Supabase save failed:', e);
        setSaveStatus('error');
      }
    };

    // Debounce to prevent flooding
    const timeoutId = setTimeout(saveData, 2000);
    return () => clearTimeout(timeoutId);

  }, [patients, isDataLoaded]);

  // --- END SUPABASE INTEGRATION ---

  // Real-time synchronization across tabs (Local)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PATIENTS && e.newValue) {
        try {
          setPatients(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error syncing storage across tabs:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addPatient = (patientData: Omit<Patient, 'registeredAt'>) => {
    const id = patientData.id.trim() !== '' 
      ? patientData.id 
      : `REG-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPatient: Patient = {
      ...patientData,
      id: id,
      registeredAt: new Date().toISOString(),
    };
    
    setPatients(prev => [newPatient, ...prev]);
  };

  const updatePatient = (updatedPatient: Patient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const deletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const updateDoctorAssessment = (patientId: string, assessment: DoctorAssessment) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, doctorAssessment: assessment } : p
    ));
  };

  const updatePackageProposal = (patientId: string, proposal: PackageProposal) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, packageProposal: proposal } : p
    ));
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
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};