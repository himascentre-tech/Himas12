
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser } from '../types';
import { supabase } from '../services/supabaseClient';
import { syncToGoogleSheets } from '../services/googleSheetsService';

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
  clearError: () => void;
  forceStopLoading: () => void;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = 'himas_hospital_role_session';
const SHARED_FACILITY_ID = 'himas_main_facility_2024';

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, _setCurrentUserRole] = useState<Role>(() => {
    try {
      return (sessionStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
    } catch (e) {
      return null;
    }
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  
  const cachedHospitalId = useRef<string | null>(null);
  const pollingInterval = useRef<number | null>(null);

  const setCurrentUserRole = (role: Role) => {
    if (role) {
      sessionStorage.setItem(STORAGE_KEY_ROLE, role);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ROLE);
      cachedHospitalId.current = null;
    }
    _setCurrentUserRole(role);
  };

  const clearError = () => setLastErrorMessage(null);
  const forceStopLoading = () => setIsLoading(false);

  // EXPLICIT MAPPING: DB (snake_case) -> APP (camelCase)
  const mapPatientFromDB = (item: any): Patient | null => {
    if (!item) return null;
    return {
      id: item.id,
      hospital_id: item.hospital_id,
      name: item.name,
      dob: item.dob,
      entry_date: item.entry_date,
      gender: item.gender,
      age: Number(item.age) || 0,
      mobile: item.mobile,
      occupation: item.occupation,
      hasInsurance: item.has_insurance,
      insuranceName: item.insurance_name,
      source: item.source,
      sourceDoctorName: item.source_doctor_name,
      condition: item.condition,
      created_at: item.created_at,
      doctorAssessment: item.doctor_assessment || null,
      packageProposal: item.package_proposal || null
    };
  };

  // EXPLICIT MAPPING: APP (camelCase) -> DB (snake_case)
  const mapPatientToDB = (p: any) => {
    return {
      id: p.id,
      hospital_id: p.hospital_id,
      name: p.name,
      dob: p.dob || null,
      entry_date: p.entry_date,
      gender: p.gender,
      age: Number(p.age) || 0,
      mobile: p.mobile,
      occupation: p.occupation || null,
      has_insurance: p.hasInsurance,
      insurance_name: p.insuranceName || null,
      source: p.source,
      source_doctor_name: p.sourceDoctorName || null,
      condition: p.condition,
      doctor_assessment: p.doctorAssessment || null,
      package_proposal: p.packageProposal || null
    };
  };

  const getEffectiveHospitalId = async () => {
    if (cachedHospitalId.current) return cachedHospitalId.current;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      
      const email = session.user.email || '';
      const demoEmails = ['office@himas.com', 'doctor@himas.com', 'team@himas.com'];
      const id = demoEmails.includes(email) 
        ? SHARED_FACILITY_ID 
        : (session.user.user_metadata?.hospital_id || session.user.id);
      
      cachedHospitalId.current = id;
      return id;
    } catch (e) {
      return null;
    }
  };

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    setSaveStatus('saving');

    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) {
        if (!isBackground) setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('himas_data')
        .select('*')
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      
      const mapped = (data || [])
        .map(mapPatientFromDB)
        .filter((p): p is Patient => p !== null)
        .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());

      setPatients(mapped);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
      console.error("Data Loading Error:", e);
      setLastErrorMessage(e.message || "Fetch failed.");
      setSaveStatus('error');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserRole) {
      loadData();
      pollingInterval.current = window.setInterval(() => loadData(true), 15000);
    } else {
      setIsLoading(false);
    }
    return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
  }, [currentUserRole, loadData]);

  const updatePatient = async (updatedPatient: Patient) => {
    setSaveStatus('saving');
    try {
      const dbPayload = mapPatientToDB(updatedPatient);
      const { data, error } = await supabase
        .from('himas_data')
        .update(dbPayload)
        .eq('id', dbPayload.id)
        .select()
        .single();

      if (error) throw error;
      
      const mapped = mapPatientFromDB(data);
      if (mapped) {
        setPatients(prev => prev.map(p => p.id === updatedPatient.id ? mapped : p));
        syncToGoogleSheets(mapped).catch(e => console.error("Async Sync Error:", e));
      }
      
      setSaveStatus('saved');
    } catch (err: any) {
      console.error("Update Error:", err);
      setSaveStatus('error');
    }
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, patients, updatePatient,
      addPatient: async (pd) => {
        setSaveStatus('saving');
        try {
          const hospitalId = await getEffectiveHospitalId();
          const dbPayload = mapPatientToDB({ ...pd, hospital_id: hospitalId });
          const { data, error } = await supabase.from('himas_data').insert(dbPayload).select().single();
          if (error) throw error;
          
          const mapped = mapPatientFromDB(data);
          if (mapped) {
            setPatients(prev => [mapped, ...prev]);
            syncToGoogleSheets(mapped).catch(e => console.error("Async Sync Error:", e));
          }
          setSaveStatus('saved');
        } catch (err) {
          console.error("Add Patient Error:", err);
          setSaveStatus('error');
        }
      },
      deletePatient: async (id) => {
        try {
          const hospitalId = await getEffectiveHospitalId();
          await supabase.from('himas_data').delete().eq('id', id).eq('hospital_id', hospitalId);
          setPatients(prev => prev.filter(p => p.id !== id));
        } catch (err) {
          console.error("Delete Error:", err);
        }
      },
      updateDoctorAssessment: async (pid, ass) => {
        const p = patients.find(p => p.id === pid);
        if (p) {
          const updated = { ...p, doctorAssessment: ass };
          await updatePatient(updated);
        }
      }, 
      updatePackageProposal: async (pid, prop) => {
        const p = patients.find(p => p.id === pid);
        if (p) {
          const updated = { ...p, packageProposal: prop };
          await updatePatient(updated);
        }
      },
      getPatientById: (id) => patients.find(p => p.id === id),
      staffUsers, registerStaff: async () => {},
      saveStatus, lastSavedAt, refreshData: () => loadData(), 
      isLoading, isStaffLoaded: true, lastErrorMessage, clearError,
      forceStopLoading
    }}>
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) throw new Error('useHospital missing');
  return context;
};
