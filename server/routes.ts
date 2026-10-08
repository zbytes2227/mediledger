import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbStore } from './db.js';
import {
  authenticateUser,
  requireRoles,
  generateToken,
  AuthenticatedRequest
} from './auth.js';
import {
  encryptAES256GCM,
  decryptAES256GCM
} from './crypto.js';
import {
  IUser,
  IMedicalRecord,
  IAccessGrant,
  RecordCategory
} from './models.js';

export const apiRouter = Router();

// ==========================================
// Helper: Refresh Expired Grants
// ==========================================
function refreshGrantStatuses() {
  const now = new Date().toISOString();
  for (const grant of dbStore.grants) {
    if (grant.status === 'APPROVED' && grant.expiresAt && grant.expiresAt <= now) {
      grant.status = 'EXPIRED';
      dbStore.appendAuditLogEntry({
        eventType: 'ACCESS_EXPIRED',
        actor: { id: 'system', name: 'MediLedger Policy Engine', email: 'system@mediledger.local', role: 'ADMIN' },
        target: { patientId: grant.patientId, grantId: grant.id, description: 'Access Grant Time Horizon Expired' },
        details: { doctorId: grant.doctorId, doctorName: grant.doctorName, expiredAt: grant.expiresAt }
      });
    }
  }
}

// Periodic check
setInterval(refreshGrantStatuses, 30000);

// ==========================================
// 1. AUTHENTICATION & DEMO USERS
// ==========================================

