import mongoose from 'mongoose';
import { IUser, IMedicalRecord, IAccessGrant, IAuditLog, UserModel, MedicalRecordModel, AccessGrantModel, AuditLogModel } from './models.js';
import { computeAuditEntryHash } from './crypto.js';

const GENESIS_HASH = '0'.repeat(64);

class MediLedgerStore {
  public users: IUser[] = [];
  public records: IMedicalRecord[] = [];
  public grants: IAccessGrant[] = [];
  public auditLogs: IAuditLog[] = [];
  public isConnectedToMongo = false;
  public auditLogBackup: IAuditLog[] = [];

  /**
   * Normalizes a document loaded from MongoDB .lean() to ensure the `id`
   * field is always a consistent string. Mongoose lean() gives _id as ObjectId
   * or string; our app uses a custom string `id` field stored in the schema.
   */
  private normalizeDoc<T extends { id?: any; _id?: any }>(doc: T): T {
    const idStr = doc.id ? String(doc.id) : (doc._id ? String(doc._id) : '');
    return { ...doc, id: idStr, _id: String(doc._id || idStr) };
  }

  /**
   * Attempts to connect to MongoDB. If connection fails for any reason
   * (DNS failure, bad credentials, network issues), the server falls back
   * to fully functional in-memory mode and logs a clear warning.
   */
  async connectMongo() {
    const uri = process.env.MONGODB_URI;

    if (!uri || !uri.startsWith('mongodb')) {
      console.warn('[Database] MONGODB_URI not set or invalid. Running in in-memory mode (data will not persist across restarts).');
      return;
    }

    try {
      console.log('[Database] Attempting to connect to MongoDB Atlas...');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      this.isConnectedToMongo = true;

      // Load existing data from MongoDB into memory, normalizing id fields
      const rawUsers = await UserModel.find().lean() as unknown as IUser[];
      this.users = rawUsers.map(u => this.normalizeDoc(u));

      const rawRecords = await MedicalRecordModel.find().lean() as unknown as IMedicalRecord[];
      this.records = rawRecords.map(r => this.normalizeDoc(r));

      const rawGrants = await AccessGrantModel.find().lean() as unknown as IAccessGrant[];
      this.grants = rawGrants.map(g => this.normalizeDoc(g));

      const rawLogs = await AuditLogModel.find().sort({ sequenceNumber: 1 }).lean() as unknown as IAuditLog[];
      this.auditLogs = rawLogs.map(l => this.normalizeDoc(l));

      console.log(`[Database] Connected to MongoDB. Loaded: ${this.users.length} users, ${this.records.length} records, ${this.grants.length} grants, ${this.auditLogs.length} audit entries.`);
    } catch (err: any) {
      this.isConnectedToMongo = false;
      console.warn('─────────────────────────────────────────────────────────');
      console.warn('[Database] MongoDB connection failed — running in IN-MEMORY MODE.');
      console.warn(`[Database] Reason: ${err.message}`);
      console.warn('[Database] All data will be stored in memory only.');
      console.warn('[Database] To use MongoDB, fix MONGODB_URI in .env and restart.');
      console.warn('─────────────────────────────────────────────────────────');
    }
  }


  // ----------------------------------------------------------------
  // Save methods: write to MongoDB if connected, always keep in memory
  // ----------------------------------------------------------------

  async saveUser(user: IUser) {
    // Always update in-memory first
    const idx = this.users.findIndex(u => u.id === user.id || u._id === user._id || u.email === user.email);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users.push(user);
    }

