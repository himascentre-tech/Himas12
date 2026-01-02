
export type Role = 'FRONT_OFFICE' | 'DOCTOR' | 'PACKAGE_TEAM' | null;

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum Condition {
  Piles = 'Piles',
  Fissure = 'Fissure',
  Fistula = 'Fistula',
  Hernia = 'Hernia',
  Gallstones = 'Gallstones',
  Appendix = 'Appendix',
  VaricoseVeins = 'Varicose Veins',
  Other = 'Other',
}

export enum SurgeonCode {
  M1 = 'M1 - Medication Only',
  S1 = 'S1 - Surgery Recommended',
}

export enum SurgeryProcedure {
  LapChole = 'Lap Cholecystectomy',
  LapAppen = 'Lap Appendectomy',
  LapUmbilical = 'Lap Umbilical Hernioplasty',
  LapInguinal = 'Lap Inguinal Hernioplasty',
  LaserVaricose = 'Laser Varicose Veins',
  LaserPiles = 'Laser Piles',
  LaserPilonido = 'Laser Pilonidoplasty',
  LaserFistula = 'Laser Fistula + Perianal Abscess',
  LaserFissure = 'Laser Fissure',
  StaplerHaem = 'Stapler Haemorrhoidectomy',
  Others = 'Others',
}

export enum PainSeverity {
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
}

export enum Affordability {
  A1 = 'A1 - Basic',
  A2 = 'A2 - Mid',
  A3 = 'A3 - Premium',
}

export enum ConversionReadiness {
  CR1 = 'CR1 - Ready',
  CR2 = 'CR2 - Needs Push',
  CR3 = 'CR3 - Needs Counseling',
  CR4 = 'CR4 - Not Ready',
}

export enum ProposalStatus {
  Pending = 'Pending Counseling',
  FollowUp = 'Follow Up Scheduled',
  SurgeryFixed = 'Surgery Fixed',
  SurgeryLost = 'Surgery Lost',
}

export interface DoctorAssessment {
  quickCode: SurgeonCode;
  surgeryProcedure?: SurgeryProcedure;
  otherSurgeryName?: string;
  painSeverity: PainSeverity;
  affordability: Affordability;
  conversionReadiness: ConversionReadiness;
  tentativeSurgeryDate: string; // YYYY-MM-DD
  doctorSignature: string;
  assessedAt: string;
}

export interface PackageProposal {
  decisionPattern: string;
  objectionIdentified: string;
  counselingStrategy: string;
  followUpDate: string; // YYYY-MM-DD
  status: ProposalStatus;
  proposalCreatedAt: string;
  lastFollowUpAt?: string;
  outcomeDate?: string; // Date when surgery was fixed or lost (YYYY-MM-DD)
}

export interface Patient {
  id: string; // File Registration Number
  hospital_id: string; // Multi-tenancy identifier
  name: string;
  dob?: string; 
  entry_date: string; // Date of Presentation (DOP)
  gender: Gender;
  age: number;
  mobile: string;
  occupation: string;
  hasInsurance: 'Yes' | 'No' | 'Not Sure';
  insuranceName?: string; 
  source: string; 
  sourceDoctorName?: string;
  condition: Condition;
  created_at: string; 
  doctorAssessment?: DoctorAssessment;
  packageProposal?: PackageProposal;
  isFollowUpVisit?: boolean; 
  lastFollowUpVisitDate?: string; 
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  registeredAt: string;
  password?: string;
}
