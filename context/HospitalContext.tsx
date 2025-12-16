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
const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';
const STORAGE_KEY_PATIENTS = 'himas_patients_local_backup_v1'; // Local Backup Key
const SHARED_DB_KEY = 'HIMAS_MASTER_DATA'; 

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Persist Role
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
      localStorage.setItem('role', currentUserRole); 
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem('role');
      // On logout, we might want to clear sensitive data from state, 
      // but keeping local backup is safer for offline workflows.
      setPatients([]); 
      setIsDataLoaded(false);
    }
  }, [currentUserRole]);

  // Load Data: Hybrid Approach (Local First + Cloud Sync)
  const loadData = async () => {
    const role = localStorage.getItem("role") || currentUserRole;
    if (!role) return;

    // 1. Try Local Backup First (Immediate UX)
    let hasLocalData = false;
    try {
      const localBackup = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (localBackup) {
        const parsed = JSON.parse(localBackup);
        if (Array.isArray(parsed)) {
          console.log("📍 Loaded data from Local Backup");
          setPatients(parsed);
          hasLocalData = true;
          setIsDataLoaded(true); // Allow immediate editing
        }
      }
    } catch (e) {
      console.error("Local backup error:", e);
    }

    // 2. Try Cloud Sync
    if (isSupabaseConfigured) {
      console.log("☁️ SYNC: Connecting to Cloud...");
      
      // If we don't have local data, show loading spinner. 
      // If we DO have local data, sync in background (silent load).
      if (!hasLocalData) setIsLoading(true);
      setSaveStatus('saving');

      try {
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("role", SHARED_DB_KEY)
          .maybeSingle();

        if (error) {
          throw error;
        } 
        
        if (data?.data) {
          console.log(`✅ SYNC: Cloud Data Received (${Array.isArray(data.data) ? data.data.length : 0} records)`);
          const cloudPatients = data.data as Patient[];
          setPatients(cloudPatients);
          // Update local backup with fresh cloud data
          localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(cloudPatients));
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        } else {
          console.log("ℹ️ SYNC: No Cloud Data (New DB). Initializing...");
          // If no cloud data, we try to initialize it.
          // If we have local data, we push that. If not, empty.
          const initialData = hasLocalData ? patients : [];
          
          const { error: insertError } = await supabase
            .from("app_data")
            .insert({
              role: SHARED_DB_KEY,
              data: initialData,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
             console.warn("Could not init DB row (likely RLS)", insertError.message);
             // Use local mode
          } else {
             setSaveStatus('saved');
          }
        }
      } catch (e: any) {
        console.error("SYNC ERROR:", e.message);
        setSaveStatus('error');
        // We gracefully fallback to local data (which is already loaded)
      } finally {
        setIsLoading(false);
        setIsDataLoaded(true);
      }
    } else {
      console.log("⚠️ SYNC: Offline/Demo Mode");
      setIsDataLoaded(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole) {
      loadData();
    }
  }, [currentUserRole]);

  // Save Data
  useEffect(() => {
    if (!isDataLoaded) return;

    const saveData = async () => {
      // 1. Always save to Local Backup (Safety Net)
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));

      if (!currentUserRole || !isSupabaseConfigured) return;

      setSaveStatus('saving');
      
      try {
        const { error } = await supabase
          .from("app_data")
          .update({
            data: patients,
            updated_at: new Date().toISOString()
          })
          .eq("role", SHARED_DB_KEY);

        if (error) {
          console.error("Cloud Save Failed:", error.message);
          setSaveStatus('error'); 
          // Data is safe in localStorage, so user doesn't lose work
        } else {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } catch (e) {
        console.error("Save Exception:", e);
        setSaveStatus('error');
      }
    };

    const timeout = setTimeout(saveData, 1000);
    return () => clearTimeout(timeout);

  }, [patients, isDataLoaded, currentUserRole]);

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