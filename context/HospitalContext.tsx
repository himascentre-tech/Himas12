import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  // Patient Data
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'registeredAt' | 'hospital_id'>) => Promise<void>; 
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  updateDoctorAssessment: (patientId: string, assessment: DoctorAssessment) => Promise<void>;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => Promise<void>;
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

const STORAGE_KEY_ROLE = 'himas_hospital_role_v1';
const SHARED_STAFF_KEY = 'HIMAS_STAFF_DATA';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isStaffLoaded, setIsStaffLoaded] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Persist role selection
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      setPatients([]); 
    }
  }, [currentUserRole]);

  // Load staff data (Shared lookup)
  useEffect(() => {
    const loadStaffData = async () => {
      if (isSupabaseConfigured) {
         try {
           const { data, error } = await supabase
             .from("app_data")
             .select("data")
             .eq("role", SHARED_STAFF_KEY)
             .maybeSingle();
           
           if (!error && data?.data) setStaffUsers(data.data);
         } catch(e) { console.error("Staff sync failed", e); }
      }
      setIsStaffLoaded(true);
    };
    loadStaffData();
  }, []);

  // --- 2️⃣ SELECT DATA (SCOPED BY HOSPITAL_ID) ---
  const loadData = async () => {
    if (!currentUserRole) return;
    setIsLoading(true);
    setSaveStatus('saving');

    try {
      // ✅ Retrieve the authenticated user to access metadata
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.user_metadata?.hospital_id) {
        const hospitalId = user.user_metadata.hospital_id;
        
        // ✅ Filter by hospital_id for strict multi-tenancy
        const { data, error } = await supabase
          .from('himas_data')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('registeredAt', { ascending: false });

        if (error) throw error;
        
        if (data) {
          setPatients(data as Patient[]);
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        }
      } else {
        throw new Error("Unauthorized: Hospital ID missing from user session.");
      }
    } catch (e: any) {
      console.error("Dashboard Load Error:", e);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole) {
      loadData();
    }
  }, [currentUserRole]);

  // Real-time synchronization (Scoped to current hospital)
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserRole) return;

    let channel: any;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const hospitalId = user?.user_metadata?.hospital_id;
      if (!hospitalId) return;

      channel = supabase
        .channel(`hospital_realtime_${hospitalId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'himas_data',
          filter: `hospital_id=eq.${hospitalId}`
        }, (payload: any) => {
            if (payload.eventType === 'INSERT') {
              setPatients(prev => [payload.new as Patient, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setPatients(prev => prev.map(p => p.id === payload.new.id ? payload.new as Patient : p));
            } else if (payload.eventType === 'DELETE') {
              setPatients(prev => prev.filter(p => p.id !== payload.old.id));
            }
            setLastSavedAt(new Date());
            setSaveStatus('saved');
        })
        .subscribe();
    };

    setupSubscription();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [currentUserRole]);

  // --- 1️⃣ INSERT PATIENT (INJECT HOSPITAL_ID) ---
  const addPatient = async (patientData: Omit<Patient, 'registeredAt' | 'hospital_id'>) => {
    setSaveStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const hospitalId = user?.user_metadata?.hospital_id;

      if (!hospitalId) throw new Error("Permission Denied: No Hospital ID.");

      const { error } = await supabase
        .from('himas_data')
        .insert({
          ...patientData,
          hospital_id: hospitalId,
          registeredAt: new Date().toISOString()
        });

      if (error) throw error;
      setSaveStatus('saved');
    } catch (err) {
      console.error("Registration Error:", err);
      setSaveStatus('error');
      throw err;
    }
  };

  // --- UPDATE PATIENT (SCOPED BY HOSPITAL_ID) ---
  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const hospitalId = user?.user_metadata?.hospital_id;

      if (!hospitalId) throw new Error("Permission Denied: No Hospital ID.");

      const { error } = await supabase
        .from('himas_data')
        .update(updatedPatient)
        .eq('id', updatedPatient.id)
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      setSaveStatus('saved');
    } catch (err) {
      console.error("Update Error:", err);
      setSaveStatus('error');
    }
  };

  // --- DELETE PATIENT (SCOPED BY HOSPITAL_ID) ---
  const deletePatient = async (id: string) => {
    setSaveStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const hospitalId = user?.user_metadata?.hospital_id;

      if (!hospitalId) throw new Error("Permission Denied: No Hospital ID.");

      const { error } = await supabase
        .from('himas_data')
        .delete()
        .eq('id', id)
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      setSaveStatus('saved');
    } catch (err) {
      console.error("Deletion Error:", err);
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
