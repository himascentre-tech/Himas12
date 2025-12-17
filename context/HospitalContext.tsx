import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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

  // Ref to track if an update came from the cloud to prevent echo-saving
  const isRemoteUpdate = useRef(false);

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

    setIsLoading(true);
    
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
          // We don't set isDataLoaded=true yet if we want to ensure cloud sync attempts first
          // But to allow offline usage, we can set it, but keep isLoading true
        }
      }
    } catch (e) {
      console.error("Local backup error:", e);
    }

    // 2. Try Cloud Sync
    if (isSupabaseConfigured) {
      console.log("☁️ SYNC: Connecting to Cloud...");
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
          
          // Mark this as a remote update so we don't save it back immediately
          isRemoteUpdate.current = true;
          
          const cloudPatients = data.data as Patient[];
          setPatients(cloudPatients);
          localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(cloudPatients));
          
          setSaveStatus('saved');
          setLastSavedAt(new Date());
          setIsDataLoaded(true); // Safe to enable saving now
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
             console.warn("Could not init DB row (likely RLS or connection)", insertError.message);
             // If init fails but we have local data, allow working offline
             if (hasLocalData) setIsDataLoaded(true); 
          } else {
             setSaveStatus('saved');
             setIsDataLoaded(true);
          }
        }
      } catch (e: any) {
        console.error("SYNC ERROR:", e.message);
        setSaveStatus('error');
        // Graceful Fallback: If we have local data, allow usage.
        if (hasLocalData) {
          setIsDataLoaded(true);
        } else {
          // Critical Failure: No Cloud, No Local. 
          // Do NOT set isDataLoaded(true). App will show loading or error state, preventing empty overwrite.
        }
      } finally {
        setIsLoading(false);
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

  // REALTIME SUBSCRIPTION
  useEffect(() => {
    if (!currentUserRole || !isSupabaseConfigured) return;

    console.log("🔌 Subscribing to Realtime Changes...");
    const channel = supabase
      .channel('app_data_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_data',
          filter: `role=eq.${SHARED_DB_KEY}`,
        },
        (payload) => {
          console.log("⚡ Realtime Update Received:", payload);
          const newData = payload.new as any;
          if (newData && Array.isArray(newData.data)) {
             // 1. Lock saving to prevent echo
             isRemoteUpdate.current = true;
             // 2. Update State
             setPatients(newData.data);
             // 3. Update Local Backup
             localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(newData.data));
             setLastSavedAt(new Date(newData.updated_at));
             setSaveStatus('saved');
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserRole]);

  // Save Data
  useEffect(() => {
    // STRICT CHECK: Never save if initial load failed or is pending
    if (!isDataLoaded) return;

    // CHECK LOCK: Do not save if this update came from the cloud
    if (isRemoteUpdate.current) {
      // Reset lock and skip
      isRemoteUpdate.current = false;
      return;
    }

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