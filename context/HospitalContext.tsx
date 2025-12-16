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

// Storage Keys - Session only
const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';
// Note: We deliberately do NOT use a local storage key for patients when online 
// to ensure Supabase is the single source of truth.

// SHARED DATABASE KEY - This ensures all roles see the SAME data
const SHARED_DB_KEY = 'HIMAS_MASTER_DATA'; 

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initialize Role from LocalStorage (Session Persistence)
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  // State Management
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Safety Lock
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 2. Effect: Persist Role Changes
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
      localStorage.setItem('role', currentUserRole); 
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem('role');
      setPatients([]); // Clear data on logout
      setIsDataLoaded(false);
    }
  }, [currentUserRole]);

  // 3. Function to load data from Cloud
  const loadData = async () => {
    // Only load if logged in
    const role = localStorage.getItem("role") || currentUserRole;
    if (!role) return;

    if (isSupabaseConfigured) {
      console.log("SYNC: Fetching from Cloud...");
      setIsLoading(true); 
      setSaveStatus('saving');

      try {
        // Fetch the shared master record
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("role", SHARED_DB_KEY)
          .maybeSingle();

        if (error) {
          console.error("Supabase Load Error:", error.message);
          setSaveStatus('error');
          // Do NOT enable saving if load failed to prevent data overwrite
        } else if (data?.data) {
          console.log(`✅ SYNC: Loaded ${Array.isArray(data.data) ? data.data.length : 0} records.`);
          setPatients(data.data as Patient[]);
          setSaveStatus('saved');
          setLastSavedAt(new Date());
          setIsDataLoaded(true); // Enable saving
        } else {
          console.log("SYNC: No Cloud Data found. Creating master record.");
          // IMPORTANT: If row doesn't exist, we MUST create it so UPDATE works later.
          // This self-heals the DB if the manual SQL wasn't run.
          const { error: insertError } = await supabase
            .from("app_data")
            .insert({
              role: SHARED_DB_KEY,
              data: [],
              updated_at: new Date().toISOString()
            });

          if (insertError) {
             console.error("SYNC: Failed to create master record", insertError);
             setSaveStatus('error');
          } else {
             setPatients([]); 
             setIsDataLoaded(true); // Enable saving for new data
             setSaveStatus('saved');
          }
        }
      } catch (e) {
        console.error("SYNC: Network Exception", e);
        setSaveStatus('error');
      } finally {
        setIsLoading(false); 
      }
    } else {
      // Offline/Demo Mode (Fallback)
      console.log("SYNC: Offline Mode");
      setIsDataLoaded(true);
      setIsLoading(false);
    }
  };

  // 4. Load Data on Mount/Login
  useEffect(() => {
    if (currentUserRole) {
      loadData();
    }
  }, [currentUserRole]);

  // 5. Save Data (Only if loaded successfully)
  useEffect(() => {
    if (!isDataLoaded) return; // STRICT CHECK: Never save if initial load failed or is pending

    const saveData = async () => {
      if (!currentUserRole || !isSupabaseConfigured) return;

      setSaveStatus('saving');
      console.log("Saving to Supabase", patients); // Debug log
      
      try {
        // ✅ CORRECTED LOGIC: Use UPDATE instead of UPSERT
        // This ensures we only update the existing master row and don't create duplicates
        const { error } = await supabase
          .from("app_data")
          .update({
            data: patients,
            updated_at: new Date().toISOString()
          })
          .eq("role", SHARED_DB_KEY); // Identifies the specific row to update

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

    // Debounce saves to reduce API calls
    const timeout = setTimeout(saveData, 1000);
    return () => clearTimeout(timeout);

  }, [patients, isDataLoaded, currentUserRole]);

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