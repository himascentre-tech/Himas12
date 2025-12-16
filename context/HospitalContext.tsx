import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient, DoctorAssessment, PackageProposal, Role, Gender, Feeling } from '../types';

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'registeredAt'>) => void; 
  updateDoctorAssessment: (patientId: string, assessment: DoctorAssessment) => void;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => void;
  getPatientById: (id: string) => Patient | undefined;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

// Seed Data
const SEED_PATIENTS: Patient[] = [
  {
    id: 'REG-1001',
    name: 'Sarah Jenkins',
    dob: '1979-05-15',
    gender: Gender.Female,
    age: 45,
    mobile: '555-0123',
    occupation: 'Teacher',
    hasInsurance: 'Yes',
    insuranceName: 'Aetna Health',
    source: 'Google',
    feeling: Feeling.SlightPain,
    registeredAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'REG-1002',
    name: 'Michael Chen',
    dob: '1962-08-20',
    gender: Gender.Male,
    age: 62,
    mobile: '555-0198',
    occupation: 'Retired',
    hasInsurance: 'No',
    source: 'Doctor Recommended',
    feeling: Feeling.SickOrTired,
    registeredAt: new Date().toISOString(),
  }
];

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persist Login State
  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    return (localStorage.getItem('mediflow_role') as Role) || null;
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('mediflow_patients');
    return saved ? JSON.parse(saved) : SEED_PATIENTS;
  });

  // Effect to persist role
  useEffect(() => {
    if (currentUserRole) {
      localStorage.setItem('mediflow_role', currentUserRole);
    } else {
      localStorage.removeItem('mediflow_role');
    }
  }, [currentUserRole]);

  // Effect to persist patients
  useEffect(() => {
    localStorage.setItem('mediflow_patients', JSON.stringify(patients));
  }, [patients]);

  // Real-time synchronization across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mediflow_patients' && e.newValue) {
        setPatients(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addPatient = (patientData: Omit<Patient, 'registeredAt'>) => {
    const id = patientData.id.trim() !== '' 
      ? patientData.id 
      : `REG-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPatient: Patient = {
      ...patientData,
      id: id,
      registeredAt: new Date().toISOString(),
    };
    
    // Update state - persistence handled by useEffect
    setPatients(prev => [newPatient, ...prev]);
  };

  const updateDoctorAssessment = (patientId: string, assessment: DoctorAssessment) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, doctorAssessment: assessment } : p
    ));
  };

  const updatePackageProposal = (patientId: string, proposal: PackageProposal) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, packageProposal: proposal } : p
    ));
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id);

  return (
    <HospitalContext.Provider value={{
      currentUserRole,
      setCurrentUserRole,
      patients,
      addPatient,
      updateDoctorAssessment,
      updatePackageProposal,
      getPatientById
    }}>
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};