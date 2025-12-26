
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

  const mapPatientFromDB = (item: any): Patient => ({
    ...item,
    doctorAssessment: item.doctor_assessment || item.doctorAssessment || null,
    packageProposal: item.package_proposal || item.packageProposal || null,
    entry_date: item.entry_date || (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    age: item.age ?? 0 
  });

  const mapPatientToDB = (patient: any) => {
    const { doctorAssessment, packageProposal, ...rest } = patient;
    return {
      ...rest,
      doctor_assessment: doctorAssessment,
      package_proposal: packageProposal
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

  const performSafeUpsert = async (payload: any, isUpdate = false) => {
    const dbPayload = mapPatientToDB(payload);
    const query = isUpdate 
      ? supabase.from('himas_data').update(dbPayload).eq('id', dbPayload.id)
      : supabase.from('himas_data').insert(dbPayload);

    const result = await query.select().single();

    if (result.error && (result.error.code === '42703' || result.error.message.includes('column'))) {
      const { entry_date, doctor_assessment, package_proposal, ...fallback } = dbPayload;
      setLastErrorMessage(`DATABASE ALERT: Columns missing. Run SQL in Supabase: ALTER TABLE himas_data ADD COLUMN IF NOT EXISTS doctor_assessment JSONB;`);
      return isUpdate 
        ? supabase.from('himas_data').update(fallback).eq('id', fallback.id).select().single()
        : supabase.from('himas_data').insert(fallback).select().single();
    }
    return result;
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
      
      const mapped = (data || []).map(mapPatientFromDB).sort((a, b) => 
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );

      setPatients(mapped);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
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
      const hospitalId = await getEffectiveHospitalId();
      const { data, error } = await performSafeUpsert({...updatedPatient, hospital_id: hospitalId}, true);
      if (error) throw error;
      
      const mapped = mapPatientFromDB(data);
      setPatients(prev => prev.map(p => p.id === updatedPatient.id ? mapped : p));
      
      // Trigger Real-time Sheets Sync
      syncToGoogleSheets(mapped).catch(console.error);
      
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
    }
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole, patients, updatePatient,
      addPatient: async (pd) => {
        setSaveStatus('saving');
        const hospitalId = await getEffectiveHospitalId();
        const { data, error } = await performSafeUpsert({ ...pd, hospital_id: hospitalId });
        if (error) throw error;
        
        const mapped = mapPatientFromDB(data);
        setPatients(prev => [mapped, ...prev]);
        
        // Trigger Real-time Sheets Sync
        syncToGoogleSheets(mapped).catch(console.error);
        
        setSaveStatus('saved');
      },
      deletePatient: async (id) => {
        const hospitalId = await getEffectiveHospitalId();
        await supabase.from('himas_data').delete().eq('id', id).eq('hospital_id', hospitalId);
        setPatients(prev => prev.filter(p => p.id !== id));
      },
      updateDoctorAssessment: async (pid, ass) => {
        const p = patients.find(p => p.id === pid);
        if (p) {
          const updated = { ...p, doctorAssessment: ass };
          setPatients(prev => prev.map(item => item.id === pid ? updated : item));
          await updatePatient(updated);
        }
      }, 
      updatePackageProposal: async (pid, prop) => {
        const p = patients.find(p => p.id === pid);
        if (p) await updatePatient({ ...p, packageProposal: prop });
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
