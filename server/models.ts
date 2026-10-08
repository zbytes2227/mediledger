import mongoose, { Schema, Document } from 'mongoose';
import { EncryptedData } from './crypto.js';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED';

export interface IUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  accountStatus: AccountStatus;
  patientId?: string; // e.g., 'PAT-1082'
  dateOfBirth?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  doctorSpecialty?: string;
  doctorLicenseNumber?: string;
  hospitalAffiliation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RecordCategory = 'PRESCRIPTION' | 'LAB_REPORT' | 'VISIT_HISTORY' | 'DIAGNOSTIC_SCAN' | 'DISCHARGE_SUMMARY' | 'OTHER';

export interface IMedicalRecord {
  _id?: string;
  id?: string;
  patientId: string; // Patient's user id or PAT-xxxx
  patientName: string;
  title: string;
  category: RecordCategory;
  doctorOrClinic: string;
  recordDate: string;
  summary: string;
  encryptedData: EncryptedData; // Contains sensitive notes, diagnosis, medications, attachments
  attachmentName?: string;
  attachmentSize?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type GrantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export interface IAccessGrant {
  _id?: string;
  id?: string;
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
  updatedAt?: string;
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
  _id?: string;
  id?: string;
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

// Mongoose Schemas (for production MongoDB Atlas integration)
export const UserSchema = new Schema<IUser>({
  id: { type: String, index: true },           // Custom application-level string ID
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN'], required: true },
  accountStatus: { type: String, enum: ['ACTIVE', 'DEACTIVATED', 'SUSPENDED'], default: 'ACTIVE' },
  patientId: { type: String, index: true },
  dateOfBirth: String,
  bloodGroup: String,
  emergencyContact: String,
  doctorSpecialty: String,
  doctorLicenseNumber: String,
  hospitalAffiliation: String,
}, { timestamps: true });

export const MedicalRecordSchema = new Schema<IMedicalRecord>({
  id: { type: String, index: true },           // Custom application-level string ID
  patientId: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  title: { type: String, required: true },
  category: {
    type: String,
    enum: ['PRESCRIPTION', 'LAB_REPORT', 'VISIT_HISTORY', 'DIAGNOSTIC_SCAN', 'DISCHARGE_SUMMARY', 'OTHER'],
    required: true,
    index: true
  },
  doctorOrClinic: { type: String, required: true },
  recordDate: { type: String, required: true },
  summary: { type: String, required: true },
  encryptedData: {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    algorithm: { type: String, default: 'aes-256-gcm' }
  },
  attachmentName: String,
  attachmentSize: String,
}, { timestamps: true });

export const AccessGrantSchema = new Schema<IAccessGrant>({
  id: { type: String, index: true },           // Custom application-level string ID
  patientId: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  patientEmail: { type: String, required: true },
  doctorId: { type: String, required: true, index: true },
  doctorName: { type: String, required: true },
  doctorEmail: { type: String, required: true },
  doctorSpecialty: String,
  purpose: { type: String, required: true },
  requestedDurationHours: { type: Number, required: true, default: 24 },
  categoryScope: [{ type: String }],
  specificRecordIds: [{ type: String }],
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED'],
    default: 'PENDING',
    index: true
  },
  expiresAt: { type: String, index: true },
  approvedAt: String,
  rejectedAt: String,
  revokedAt: String,
  revokedReason: String,
}, { timestamps: true });

export const AuditLogSchema = new Schema<IAuditLog>({
  sequenceNumber: { type: Number, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  timestamp: { type: String, required: true, index: true },
  actor: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true }
  },
  target: {
    patientId: { type: String, index: true },
    patientName: String,
    recordId: String,
    grantId: String,
    description: String
  },
  details: { type: Schema.Types.Mixed, default: {} },
  previousHash: { type: String, required: true },
  entryHash: { type: String, required: true, unique: true }
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const MedicalRecordModel = mongoose.models.MedicalRecord || mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
export const AccessGrantModel = mongoose.models.AccessGrant || mongoose.model<IAccessGrant>('AccessGrant', AccessGrantSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
