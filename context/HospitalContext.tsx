import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, Gender, Condition, StaffUser } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  // Patient Data
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'registeredAt'>) => void; 
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  updateDoctorAssessment: (patientId: string, assessment: DoctorAssessment) => void;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => void;
  getPatientById: (id: string) => Patient | undefined;
  // Staff Data
  staffUsers: StaffUser[];
  registerStaff: (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => void;
  // System State
  saveStatus: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSavedAt: Date | null;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  isStaffLoaded: boolean;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';
const STORAGE_KEY_PATIENTS = 'himas_patients_local_backup_v1';
const STORAGE_KEY_STAFF = 'himas_staff_local_backup_v1';
const SHARED_DB_KEY = 'HIMAS_MASTER_DATA'; 
const SHARED_STAFF_KEY = 'HIMAS_STAFF_DATA';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isStaffLoaded, setIsStaffLoaded] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Refs to prevent echo-saving
  const isRemoteUpdatePatients = useRef(false);
  const isRemoteUpdateStaff = useRef(false);

  // Persist Role
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
      localStorage.setItem('role', currentUserRole); 
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem('role');
      // On logout, clear sensitive patient data but keep staff data for login validation
      setPatients([]); 
      setIsDataLoaded(false);
    }
  }, [currentUserRole]);

  // --- LOAD STAFF DATA (Runs on Mount, Independent of Login) ---
  useEffect(() => {
    const loadStaffData = async () => {
      // 1. Local Backup
      try {
        const localBackup = localStorage.getItem(STORAGE_KEY_STAFF);
        if (localBackup) {
          const parsed = JSON.parse(localBackup);
          if (Array.isArray(parsed)) {
            setStaffUsers(parsed);
          }
        }
      } catch (e) { console.error("Local staff load error", e); }

      // 2. Cloud Sync
      if (isSupabaseConfigured) {
         try {
           const { data, error } = await supabase
             .from("app_data")
             .select("data")
             .eq("role", SHARED_STAFF_KEY)
             .maybeSingle();
           
           if (!error && data?.data) {
             isRemoteUpdateStaff.current = true;
             setStaffUsers(data.data);
             localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(data.data));
           } else if (!data) {
             // Init if empty
             await supabase.from("app_data").insert({ role: SHARED_STAFF_KEY, data: [], updated_at: new Date().toISOString() });
           }
         } catch(e) { console.error("Staff sync failed", e); }
      }
      setIsStaffLoaded(true);
    };
    loadStaffData();
  }, []);

  // --- LOAD PATIENT DATA (Dependent on Login) ---
  const loadData = async () => {
    const role = localStorage.getItem("role") || currentUserRole;
    if (!role) return;

    setIsLoading(true);
    
    let hasLocalData = false;
    try {
      const localBackup = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (localBackup) {
        const parsed = JSON.parse(localBackup);
        if (Array.isArray(parsed)) {
          setPatients(parsed);
          hasLocalData = true;
        }
      }
    } catch (e) { console.error("Local backup error:", e); }

    if (isSupabaseConfigured) {
      setSaveStatus('saving');
      try {
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("role", SHARED_DB_KEY)
          .maybeSingle();

        if (error) throw error;
        
        if (data?.data) {
          isRemoteUpdatePatients.current = true;
          const cloudPatients = data.data as Patient[];
          setPatients(cloudPatients);
          localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(cloudPatients));
          setSaveStatus('saved');
          setLastSavedAt(new Date());
          setIsDataLoaded(true);
        } else {
          const initialData = hasLocalData ? patients : [];
          const { error: insertError } = await supabase
            .from("app_data")
            .insert({
              role: SHARED_DB_KEY,
              data: initialData,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
             if (hasLocalData) setIsDataLoaded(true); 
          } else {
             setSaveStatus('saved');
             setIsDataLoaded(true);
          }
        }
      } catch (e: any) {
        setSaveStatus('error');
        if (hasLocalData) setIsDataLoaded(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsDataLoaded(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole) {
      loadData();
    }
  }, [currentUserRole]);

  // --- REALTIME SUBSCRIPTION (PATIENTS & STAFF) ---
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('global_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_data' }, (payload: any) => {
          const rowRole = payload.new?.role;
          const newData = payload.new?.data;
          
          if (rowRole === SHARED_DB_KEY && currentUserRole && Array.isArray(newData)) {
             // Patients Update
             isRemoteUpdatePatients.current = true;
             setPatients(newData);
             localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(newData));
             setLastSavedAt(new Date(payload.new.updated_at));
             setSaveStatus('saved');
          } else if (rowRole === SHARED_STAFF_KEY && Array.isArray(newData)) {
             // Staff Update
             isRemoteUpdateStaff.current = true;
             setStaffUsers(newData);
             localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(newData));
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserRole]);

  // --- SAVE PATIENTS ---
  useEffect(() => {
    if (!isDataLoaded || isRemoteUpdatePatients.current) {
      isRemoteUpdatePatients.current = false;
      return;
    }

    const saveData = async () => {
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
      if (!currentUserRole || !isSupabaseConfigured) return;

      setSaveStatus('saving');
      try {
        const { error } = await supabase
          .from("app_data")
          .update({ data: patients, updated_at: new Date().toISOString() })
          .eq("role", SHARED_DB_KEY);

        if (error) setSaveStatus('error'); 
        else {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } catch (e) { setSaveStatus('error'); }
    };

    const timeout = setTimeout(saveData, 1000);
    return () => clearTimeout(timeout);
  }, [patients, isDataLoaded, currentUserRole]);

  // --- SAVE STAFF ---
  useEffect(() => {
    if (!isStaffLoaded || isRemoteUpdateStaff.current) {
      isRemoteUpdateStaff.current = false;
      return;
    }

    const saveStaff = async () => {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(staffUsers));
      if (!isSupabaseConfigured) return;

      try {
        await supabase
          .from("app_data")
          .update({ data: staffUsers, updated_at: new Date().toISOString() })
          .eq("role", SHARED_STAFF_KEY);
      } catch (e) { console.error("Staff save failed", e); }
    };

    const timeout = setTimeout(saveStaff, 1000);
    return () => clearTimeout(timeout);
  }, [staffUsers, isStaffLoaded]);

  // --- ACTIONS ---
  
  const addPatient = (patientData: Omit<Patient, 'registeredAt'>) => {
    const id = patientData.id.trim() !== '' ? patientData.id : `REG-${Math.floor(1000 + Math.random() * 9000)}`;
    setPatients(prev => [{ ...patientData, id, registeredAt: new Date().toISOString() }, ...prev]);
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

  const registerStaff = (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => {
    const newStaff: StaffUser = {
      ...staffData,
      id: `USR-${Date.now()}`,
      registeredAt: new Date().toISOString()
    };
    setStaffUsers(prev => [...prev, newStaff]);
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
      staffUsers,
      registerStaff,
      saveStatus,
      lastSavedAt,
      refreshData: loadData,
      isLoading,
      isStaffLoaded
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