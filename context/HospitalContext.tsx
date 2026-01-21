
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, StaffUser, BookingStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { syncToGoogleSheets } from '../services/googleSheetsService';
import { cachedFetch, updateCache, invalidateCache } from '../utils/cache';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'created_at' | 'hospital_id'>) => Promise<void>; 
  updatePatient: (patient: Patient, oldId?: string) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  updateDoctorAssessment: (patientId: string, assessment: DoctorAssessment) => Promise<void>;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  searchPatients: (term: string) => Promise<void>;
  staffUsers: StaffUser[];
  registerStaff: (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => Promise<void>;
  saveStatus: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSavedAt: Date | null;
  refreshData: (force?: boolean) => Promise<void>;
  prewarmDatabase: () => Promise<void>;
  isLoading: boolean;
  isInitialLoading: boolean;
  isStaffLoaded: boolean;
  lastErrorMessage: string | null;
  clearError: () => void;
  forceStopLoading: () => void;
  formatError: (e: any) => string;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = 'himas_hospital_role_session';
const SHARED_FACILITY_ID = 'himas_main_facility_2024';

const PATIENT_FIELDS = `
  id,
  hospital_id,
  name,
  dob,
  entry_date,
  gender,
  age,
  mobile,
  occupation,
  has_insurance,
  insurance_name,
  source,
  source_doctor_name,
  condition,
  created_at,
  doctor_assessment,
  package_proposal,
  is_follow_up,
  last_follow_up_visit_date,
  booking_status,
  booking_time,
  arrival_time,
  follow_up_control
`.replace(/\s+/g, '');

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, _setCurrentUserRole] = useState<Role>(() => {
    try {
      return (sessionStorage.getItem(STORAGE_KEY_ROLE) as Role) || null;
    } catch (e) {
      return null;
    }
  });

  const [activeSubTab, setActiveSubTab] = useState<string>('DASHBOARD');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  
  const cachedHospitalId = useRef<string | null>(null);

  const formatError = useCallback((e: any): string => {
    if (!e) return "Unknown error occurred";
    if (typeof e === 'string') return e;
    return e.message || String(e);
  }, []);

  const mapPatientFromDB = (item: any): Patient | null => {
    if (!item) return null;
    
    const doctorAssessment = (item.doctor_assessment && typeof item.doctor_assessment === 'object' && Object.keys(item.doctor_assessment).length > 0) 
      ? (item.doctor_assessment as DoctorAssessment) 
      : null;
    const packageProposal = (item.package_proposal && typeof item.package_proposal === 'object' && Object.keys(item.package_proposal).length > 0) 
      ? (item.package_proposal as PackageProposal) 
      : null;

    return {
      id: item.id,
      hospital_id: item.hospital_id || '',
      name: item.name || 'Unknown Patient',
      dob: item.dob || null,
      entry_date: item.entry_date || new Date().toISOString().split('T')[0],
      gender: item.gender || 'Other',
      age: Number(item.age) || 0,
      mobile: item.mobile || '',
      occupation: item.occupation || '',
      hasInsurance: item.has_insurance || 'No',
      insuranceName: item.insurance_name || '',
      source: item.source || 'Other',
      sourceDoctorName: item.source_doctor_name || '',
      condition: item.condition || 'Other',
      created_at: item.created_at || new Date().toISOString(),
      doctorAssessment,
      packageProposal,
      isFollowUpVisit: Boolean(item.is_follow_up),
      lastFollowUpVisitDate: item.last_follow_up_visit_date || null,
      bookingStatus: (item.booking_status === '' || item.booking_status === null) ? null : (item.booking_status as BookingStatus),
      bookingTime: item.booking_time || null,
      followUpControl: item.follow_up_control || null,
      arrivalTime: item.arrival_time || null
    };
  };

  const getEffectiveHospitalId = async () => {
    if (cachedHospitalId.current) return cachedHospitalId.current;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const email = session.user.email || '';
    const demoEmails = ['office@himas.com', 'doctor@himas.com', 'team@himas.com'];
    const id = demoEmails.includes(email.toLowerCase()) ? SHARED_FACILITY_ID : (session.user.user_metadata?.hospital_id || session.user.id);
    cachedHospitalId.current = id;
    return id;
  };

  const loadData = useCallback(async (isBackground = false, force = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) {
        setIsInitialLoading(false);
        return;
      }
      const cacheKey = `patients_${hospitalId}`;
      if (force) invalidateCache(cacheKey);

      const data = await cachedFetch(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('himas_data')
            .select(PATIENT_FIELDS)
            .eq('hospital_id', hospitalId)
            .order('entry_date', { ascending: false })
            .range(0, 99);
          if (error) throw error;
          return data;
        },
        force ? 0 : (isBackground ? 60000 : 30000)
      );
      
      const mapped = (data || []).map(mapPatientFromDB).filter((p): p is Patient => p !== null);
      setPatients(mapped);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (e: any) {
      setLastErrorMessage(formatError(e));
      setSaveStatus('error');
    } finally {
      if (!isBackground) {
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    }
  }, [formatError]);

  const searchPatients = async (term: string) => {
    if (!term || term.length < 2) {
      loadData(false, false);
      return;
    }
    setIsLoading(true);
    try {
      const hospitalId = await getEffectiveHospitalId();
      if (!hospitalId) return;
      const { data, error } = await supabase
        .from('himas_data')
        .select(PATIENT_FIELDS)
        .eq('hospital_id', hospitalId)
        .or(`name.ilike.%${term}%,mobile.ilike.%${term}%,id.ilike.%${term}%`)
        .limit(50);
      if (error) throw error;
      setPatients((data || []).map(mapPatientFromDB).filter((p): p is Patient => p !== null));
    } catch (e: any) {
      setLastErrorMessage(formatError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const updatePatient = async (updatedPatient: Patient, oldId?: string) => {
    setSaveStatus('saving');
    try {
      const dbPayload = {
        id: updatedPatient.id,
        name: updatedPatient.name,
        dob: updatedPatient.dob,
        age: updatedPatient.age,
        gender: updatedPatient.gender,
        mobile: updatedPatient.mobile,
        occupation: updatedPatient.occupation,
        has_insurance: updatedPatient.hasInsurance,
        insurance_name: updatedPatient.insuranceName,
        source: updatedPatient.source,
        source_doctor_name: updatedPatient.sourceDoctorName,
        condition: updatedPatient.condition,
        doctor_assessment: updatedPatient.doctorAssessment,
        package_proposal: updatedPatient.packageProposal,
        booking_status: updatedPatient.bookingStatus,
        booking_time: updatedPatient.bookingTime,
        arrival_time: updatedPatient.arrivalTime
      };

      const { data, error } = await supabase
        .from('himas_data')
        .update(dbPayload)
        .eq('id', oldId || updatedPatient.id)
        .select(PATIENT_FIELDS)
        .single();

      if (error) throw error;
      const mapped = mapPatientFromDB(data);
      if (mapped) {
        setPatients(prev => [mapped, ...prev.filter(p => p.id !== (oldId || updatedPatient.id))]);
        invalidateCache(`patients_${cachedHospitalId.current}`);
        syncToGoogleSheets(mapped).catch(() => {});
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setLastErrorMessage(formatError(err));
      setSaveStatus('error');
    }
  };

  return (
    <HospitalContext.Provider value={{
      currentUserRole, 
      setCurrentUserRole: (role) => {
        if (role) {
          sessionStorage.setItem(STORAGE_KEY_ROLE, role);
          setActiveSubTab('DASHBOARD');
          setIsInitialLoading(true);
        } else {
          sessionStorage.removeItem(STORAGE_KEY_ROLE);
          setPatients([]);
          cachedHospitalId.current = null;
        }
        _setCurrentUserRole(role);
      }, 
      activeSubTab, setActiveSubTab, patients, 
      searchPatients,
      updatePatient,
      addPatient: async (pd) => {
        setSaveStatus('saving');
        const hospitalId = await getEffectiveHospitalId();
        const { data, error } = await supabase.from('himas_data').insert({ ...pd, hospital_id: hospitalId }).select(PATIENT_FIELDS).single();
        if (error) throw error;
        const mapped = mapPatientFromDB(data);
        if (mapped) {
          setPatients(prev => [mapped, ...prev]);
          invalidateCache(`patients_${cachedHospitalId.current}`);
          syncToGoogleSheets(mapped).catch(() => {});
        }
        setSaveStatus('saved');
      },
      deletePatient: async (id) => {
        await supabase.from('himas_data').delete().eq('id', id);
        setPatients(prev => prev.filter(p => p.id !== id));
        invalidateCache(`patients_${cachedHospitalId.current}`);
      },
      updateDoctorAssessment: async (pid, ass) => {
        const p = patients.find(pat => pat.id === pid);
        if (p) await updatePatient({ ...p, doctorAssessment: ass });
      }, 
      updatePackageProposal: async (pid, prop) => {
        const p = patients.find(pat => pat.id === pid);
        if (p) await updatePatient({ ...p, packageProposal: prop });
      },
      getPatientById: (id) => patients.find(p => p.id === id),
      staffUsers, registerStaff: async () => {},
      saveStatus, lastSavedAt, refreshData: (force) => loadData(false, force), 
      prewarmDatabase: async () => {
        await supabase.from('himas_data').select('id', { count: 'exact', head: true }).limit(1);
      },
      isLoading, isInitialLoading, isStaffLoaded: true, lastErrorMessage, clearError: () => setLastErrorMessage(null),
      forceStopLoading: () => { setIsLoading(false); setIsInitialLoading(false); },
      formatError
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
