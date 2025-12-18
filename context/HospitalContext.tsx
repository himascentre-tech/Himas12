import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  lastErrorMessage: string | null;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

// Using sessionStorage so login is required when the domain is re-opened in a new session
const STORAGE_KEY_ROLE = 'himas_hospital_role_session';
const STORAGE_KEY_PATIENTS = 'himas_patients_cache_v1';
const SHARED_STAFF_KEY = 'HIMAS_STAFF_DATA';
const SHARED_FACILITY_ID = 'himas_main_facility_2024';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, _setCurrentUserRole] = useState<Role>(() => {
    return (sessionStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
  });

  const setCurrentUserRole = (role: Role) => {
    if (role) {
      sessionStorage.setItem(STORAGE_KEY_ROLE, role);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ROLE);
    }
    _setCurrentUserRole(role);
  };

  const [patients, setPatients] = useState<Patient[]>(() => {
    const cached = localStorage.getItem(STORAGE_KEY_PATIENTS);
    return cached ? JSON.parse(cached) : [];
  });

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaffLoaded, setIsStaffLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  
  const cachedHospitalId = useRef<string | null>(null);

  useEffect(() => {
    if (patients.length > 0) {
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    }
  }, [patients]);

  const getEffectiveHospitalId = async () => {
    if (cachedHospitalId.current) return cachedHospitalId.current;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const demoEmails = ['office@himas.com', 'doctor@himas.com', 'team@himas.com'];
    const id = demoEmails.includes(session.user.email || '') 
      ? SHARED_FACILITY_ID 
      : (session.user.user_metadata?.hospital_id || session.user.id);
    cachedHospitalId.current = id;
    return id;
  };

  const loadData = useCallback(async (isInitial = false) => {
    if (!currentUserRole) {
      setIsLoading(false);
      return;
    }
    
    if (isInitial) setIsLoading(true);
    setSaveStatus('saving');
    setLastErrorMessage(null);

    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session not found.");

      // FIX: Removed .order('created_at') to avoid "column does not exist" error
      const { data, error } = await supabase
        .from('himas_data')
        .select('*')
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      
      // FIX: Perform sorting in memory safely
      const sortedData = (data || []).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // Descending (newest first)
      });

      setPatients(sortedData);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
      setLastErrorMessage(e.message || "Cloud Connection Error");
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Strictly enforce login if no session or if sessionStorage role is missing
      if (!session) {
        setCurrentUserRole(null);
        setPatients([]);
        setIsLoading(false);
      } else if (currentUserRole) {
        await loadData(true);
      } else {
        setIsLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
          cachedHospitalId.current = null;
          setCurrentUserRole(null);
          setPatients([]);
          localStorage.removeItem(STORAGE_KEY_PATIENTS);
          sessionStorage.removeItem(STORAGE_KEY_ROLE);
        }
      });
      return () => subscription.unsubscribe();
    };
    initAuth();
  }, [currentUserRole, loadData]);

  const addPatient = async (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("No session.");

      const payload = {
        id: patientData.id,
        hospital_id: hospitalId,
        name: patientData.name,
        dob: patientData.dob || null,
        gender: patientData.gender,
        age: Number(patientData.age) || 0,
        mobile: patientData.mobile,
        occupation: patientData.occupation || '',
        hasInsurance: patientData.hasInsurance,
        insuranceName: patientData.insuranceName || null,
        source: patientData.source,
        condition: patientData.condition
      };

      const { data, error } = await supabase
        .from('himas_data')
        .insert(payload)
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') throw new Error("File ID already exists.");
        throw error;
      }
      
      setPatients(prev => [data as Patient, ...prev]);
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Save failed");
      setSaveStatus('error');
      throw err;
    }
  };

  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) throw new Error("Session Lost.");

      const { data, error } = await supabase
        .from('himas_data')
        .update({ ...updatedPatient, age: Number(updatedPatient.age) || 0 })
        .eq('id', updatedPatient.id)
        .eq('hospital_id', hospitalId)
        .select()
        .single();

      if (error) throw error;
      setPatients(prev => prev.map(p => p.id === updatedPatient.id ? (data as Patient) : p));
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Update failed");
      setSaveStatus('error');
    }
  };

  const deletePatient = async (id: string) => {
    setSaveStatus('saving');
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) return;
      const { error } = await supabase.from('himas_data').delete().eq('id', id).eq('hospital_id', hospitalId);
      if (error) throw error;
      setPatients(prev => prev.filter(p => p.id !== id));
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(err.message || "Delete failed");
      setSaveStatus('error');
    }
  };

  const updateDoctorAssessment = async (patientId: string, assessment: DoctorAssessment) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) await updatePatient({ ...patient, doctorAssessment: assessment });
  };

  const updatePackageProposal = async (patientId: string, proposal: PackageProposal) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) await updatePatient({ ...patient, packageProposal: proposal });
  };

  const registerStaff = async (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => {
    const newStaff: StaffUser = { ...staffData, id: `USR-${Date.now()}`, registeredAt: new Date().toISOString() };
    const updatedStaff = [...staffUsers, newStaff];
    setStaffUsers(updatedStaff);
    await supabase.from("app_data").upsert({ role: SHARED_STAFF_KEY, data: updatedStaff });
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, patients, addPatient, updatePatient, deletePatient,
      updateDoctorAssessment, updatePackageProposal, getPatientById: (id: string) => patients.find(p => p.id === id),
      staffUsers, registerStaff, saveStatus, lastSavedAt, refreshData: () => loadData(false), 
      isLoading, isStaffLoaded, lastErrorMessage
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