    if (!this.isConnectedToMongo) return;
    try {
      const { _id, ...mongoUser } = user;
      await UserModel.findOneAndUpdate({ email: user.email }, mongoUser, { upsert: true, new: true, setDefaultsOnInsert: true });
      const rawUsers = await UserModel.find().lean() as unknown as IUser[];
      this.users = rawUsers.map(u => this.normalizeDoc(u));
    } catch (err) {
      console.error('[Database] Failed to persist user to MongoDB:', err);
    }
  }

  async saveRecord(record: IMedicalRecord) {
    const idx = this.records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      this.records[idx] = record;
    } else {
      this.records.push(record);
    }

    if (!this.isConnectedToMongo) return;
    try {
      const { _id, ...mongoRecord } = record;
      await MedicalRecordModel.findOneAndUpdate({ id: record.id }, mongoRecord, { upsert: true, new: true, setDefaultsOnInsert: true });
      const rawRecords = await MedicalRecordModel.find().lean() as unknown as IMedicalRecord[];
      this.records = rawRecords.map(r => this.normalizeDoc(r));
    } catch (err) {
      console.error('[Database] Failed to persist record to MongoDB:', err);
    }
  }

  async deleteRecord(id: string) {
    this.records = this.records.filter(r => r.id !== id && r._id !== id);
    if (!this.isConnectedToMongo) return;
    try {
      await MedicalRecordModel.deleteOne({ $or: [{ id }, { _id: id }] });
    } catch (err) {
      console.error('[Database] Failed to delete record from MongoDB:', err);
    }
  }

  async saveGrant(grant: IAccessGrant) {
    const idx = this.grants.findIndex(g => g.id === grant.id);
    if (idx >= 0) {
      this.grants[idx] = grant;
    } else {
      this.grants.push(grant);
    }

    if (!this.isConnectedToMongo) return;
    try {
      const { _id, ...mongoGrant } = grant;
      await AccessGrantModel.findOneAndUpdate({ id: grant.id }, mongoGrant, { upsert: true, new: true, setDefaultsOnInsert: true });
      const rawGrants = await AccessGrantModel.find().lean() as unknown as IAccessGrant[];
      this.grants = rawGrants.map(g => this.normalizeDoc(g));
    } catch (err) {
      console.error('[Database] Failed to persist grant to MongoDB:', err);
    }
  }

  // ----------------------------------------------------------------
  // Audit log: always in-memory, async write to MongoDB when connected
  // ----------------------------------------------------------------

  appendAuditLogEntry(params: {
    eventType: IAuditLog['eventType'];
    actor: IAuditLog['actor'];
    target?: IAuditLog['target'];
    details: Record<string, any>;
    customTimestamp?: string;
  }): IAuditLog {
    const last = this.auditLogs[this.auditLogs.length - 1];
    const sequenceNumber = last ? last.sequenceNumber + 1 : 0;
    const previousHash = last?.entryHash || GENESIS_HASH;
    const timestamp = params.customTimestamp || new Date().toISOString();
    const entryHash = computeAuditEntryHash({
      sequenceNumber,
      timestamp,
      eventType: params.eventType,
      actorId: params.actor.id,
      patientId: params.target?.patientId,
      details: params.details,
      previousHash
    });

    const entry: IAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sequenceNumber,
      eventType: params.eventType,
      timestamp,
      actor: params.actor,
      target: params.target,
      details: params.details,
      previousHash,
      entryHash
    };

    this.auditLogs.push(entry);

    if (this.isConnectedToMongo) {
      void AuditLogModel.create(entry).catch(err => console.error('[Database] Audit write failed:', err));
    }

    return entry;
  }

  // ----------------------------------------------------------------
  // Audit chain verification & tamper simulation (academic demo)
  // ----------------------------------------------------------------

  verifyAuditChainIntegrity() {
    for (let i = 0; i < this.auditLogs.length; i++) {
      const e = this.auditLogs[i];
      const previous = i ? this.auditLogs[i - 1].entryHash : GENESIS_HASH;
      const hash = computeAuditEntryHash({
        sequenceNumber: e.sequenceNumber,
        timestamp: e.timestamp,
        eventType: e.eventType,
        actorId: e.actor.id,
        patientId: e.target?.patientId,
        details: e.details,
        previousHash: e.previousHash
      });
      if (e.sequenceNumber !== i || e.previousHash !== previous || e.entryHash !== hash) {
        return { isValid: false, totalBlocks: this.auditLogs.length, tamperedIndex: i, tamperedBlock: e, errorReason: 'Audit chain integrity check failed.' };
      }
    }
    return { isValid: true, totalBlocks: this.auditLogs.length, tamperedIndex: null, tamperedBlock: null, errorReason: null };
  }

  simulateTamperAttack(targetBlockIndex?: number) {
    if (!this.auditLogs.length) throw new Error('No audit entries exist.');
    this.auditLogBackup = JSON.parse(JSON.stringify(this.auditLogs));
    const index = (targetBlockIndex !== undefined && targetBlockIndex < this.auditLogs.length) ? targetBlockIndex : 0;
    const block = this.auditLogs[index];
    block.details.TAMPERED_INTRUSION = 'MALICIOUS_DATA_ALTERATION_ATTEMPT';
    return { tamperedIndex: index, originalEvent: block.eventType, modifiedDetail: 'Audit metadata was modified without re-signing.' };
  }

  restoreAuditLogIntegrity() {
    if (!this.auditLogBackup.length) return false;
    this.auditLogs = JSON.parse(JSON.stringify(this.auditLogBackup));
    return true;
  }
}

export const dbStore = new MediLedgerStore();
