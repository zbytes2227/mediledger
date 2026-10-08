import React, { useState, useEffect } from 'react';
import { IMedicalRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  X,
  ShieldCheck,
  Key,
  FileText,
  Calendar,
  Building2,
  Lock,
  Unlock,
  Download,
  AlertCircle,
  FileCheck
} from 'lucide-react';

interface RecordViewerModalProps {
  recordId: string | null;
  onClose: () => void;
}

export const RecordViewerModal: React.FC<RecordViewerModalProps> = ({ recordId, onClose }) => {
  const { authFetch } = useAuth();
  const [record, setRecord] = useState<IMedicalRecord | null>(null);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [auditVerification, setAuditVerification] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clinical' | 'crypto'>('clinical');

  useEffect(() => {
    if (!recordId) return;

    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/records/${recordId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to decrypt medical record.');
        }
        setRecord(data.record);
        setDecryptedData(data.decryptedData);
        setAuditVerification(data.auditVerification);
      } catch (err: any) {
        setError(err.message || 'Access Denied: You do not have valid consent to view this record.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [recordId]);

  if (!recordId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="modal-record-viewer"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-semibold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {record?.title || 'Medical Record Viewer'}
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-medium text-slate-700">{record?.patientName}</span> ({record?.patientId})
              </p>
            </div>
          </div>
          <button
            id="btn-close-record-viewer"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-3"></div>
              <p className="text-sm text-slate-600 font-medium">Decrypting AES-256-GCM ciphertext from server...</p>
              <p className="text-xs text-slate-400 mt-1">Verifying cryptographic authentication tag and consent grant...</p>
            </div>
          )}

          {error && (
            <div className="py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">Access Authorization Denied</h4>
              <p className="text-sm text-rose-600 mb-4">{error}</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 max-w-md mx-auto text-left">
                <p className="font-semibold text-slate-800 mb-1">Enforced Security Safeguards:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Doctor must possess an active, approved Consent Grant.</li>
                  <li>Consent grant duration must not have expired.</li>
                  <li>Consent scope must specifically include the requested record category.</li>
                  <li>Attempt has been recorded in the tamper-evident audit log.</li>
                </ul>
              </div>
            </div>
          )}

          {record && !loading && !error && (
            <div className="space-y-5">
              {/* Metadata strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Category</span>
                  <span className="font-semibold text-slate-800">{record.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Clinic/Doctor</span>
                  <span className="font-semibold text-slate-800 truncate block">{record.doctorOrClinic}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Record Date</span>
                  <span className="font-semibold text-slate-800">{record.recordDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Security</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> AES-256-GCM
                  </span>
                </div>
              </div>

              {/* View Switcher: Clinical vs Cryptographic Inspection */}
              <div className="flex border-b border-slate-200">
                <button
                  id="tab-view-clinical"
                  onClick={() => setActiveTab('clinical')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === 'clinical'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Decrypted Clinical Information
                </button>
                <button
                  id="tab-view-crypto"
                  onClick={() => setActiveTab('crypto')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === 'crypto'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Cryptographic Payload & Verification
                </button>
              </div>

              {activeTab === 'clinical' ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-1">Clinical Summary</h5>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {record.summary}
                    </p>
                  </div>

                  {decryptedData && (
                    <div className="space-y-3">
                      <h5 className="font-semibold text-slate-700">Decrypted Sensitive Health Data (ePHI)</h5>
                      <div className="bg-sky-50/50 border border-sky-200 rounded-lg p-3.5 space-y-2.5 text-slate-700">
                        {typeof decryptedData === 'object' ? (
                          Object.entries(decryptedData).map(([key, val]) => (
                            <div key={key} className="border-b border-sky-100 pb-2 last:border-0 last:pb-0">
                              <span className="font-semibold text-sky-900 capitalize block mb-0.5">
                                {key.replace(/([A-Z])/g, ' $1')}:
                              </span>
                              <div className="text-slate-700 font-mono text-[11px] bg-white p-2 rounded border border-sky-100">
                                {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="font-mono text-xs">{String(decryptedData)}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {record.attachmentName && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-slate-500" />
                        <div>
                          <span className="font-medium text-slate-800 block">{record.attachmentName}</span>
                          <span className="text-[11px] text-slate-400">{record.attachmentSize || 'Protected File'}</span>
                        </div>
                      </div>
                      <button
                        id="btn-download-attachment"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify({ record, decryptedData }, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${record.title.replace(/\s+/g, '_')}_decrypted.json`;
                          a.click();
                        }}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-2xs"
                      >
                        <Download className="w-3 h-3" />
                        Download Record
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AES-256-GCM Authenticated Encryption Verified. Authentication tag check passed.</span>
                  </div>

                  <div className="space-y-3 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 font-sans font-medium text-xs block mb-1">
                        Ciphertext (Base64 Encrypted at Rest in MongoDB):
                      </span>
                      <div className="bg-slate-900 text-sky-300 p-2.5 rounded-md overflow-x-auto break-all max-h-24">
                        {record.encryptedData.ciphertext}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 font-sans font-medium text-xs block mb-1">
                          Initialization Vector (IV - 96-bit):
                        </span>
                        <div className="bg-slate-100 text-slate-800 p-2 rounded border border-slate-200 break-all">
                          {record.encryptedData.iv}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans font-medium text-xs block mb-1">
                          GCM Authentication Tag (128-bit):
                        </span>
                        <div className="bg-slate-100 text-slate-800 p-2 rounded border border-slate-200 break-all">
                          {record.encryptedData.authTag}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-sans font-medium text-xs block mb-1">
                        Cipher Algorithm:
                      </span>
                      <div className="bg-slate-100 text-slate-800 p-2 rounded border border-slate-200">
                        {record.encryptedData.algorithm || 'aes-256-gcm'} (Authenticated Symmetric Cipher)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            Access logged to cryptographic audit chain
          </span>
          <button
            id="btn-footer-close-viewer"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