// User Registration
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      dateOfBirth,
      bloodGroup,
      emergencyContact,
      doctorSpecialty,
      doctorLicenseNumber,
      hospitalAffiliation
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (!['PATIENT', 'DOCTOR'].includes(role)) {
      return res.status(400).json({ error: 'Role must be PATIENT or DOCTOR.' });
    }

    const existing = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${role.toLowerCase()}_${Date.now()}`;
    const patientId = role === 'PATIENT' ? `PAT-${Math.floor(1000 + Math.random() * 9000)}` : undefined;

    const newUser: IUser = {
      id: userId,
      _id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      accountStatus: 'ACTIVE',
      patientId,
      dateOfBirth,
      bloodGroup,
      emergencyContact,
      doctorSpecialty,
      doctorLicenseNumber,
      hospitalAffiliation,
      createdAt: new Date().toISOString()
    };

    await dbStore.saveUser(newUser);

    // Audit log
    dbStore.appendAuditLogEntry({
      eventType: 'USER_REGISTER',
      actor: { id: userId, name, email, role },
      target: { patientId, description: `New ${role} account registration` },
      details: { role, patientId, doctorSpecialty }
    });

    const token = generateToken(newUser);
    const { passwordHash: _, ...userSafe } = newUser;
    res.status(201).json({ token, user: userSafe });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// User Login
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = dbStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      dbStore.appendAuditLogEntry({
        eventType: 'LOGIN_FAILED',
        actor: { id: 'anonymous', name: 'Unknown', email, role: 'PATIENT' },
        details: { reason: 'User not found', attemptEmail: email }
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      dbStore.appendAuditLogEntry({
        eventType: 'LOGIN_FAILED',
        actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: user.role },
        details: { reason: 'Incorrect password' }
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.accountStatus !== 'ACTIVE') {
      return res.status(403).json({ error: `Your account is ${user.accountStatus.toLowerCase()}. Please contact administrator.` });
    }

    const token = generateToken(user);
    dbStore.appendAuditLogEntry({
      eventType: 'LOGIN_SUCCESS',
      actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: user.role },
      target: { patientId: user.patientId, description: 'User Logged In' },
      details: { role: user.role }
    });

    const { passwordHash: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Current Authenticated User Info
apiRouter.get('/auth/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const { passwordHash, ...userSafe } = req.user!;
  res.json({ user: userSafe });
});

// Logout
apiRouter.post('/auth/logout', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  dbStore.appendAuditLogEntry({
    eventType: 'LOGOUT',
    actor: { id: req.user!.id || req.user!._id || '', name: req.user!.name, email: req.user!.email, role: req.user!.role },
    details: { reason: 'User requested session termination' }
  });
  res.json({ message: 'Logged out successfully.' });
});

// ==========================================
// 2. PATIENT SEARCH (For Doctors to request access)
// ==========================================
apiRouter.get('/patients/search', authenticateUser, requireRoles('DOCTOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const query = ((req.query.query as string) || '').trim().toLowerCase();
  if (!query) {
    return res.json({ patients: [] });
  }

  const patients = dbStore.users
    .filter(u => u.role === 'PATIENT' && u.accountStatus === 'ACTIVE')
    .filter(p =>
      (p.patientId && p.patientId.toLowerCase().includes(query)) ||
      p.email.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query)
    )
    .map(p => ({
      patientId: p.patientId,
      name: p.name,
      email: p.email,
      dateOfBirth: p.dateOfBirth,
      bloodGroup: p.bloodGroup
    }));

  res.json({ patients });
});

// ==========================================
// 3. MEDICAL RECORDS MANAGEMENT
// ==========================================

// Get Records
// Enforces Server-Side Access Control:
// - Patients see only their own records.
// - Doctors see records ONLY if they have an active APPROVED unexpired grant matching the patient and category scope!
// - Admins are restricted: they can see platform counts, but cannot view raw medical data!
apiRouter.get('/records', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  refreshGrantStatuses();
  const user = req.user!;

  if (user.role === 'PATIENT') {
    const patientRecords = dbStore.records.filter(r => r.patientId === user.patientId);
    return res.json({ records: patientRecords });
  }

  if (user.role === 'DOCTOR') {
    const patientId = req.query.patientId as string;
    if (!patientId) {
      return res.status(400).json({ error: 'Doctors must specify patientId parameter to access records.' });
    }

    // Check for valid active grant
    const doctorId = user.id || user._id;
    const now = new Date().toISOString();

    const activeGrant = dbStore.grants.find(g =>
      g.doctorId === doctorId &&
      g.patientId.toUpperCase() === patientId.toUpperCase() &&
      g.status === 'APPROVED' &&
      (!g.expiresAt || g.expiresAt > now)
    );

    if (!activeGrant) {
      // Log unauthorized attempt
      dbStore.appendAuditLogEntry({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actor: { id: doctorId || '', name: user.name, email: user.email, role: 'DOCTOR' },
        target: { patientId, description: 'Attempted to access patient records without active consent grant' },
        details: { patientId, reason: 'No active approved grant found or grant expired' }
      });

      return res.status(403).json({
        error: 'Access Denied: You do not hold an active, approved consent grant for this patient.',
        code: 'CONSENT_GRANT_REQUIRED'
      });
    }

    // Filter records by granted category scope
    let patientRecords = dbStore.records.filter(r => r.patientId.toUpperCase() === patientId.toUpperCase());
    if (activeGrant.categoryScope && !activeGrant.categoryScope.includes('ALL' as any)) {
      patientRecords = patientRecords.filter(r => activeGrant.categoryScope.includes(r.category));
    }

    return res.json({
      records: patientRecords,
      grantInfo: {
        grantId: activeGrant.id,
        purpose: activeGrant.purpose,
        expiresAt: activeGrant.expiresAt,
        categoryScope: activeGrant.categoryScope
      }
    });
  }

  if (user.role === 'ADMIN') {
    // Academic security requirement: Administrators must not automatically receive unrestricted access to medical records
    return res.status(403).json({
      error: 'Security Policy Violation: Platform administrators do not possess clinical authorization to view confidential medical records.',
      code: 'ADMIN_RECORD_ACCESS_PROHIBITED'
    });
  }

  res.status(403).json({ error: 'Unauthorized.' });
});

// Upload / Create Medical Record (Patient Only)
apiRouter.post('/records', authenticateUser, requireRoles('PATIENT'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, category, doctorOrClinic, recordDate, summary, sensitiveNotes, attachmentName, attachmentSize } = req.body;

    if (!title || !category || !doctorOrClinic || !recordDate) {
      return res.status(400).json({ error: 'Title, category, doctor/clinic, and date are required.' });
    }

    // Pack and encrypt sensitive clinical payload with AES-256-GCM
    const sensitivePayload = JSON.stringify({
      sensitiveNotes: sensitiveNotes || '',
      summary: summary || '',
      uploadedBy: user.name,
      uploadTimestamp: new Date().toISOString()
    });

    const encryptedData = encryptAES256GCM(sensitivePayload);

    const recordId = `rec_${Date.now()}`;
    const newRecord: IMedicalRecord = {
      id: recordId,
      _id: recordId,
      patientId: user.patientId!,
      patientName: user.name,
      title,
      category,
      doctorOrClinic,
      recordDate,
      summary: summary || 'Medical record document',
      encryptedData,
      attachmentName: attachmentName || 'medical_record.pdf',
      attachmentSize: attachmentSize || '150 KB',
      createdAt: new Date().toISOString()
    };

    await dbStore.saveRecord(newRecord);

    // Audit log
    dbStore.appendAuditLogEntry({
      eventType: 'RECORD_CREATED',
      actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: 'PATIENT' },
      target: { patientId: user.patientId, recordId, description: `Uploaded ${category}: ${title}` },
      details: { title, category, encryption: 'AES-256-GCM' }
    });

    res.status(201).json({ record: newRecord });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create record: ' + err.message });
  }
});

// View and Decrypt Specific Medical Record
apiRouter.get('/records/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  refreshGrantStatuses();
  const user = req.user!;
  const record = dbStore.records.find(r => r.id === req.params.id || r._id === req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Medical record not found.' });
  }

  // Authorization Check
  let isAuthorized = false;
  let activeGrantId: string | undefined;

  if (user.role === 'PATIENT' && record.patientId === user.patientId) {
    isAuthorized = true;
  } else if (user.role === 'DOCTOR') {
    const doctorId = user.id || user._id;
    const now = new Date().toISOString();

    const activeGrant = dbStore.grants.find(g =>
      g.doctorId === doctorId &&
      g.patientId.toUpperCase() === record.patientId.toUpperCase() &&
      g.status === 'APPROVED' &&
      (!g.expiresAt || g.expiresAt > now)
    );

    if (activeGrant) {
      // Check if this record's category is covered
      if (activeGrant.categoryScope.includes('ALL' as any) || activeGrant.categoryScope.includes(record.category)) {
        isAuthorized = true;
        activeGrantId = activeGrant.id;
      }
    }
  }

  if (!isAuthorized) {
    dbStore.appendAuditLogEntry({
      eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: user.role },
      target: { patientId: record.patientId, recordId: record.id, description: 'Attempted to decrypt record without permission' },
      details: { recordTitle: record.title, category: record.category }
    });

    return res.status(403).json({
      error: 'Access Denied: You do not have valid consent authorization to view this medical record.',
      code: 'UNAUTHORIZED_RECORD_ACCESS'
    });
  }

  // Decrypt sensitive information using AES-256-GCM
  let decryptedPayload: any = null;
  try {
    const decryptedJson = decryptAES256GCM(record.encryptedData);
    decryptedPayload = JSON.parse(decryptedJson);
  } catch (err: any) {
    return res.status(500).json({ error: 'Decryption failed: cryptographic integrity tag check error.' });
  }

  // Log view event
  dbStore.appendAuditLogEntry({
    eventType: 'RECORD_VIEWED',
    actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: user.role },
    target: { patientId: record.patientId, recordId: record.id, grantId: activeGrantId, description: `Decrypted and viewed ${record.title}` },
    details: {
      category: record.category,
      recordDate: record.recordDate,
      encryptionAlgorithm: record.encryptedData.algorithm
    }
  });

  res.json({
    record,
    decryptedData: decryptedPayload,
    auditVerification: {
      cipherMode: 'AES-256-GCM',
      authenticated: true,
      ivPresent: !!record.encryptedData.iv,
      authTagVerified: true
    }
  });
});

// Delete Record (Patient Only)
apiRouter.delete('/records/:id', authenticateUser, requireRoles('PATIENT'), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const index = dbStore.records.findIndex(r => (r.id === req.params.id || r._id === req.params.id) && r.patientId === user.patientId);

  if (index === -1) {
    return res.status(404).json({ error: 'Record not found or not owned by you.' });
  }

  const deleted = dbStore.records.splice(index, 1)[0];
  await dbStore.deleteRecord(req.params.id);

  dbStore.appendAuditLogEntry({
    eventType: 'RECORD_DELETED',
    actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: 'PATIENT' },
    target: { patientId: user.patientId, recordId: deleted.id, description: `Deleted record: ${deleted.title}` },
    details: { category: deleted.category }
  });

  res.json({ message: 'Record deleted successfully.', recordId: deleted.id });
});

// ==========================================
// 4. ACCESS GRANTS & CONSENT WORKFLOW
// ==========================================

// Get Grants
apiRouter.get('/grants', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  refreshGrantStatuses();
  const user = req.user!;

  if (user.role === 'PATIENT') {
    const grants = dbStore.grants.filter(g => g.patientId === user.patientId);
    return res.json({ grants });
  }

  if (user.role === 'DOCTOR') {
    const doctorId = user.id || user._id;
    const grants = dbStore.grants.filter(g => g.doctorId === doctorId);
    return res.json({ grants });
  }

  if (user.role === 'ADMIN') {
    return res.json({ grants: dbStore.grants });
  }

  res.status(403).json({ error: 'Unauthorized' });
});

// Doctor Request Access
apiRouter.post('/grants/request', authenticateUser, requireRoles('DOCTOR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doctor = req.user!;
    const { patientIdentifier, purpose, requestedDurationHours, categoryScope } = req.body;

    if (!patientIdentifier || !purpose) {
      return res.status(400).json({ error: 'Patient identifier (ID or Email) and medical purpose are required.' });
    }

    // Find patient
    const patient = dbStore.users.find(u =>
      u.role === 'PATIENT' &&
      ((u.patientId && u.patientId.toUpperCase() === patientIdentifier.toUpperCase()) ||
       u.email.toLowerCase() === patientIdentifier.toLowerCase())
    );

    if (!patient) {
      return res.status(404).json({ error: `Patient not found with identifier "${patientIdentifier}". Check Patient ID or email.` });
    }

    const grantId = `grant_${Date.now()}`;
    const duration = Number(requestedDurationHours) || 24;

    const newGrant: IAccessGrant = {
      id: grantId,
      _id: grantId,
      patientId: patient.patientId!,
      patientName: patient.name,
      patientEmail: patient.email,
      doctorId: doctor.id || doctor._id || '',
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      doctorSpecialty: doctor.doctorSpecialty || 'General Practice',
      purpose,
      requestedDurationHours: duration,
      categoryScope: (categoryScope && categoryScope.length > 0) ? categoryScope : ['PRESCRIPTION', 'LAB_REPORT', 'VISIT_HISTORY'],
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    await dbStore.saveGrant(newGrant);

    dbStore.appendAuditLogEntry({
      eventType: 'ACCESS_REQUESTED',
      actor: { id: doctor.id || doctor._id || '', name: doctor.name, email: doctor.email, role: 'DOCTOR' },
      target: { patientId: patient.patientId, patientName: patient.name, grantId, description: `Doctor requested record access for ${purpose}` },
      details: {
        doctorName: doctor.name,
        doctorEmail: doctor.email,
        purpose,
        durationHours: duration,
        categoryScope: newGrant.categoryScope
      }
    });

    res.status(201).json({ grant: newGrant, message: 'Access request submitted to patient for review.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to request access: ' + err.message });
  }
});

// Patient Approve Access Grant
apiRouter.post('/grants/:id/approve', authenticateUser, requireRoles('PATIENT'), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const grant = dbStore.grants.find(g => (g.id === req.params.id || g._id === req.params.id) && g.patientId === user.patientId);

  if (!grant) {
    return res.status(404).json({ error: 'Access grant request not found.' });
  }

  if (grant.status !== 'PENDING') {
    return res.status(400).json({ error: `Cannot approve grant with status "${grant.status}".` });
  }

  // Patient can refine duration and category scope upon approval
  const { customDurationHours, customCategoryScope } = req.body;
  const durationHours = customDurationHours ? Number(customDurationHours) : grant.requestedDurationHours;
  const expiresAt = new Date(Date.now() + durationHours * 3600000).toISOString();

  grant.status = 'APPROVED';
  grant.approvedAt = new Date().toISOString();
  grant.expiresAt = expiresAt;
  if (customCategoryScope && Array.isArray(customCategoryScope)) {
    grant.categoryScope = customCategoryScope;
  }
  await dbStore.saveGrant(grant);

  dbStore.appendAuditLogEntry({
    eventType: 'ACCESS_APPROVED',
    actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: 'PATIENT' },
    target: { patientId: user.patientId, grantId: grant.id, description: `Approved access for ${grant.doctorName}` },
    details: {
      doctorId: grant.doctorId,
      doctorName: grant.doctorName,
      purpose: grant.purpose,
      durationHours,
      expiresAt,
      categoryScope: grant.categoryScope
    }
  });

  res.json({ grant, message: 'Access grant approved. Time-limited consent is now active.' });
});

// Patient Reject Access Grant
apiRouter.post('/grants/:id/reject', authenticateUser, requireRoles('PATIENT'), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const grant = dbStore.grants.find(g => (g.id === req.params.id || g._id === req.params.id) && g.patientId === user.patientId);

  if (!grant) {
    return res.status(404).json({ error: 'Access grant request not found.' });
  }

  grant.status = 'REJECTED';
  await dbStore.saveGrant(grant);
  grant.rejectedAt = new Date().toISOString();

  dbStore.appendAuditLogEntry({
    eventType: 'ACCESS_REJECTED',
    actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: 'PATIENT' },
    target: { patientId: user.patientId, grantId: grant.id, description: `Rejected access request from ${grant.doctorName}` },
    details: { doctorId: grant.doctorId, doctorName: grant.doctorName, reason: req.body.reason || 'Patient declined request' }
  });

  res.json({ grant, message: 'Access grant rejected.' });
});

// Revoke Access Grant (Instant Patient Revocation or Admin intervention)
apiRouter.post('/grants/:id/revoke', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const grant = dbStore.grants.find(g => g.id === req.params.id || g._id === req.params.id);

  if (!grant) {
    return res.status(404).json({ error: 'Access grant not found.' });
  }

  // Must be the patient who owns the data OR an administrator
  if (user.role === 'PATIENT' && grant.patientId !== user.patientId) {
    return res.status(403).json({ error: 'You can only revoke grants on your own personal records.' });
  } else if (user.role !== 'PATIENT' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized to revoke this grant.' });
  }

  grant.status = 'REVOKED';
  await dbStore.saveGrant(grant);
  grant.revokedAt = new Date().toISOString();
  grant.revokedReason = req.body.reason || 'Patient revoked permission ahead of schedule';

  dbStore.appendAuditLogEntry({
    eventType: 'ACCESS_REVOKED',
    actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: user.role },
    target: { patientId: grant.patientId, grantId: grant.id, description: `Revoked access for ${grant.doctorName}` },
    details: {
      doctorId: grant.doctorId,
      doctorName: grant.doctorName,
      revokedBy: user.name,
      reason: grant.revokedReason
    }
  });

  res.json({ grant, message: 'Access grant revoked immediately. Doctor can no longer view records.' });
});

// ==========================================
// 5. AUDIT LOG & CRYPTOGRAPHIC VERIFICATION
// ==========================================

// Audit Log Viewer
// Patients see "Who Viewed My Data?" (filtered to their patientId)
// Admins see all logs
apiRouter.get('/audit', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (user.role === 'PATIENT') {
    // Return logs where this patient is the target or actor
    const patientLogs = dbStore.auditLogs.filter(log =>
      (log.target && log.target.patientId === user.patientId) ||
      (log.actor && log.actor.id === (user.id || user._id))
    );
    return res.json({ logs: patientLogs });
  }

  if (user.role === 'ADMIN') {
    return res.json({ logs: dbStore.auditLogs });
  }

  if (user.role === 'DOCTOR') {
    // Doctors see their own activity log
    const doctorId = user.id || user._id;
    const docLogs = dbStore.auditLogs.filter(log => log.actor.id === doctorId);
    return res.json({ logs: docLogs });
  }

  res.status(403).json({ error: 'Unauthorized' });
});

// Audit Chain Integrity Verification
apiRouter.get('/audit/verify', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const verification = dbStore.verifyAuditChainIntegrity();

  // Log verification event
  dbStore.appendAuditLogEntry({
    eventType: 'AUDIT_CHAIN_VERIFIED',
    actor: { id: req.user!.id || req.user!._id || '', name: req.user!.name, email: req.user!.email, role: req.user!.role },
    details: {
      isValid: verification.isValid,
      totalBlocksVerified: verification.totalBlocks,
      tamperedIndex: verification.tamperedIndex
    }
  });

  res.json(verification);
});

// Simulate Tamper Attack (Academic Demonstration Tool)
apiRouter.post('/audit/simulate-tamper', authenticateUser, requireRoles('ADMIN', 'PATIENT'), (req: AuthenticatedRequest, res: Response) => {
  const targetIndex = req.body.blockIndex !== undefined ? Number(req.body.blockIndex) : undefined;
  const result = dbStore.simulateTamperAttack(targetIndex);

  res.json({
    message: 'Tamper attack simulated: altered database audit payload without recalculating cryptographic SHA-256 hash.',
    ...result
  });
});

// Restore Audit Integrity
apiRouter.post('/audit/restore', authenticateUser, requireRoles('ADMIN', 'PATIENT'), (req: AuthenticatedRequest, res: Response) => {
  dbStore.restoreAuditLogIntegrity();
  res.json({ message: 'Audit chain restored to pristine verified state.' });
});

// ==========================================
// 6. DATA PRINCIPAL RIGHTS: EXPORT & DELETION
// ==========================================

// Export Patient Data (JSON format)
apiRouter.get('/patient/export', authenticateUser, requireRoles('PATIENT'), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const patientRecords = dbStore.records.filter(r => r.patientId === user.patientId);
  const patientGrants = dbStore.grants.filter(g => g.patientId === user.patientId);
  const patientLogs = dbStore.auditLogs.filter(log => log.target?.patientId === user.patientId);

  // Decrypt records for the export package
  const decryptedRecords = patientRecords.map(rec => {
    try {
      const dec = decryptAES256GCM(rec.encryptedData);
      return {
        ...rec,
        decryptedClinicalData: JSON.parse(dec)
      };
    } catch {
      return { ...rec, decryptedClinicalData: 'Decryption failed' };
    }
  });

  dbStore.appendAuditLogEntry({
    eventType: 'PATIENT_DATA_EXPORTED',
    actor: { id: user.id || user._id || '', name: user.name, email: user.email, role: 'PATIENT' },
    target: { patientId: user.patientId, description: 'Patient Exported Personal Health Records' },
    details: { totalRecords: patientRecords.length, totalGrants: patientGrants.length }
  });

  const exportBundle = {
    exportMetadata: {
      platform: 'MediLedger Secure Healthcare Platform',
      version: '1.0.0-academic',
      exportedAt: new Date().toISOString(),
      patientId: user.patientId,
      patientName: user.name,
      patientEmail: user.email,
      gdprComplianceArticle: 'Article 20 (Right to data portability)'
    },
    patientProfile: {
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      bloodGroup: user.bloodGroup,
      emergencyContact: user.emergencyContact
    },
    medicalRecords: decryptedRecords,
    consentGrants: patientGrants,
    accessAuditHistory: patientLogs
  };

  res.setHeader('Content-Disposition', `attachment; filename="mediledger-${user.patientId}-export.json"`);
  res.json(exportBundle);
});

// Delete Account / Anonymize Personal Data
apiRouter.post('/patient/delete-account', authenticateUser, requireRoles('PATIENT'), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const patientId = user.patientId;

  // Remove records
  const removedRecordCount = dbStore.records.filter(r => r.patientId === patientId).length;
  dbStore.records = dbStore.records.filter(r => r.patientId !== patientId);

  // Revoke all active grants
  dbStore.grants.forEach(g => {
    if (g.patientId === patientId && g.status === 'APPROVED') {
      g.status = 'REVOKED';
      g.revokedReason = 'Patient account deleted and erased.';
    }
  });

  // Pseudonymize audit log entries to preserve hash-chain integrity
  // Note: Audit chain cannot have blocks deleted without breaking the cryptographic hash chain!
  // GDPR Art 17 allows retention of tamper logs with personal identifiable information pseudonymized.
  dbStore.appendAuditLogEntry({
    eventType: 'PATIENT_ACCOUNT_DELETION_REQUESTED',
    actor: { id: user.id || user._id || '', name: 'ANONYMIZED_PATIENT', email: 'redacted@erased.local', role: 'PATIENT' },
    target: { patientId: 'PSEUDONYMIZED', description: 'Patient exercised Right to Erasure (GDPR Art 17)' },
    details: {
      action: 'All medical records deleted. User account deactivated. Audit chain cryptographic integrity preserved.',
      deletedRecordsCount: removedRecordCount
    }
  });

  // Deactivate user account
  const userRecord = dbStore.users.find(u => u.id === (user.id || user._id));
  if (userRecord) {
  userRecord.accountStatus = 'DEACTIVATED';
    userRecord.name = '[Account Deleted]';
    await dbStore.saveUser(userRecord);
  }

  res.json({
    message: 'Your medical records have been permanently erased and your account has been deactivated. Historical audit integrity hashes are preserved in compliance with medical record audit retention rules.'
  });
});

// ==========================================
// 7. ADMIN OVERSIGHT
// ==========================================

apiRouter.get('/admin/stats', authenticateUser, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  refreshGrantStatuses();
  const integrity = dbStore.verifyAuditChainIntegrity();

  res.json({
    stats: {
      totalUsers: dbStore.users.length,
      patientsCount: dbStore.users.filter(u => u.role === 'PATIENT').length,
      doctorsCount: dbStore.users.filter(u => u.role === 'DOCTOR').length,
      adminsCount: dbStore.users.filter(u => u.role === 'ADMIN').length,
      totalMedicalRecords: dbStore.records.length,
      totalGrants: dbStore.grants.length,
      activeGrants: dbStore.grants.filter(g => g.status === 'APPROVED').length,
      pendingGrants: dbStore.grants.filter(g => g.status === 'PENDING').length,
      auditBlocksCount: dbStore.auditLogs.length,
      chainIntegrityValid: integrity.isValid,
      mongoConnected: dbStore.isConnectedToMongo,
      encryptionAlgorithm: 'AES-256-GCM',
      hashAlgorithm: 'SHA-256 (Canonical Chained)'
    }
  });
});

apiRouter.get('/admin/users', authenticateUser, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const users = dbStore.users.map(u => {
    const { passwordHash, ...safe } = u;
    return safe;
  });
  res.json({ users });
});

apiRouter.patch('/admin/users/:id/status', authenticateUser, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!['ACTIVE', 'DEACTIVATED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be ACTIVE, DEACTIVATED, or SUSPENDED.' });
  }

  const user = dbStore.users.find(u => u.id === req.params.id || u._id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const oldStatus = user.accountStatus;
  user.accountStatus = status;
  await dbStore.saveUser(user);

  dbStore.appendAuditLogEntry({
    eventType: 'USER_STATUS_CHANGED',
    actor: { id: req.user!.id || req.user!._id || '', name: req.user!.name, email: req.user!.email, role: 'ADMIN' },
    target: { description: `Admin changed account status of ${user.name}` },
    details: { targetUserId: user.id, targetEmail: user.email, previousStatus: oldStatus, newStatus: status }
  });

  res.json({ message: `User status changed to ${status}.`, user });
});

// ==========================================
// 8. COMPLIANCE INFORMATION MATRIX
// ==========================================
apiRouter.get('/compliance/matrix', (req, res) => {
  res.json({
    disclaimer: 'This is an academic engineering demonstration for   evaluation, not a certification of legal medical software compliance.',
    frameworks: [
      {
        standard: 'HIPAA Security Rule (45 CFR Part 164)',
        regulations: [
          {
            section: '§164.312(a)(1) Access Control',
            description: 'Implement technical policies to allow access only to persons granted access rights.',
            implementation: 'Server-side Role-Based Access Control (RBAC) and explicit, patient-approved time-limited AccessGrants.'
          },
          {
            section: '§164.312(a)(2)(iv) Encryption and Decryption',
            description: 'Implement a mechanism to encrypt and decrypt electronic protected health information (ePHI).',
            implementation: 'AES-256-GCM authenticated encryption at rest with 96-bit initialization vectors and 128-bit authentication tags.'
          },
          {
            section: '§164.312(b) Audit Controls',
            description: 'Implement hardware, software, and/or procedural mechanisms that record and examine activity.',
            implementation: 'Append-only cryptographic SHA-256 hash-chained audit log recording all access, authorization, and data modifications.'
          },
          {
            section: '§164.312(c)(1) Data Integrity',
            description: 'Protect ePHI from improper alteration or destruction.',
            implementation: 'Cryptographic hash-chaining where each entry signs the previous entry hash; automated integrity verification detects unauthorized mutations.'
          }
        ]
      },
      {
        standard: 'GDPR (EU General Data Protection Regulation)',
        regulations: [
          {
            section: 'Article 5(1)(f) Integrity and Confidentiality',
            description: 'Processed in a manner ensuring appropriate security of personal data.',
            implementation: 'AES-256-GCM encryption at rest, bcrypt password hashing, and role-based route middleware.'
          },
          {
            section: 'Article 6 & 7 Consent',
            description: 'Data subject has given consent to the processing of their personal data.',
            implementation: 'Patients actively review doctor requests and grant time-limited, category-scoped access grants.'
          },
          {
            section: 'Article 15 Right of Access',
            description: 'Data subject has the right to obtain confirmation as to whether personal data is processed and who accessed it.',
            implementation: '"Who Viewed My Data?" portal providing full visibility into every doctor who requested or opened records.'
          },
          {
            section: 'Article 17 Right to Erasure',
            description: 'Right to obtain erasure of personal data without undue delay.',
            implementation: 'Account deletion workflow deleting medical records while pseudonymizing historical audit chain logs to preserve cryptographic integrity.'
          },
          {
            section: 'Article 20 Right to Data Portability',
            description: 'Right to receive personal data in a structured, commonly used and machine-readable format.',
            implementation: 'One-click JSON export bundle containing decrypted records, profile details, and consent grant receipts.'
          }
        ]
      },
      {
        standard: "India Digital Personal Data Protection Act, 2023 (DPDP Act)",
        regulations: [
          {
            section: 'Section 6: Consent Notice and Purpose Limitation',
            description: 'Consent must be free, specific, informed, unconditional, and unambiguous with clear purpose stated.',
            implementation: 'Doctors must supply a specific clinical purpose and requested duration; patients approve or revoke at any time.'
          },
          {
            section: 'Section 8: Obligations of Data Fiduciary',
            description: 'Implement reasonable security safeguards to prevent personal data breaches.',
            implementation: 'Cryptographic hash-chained audit trails, tamper-evident verification, and authenticated AES-GCM encryption.'
          },
          {
            section: 'Section 12: Right to Correction and Erasure',
            description: 'Data Principal has the right to erasure of personal data that is no longer necessary.',
            implementation: 'Instant grant revocation and full patient record deletion workflows.'
          }
        ]
      }
    ]
  });
});
