import crypto from 'node:crypto';

// 32-byte secret key for AES-256-GCM encryption
// In production, loaded from process.env.DATA_ENCRYPTION_KEY
function getEncryptionKey(): Buffer {
  const envKey = process.env.DATA_ENCRYPTION_KEY;
  if (!envKey || !/^[0-9a-fA-F]{64}$/.test(envKey)) throw new Error('DATA_ENCRYPTION_KEY must be a 64-character hex key.');
  return Buffer.from(envKey, 'hex');
}

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string;         // Base64 encoded (12 bytes for GCM)
  authTag: string;    // Base64 encoded (16 bytes)
  algorithm: string;  // 'aes-256-gcm'
}

/**
 * Encrypts plaintext string using AES-256-GCM with a random 96-bit initialization vector.
 * Produces ciphertext, IV, and authentication tag for integrity verification.
 */
export function encryptAES256GCM(plainText: string): EncryptedData {
  const key = getEncryptionKey();
  // 12 bytes IV is standard recommended for AES-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plainText, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag().toString('base64');

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag,
    algorithm: 'aes-256-gcm'
  };
}

/**
 * Decrypts AES-256-GCM ciphertext using the provided IV and authentication tag.
 * Throws an error if ciphertext or tag was tampered with.
 */
export function decryptAES256GCM(encrypted: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Calculates cryptographic SHA-256 hash of a string.
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Canonical serializer to guarantee deterministic audit block hashing.
 */
export function canonicalizeObject(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeObject).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `${JSON.stringify(k)}:${canonicalizeObject(obj[k])}`).join(',') + '}';
}

/**
 * Computes canonical hash for an audit log entry.
 */
export function computeAuditEntryHash(entry: {
  sequenceNumber: number;
  timestamp: string;
  eventType: string;
  actorId: string;
  patientId?: string;
  details: any;
  previousHash: string;
}): string {
  const payload = [
    entry.sequenceNumber,
    entry.timestamp,
    entry.eventType,
    entry.actorId,
    entry.patientId || '',
    canonicalizeObject(entry.details || {}),
    entry.previousHash
  ].join('|');

  return sha256(payload);
}
