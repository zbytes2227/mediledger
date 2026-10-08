export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED';

export interface IUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  patientId?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  doctorSpecialty?: string;
  doctorLicenseNumber?: string;
  hospitalAffiliation?: string;
  createdAt?: string;
}

export type RecordCategory =
  | 'PRESCRIPTION'
  | 'LAB_REPORT'
  | 'VISIT_HISTORY'
  | 'DIAGNOSTIC_SCAN'
  | 'DISCHARGE_SUMMARY'
  | 'OTHER';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

export interface IMedicalRecord {
  id: string;
  _id?: string;
  patientId: string;
  patientName: string;
  title: string;
  category: RecordCategory;
  doctorOrClinic: string;
  recordDate: string;
  summary: string;
  encryptedData: EncryptedData;
  attachmentName?: string;
  attachmentSize?: string;
  createdAt?: string;
  decryptedClinicalData?: any;
}

export type GrantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export interface IAccessGrant {
  id: string;
  _id?: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  doctorSpecialty?: string;
  purpose: string;
  requestedDurationHours: number;
  categoryScope: (RecordCategory | 'ALL')[];
  specificRecordIds?: string[];
  status: GrantStatus;
  expiresAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  createdAt?: string;
}

export type AuditEventType =
  | 'USER_REGISTER'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'
  | 'RECORD_VIEWED'
  | 'RECORD_DECRYPTED'
  | 'ACCESS_REQUESTED'
  | 'ACCESS_APPROVED'
  | 'ACCESS_REJECTED'
  | 'ACCESS_REVOKED'
  | 'ACCESS_EXPIRED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'USER_STATUS_CHANGED'
  | 'USER_ROLE_UPDATED'
  | 'PATIENT_DATA_EXPORTED'
  | 'PATIENT_ACCOUNT_DELETION_REQUESTED'
  | 'AUDIT_CHAIN_VERIFIED'
  | 'INTEGRITY_TAMPER_SIMULATED'
  | 'INTEGRITY_RESTORED';

export interface IAuditLog {
  id: string;
  _id?: string;
  sequenceNumber: number;
  eventType: AuditEventType;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  target?: {
    patientId?: string;
    patientName?: string;
    recordId?: string;
    grantId?: string;
    description?: string;
  };
  details: Record<string, any>;
  previousHash: string;
  entryHash: string;
}

export interface IChainVerificationResult {
  isValid: boolean;
  totalBlocks: number;
  tamperedIndex: number | null;
  tamperedBlock: IAuditLog | null;
  errorReason: string | null;
}
