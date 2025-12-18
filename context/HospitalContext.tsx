import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser } from '../types';
import { supabase } from '../services/supabaseClient';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => Promise<void>; 
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  updateDoctorAssessment: (patientId: string, assessment: DoctorAssessment) => Promise<void>;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  staffUsers: StaffUser[];
  registerStaff: (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isStaffLoaded, setIsStaffLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const getEffectiveHospitalId = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.user_metadata?.hospital_id || user.id;
  };

  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
    }
  }, [currentUserRole]);

  const loadData = useCallback(async () => {
    if (!currentUserRole) {
      setIsLoading(false);
      return;
    }
    
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      
      if (!hospitalId) {
        setCurrentUserRole(null);
        setSaveStatus('saved');
        return;
      }

      const { data, error } = await supabase
        .from('himas_data')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPatients(data || []);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
      const msg = e.message || JSON.stringify(e);
      console.error("Data Load Error:", msg);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole]);

  useEffect(() => {
    let authListener: any;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && currentUserRole) {
        setCurrentUserRole(null);
      } else if (session && currentUserRole) {
        loadData();
      } else {
        setIsLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUserRole(null);
          setPatients([]);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentUserRole) loadData();
        }
      });
      authListener = subscription;
    };

    initAuth();
    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, [currentUserRole, loadData]);

  useEffect(() => {
    if (!currentUserRole) return;

    let channel: any;

    const setupSubscription = async () => {
      const hospitalId = await getEffectiveHospitalId();
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
              setPatients(prev => {
                if (prev.some(p => p.id === payload.new.id)) return prev;
                return [payload.new as Patient, ...prev];
              });
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

  useEffect(() => {
    const loadStaffData = async () => {
      try {
        const { data, error } = await supabase
          .from("app_data")
          .select("data")
          .eq("role", SHARED_STAFF_KEY)
          .maybeSingle();
        
        if (!error && data?.data) setStaffUsers(data.data);
      } catch(e) { 
        console.error("Staff sync failed", e); 
      } finally {
        setIsStaffLoaded(true);
      }
    };
    loadStaffData();
  }, []);

  const addPatient = async (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Unauthenticated: No Session found.");

      const { error } = await supabase
        .from('himas_data')
        .insert({
          ...patientData,
          hospital_id: hospitalId
          // Let Supabase handle created_at default timestamp
        });

      if (error) throw error;
      setSaveStatus('saved');
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err);
      console.error("Registration Error:", msg);
      setSaveStatus('error');
      throw new Error(msg);
    }
  };

  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Unauthenticated: No Session found.");

      const { error } = await supabase
        .from('himas_data')
        .update(updatedPatient)
        .eq('id', updatedPatient.id)
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      setSaveStatus('saved');
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err);
      console.error("Update Error:", msg);
      setSaveStatus('error');
    }
  };

  const deletePatient = async (id: string) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Unauthenticated: No Session found.");

      const { error } = await supabase
        .from('himas_data')
        .delete()
        .eq('id', id)
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      setSaveStatus('saved');
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err);
      console.error("Deletion Error:", msg);
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

  const registerStaff = async (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => {
    const newStaff: StaffUser = {
      ...staffData,
      id: `USR-${Date.now()}`,
      registeredAt: new Date().toISOString()
    };
    const updatedStaff = [...staffUsers, newStaff];
    setStaffUsers(updatedStaff);
    
    try {
      await supabase
        .from("app_data")
        .upsert({ role: SHARED_STAFF_KEY, data: updatedStaff });
    } catch (e) {
      console.error("Failed to persist staff directory", e);
    }
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