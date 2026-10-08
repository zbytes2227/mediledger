import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IMedicalRecord, IAccessGrant, IAuditLog, RecordCategory } from '../types';
import {
  FileText,
  Upload,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  Plus,
  Lock,
  Search,
  Filter,
  UserCheck,
  Calendar,
  Building2,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { RecordViewerModal } from './RecordViewerModal';

export const PatientDashboard: React.FC = () => {
  const { user, authFetch } = useAuth();
  const [records, setRecords] = useState<IMedicalRecord[]>([]);
  const [grants, setGrants] = useState<IAccessGrant[]>([]);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Filter & Search states
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'records' | 'grants' | 'audit'>('records');

  // New Record Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<RecordCategory>('PRESCRIPTION');
  const [newDoctor, setNewDoctor] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSummary, setNewSummary] = useState('');
  const [newSensitiveNotes, setNewSensitiveNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Approval Customization State
  const [approvingGrantId, setApprovingGrantId] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState<number>(24);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, grantRes, auditRes] = await Promise.all([
        authFetch('/api/records'),
        authFetch('/api/grants'),
        authFetch('/api/audit')
      ]);

      if (recRes.ok) {
        const data = await recRes.json();
        setRecords(data.records || []);
      }
      if (grantRes.ok) {
        const data = await grantRes.json();
        setGrants(data.grants || []);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching patient dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDoctor) return;

    setUploading(true);
    try {
      const res = await authFetch('/api/records', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          doctorOrClinic: newDoctor,
          recordDate: newDate,
          summary: newSummary,
          sensitiveNotes: newSensitiveNotes,
          attachmentName: `${newTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
          attachmentSize: '220 KB'
        })
      });

      if (res.ok) {
        setShowUploadModal(false);
        setNewTitle('');
        setNewSummary('');
        setNewSensitiveNotes('');
        setNewDoctor('');
        fetchData();
      }
    } catch (err) {
      console.error('Record upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleApproveGrant = async (grantId: string) => {
    try {
      const res = await authFetch(`/api/grants/${grantId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          customDurationHours: customHours
        })
      });
      if (res.ok) {
        setApprovingGrantId(null);
        fetchData();
      }
    } catch (err) {
      console.error('Approval failed', err);
    }
  };

  const handleRejectGrant = async (grantId: string) => {
    try {
      const res = await authFetch(`/api/grants/${grantId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Patient declined access request.' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Rejection failed', err);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    try {
      const res = await authFetch(`/api/grants/${grantId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Patient revoked access grant immediately.' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Revocation failed', err);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this medical record? This action will be recorded in the audit log.')) return;
    try {
      const res = await authFetch(`/api/records/${recordId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await authFetch('/api/patient/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mediledger-${user?.patientId || 'patient'}-data-export.json`;
        a.click();
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await authFetch('/api/patient/delete-account', { method: 'POST' });
      if (res.ok) {
        alert('Your records have been permanently erased. Historical audit trail has been pseudonymized to preserve cryptographic chain integrity.');
        window.location.reload();
      }
    } catch (err) {
      console.error('Account erasure failed', err);
    }
  };

  // Filtered records
  const filteredRecords = records.filter(r => {
    const matchCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.doctorOrClinic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const pendingGrants = grants.filter(g => g.status === 'PENDING');
  const activeGrants = grants.filter(g => g.status === 'APPROVED');
  const pastGrants = grants.filter(g => ['REJECTED', 'REVOKED', 'EXPIRED'].includes(g.status));

  // "Who Viewed My Data?" events: doctor views/access
  const doctorAccessEvents = auditLogs.filter(log =>
    ['RECORD_VIEWED', 'ACCESS_REQUESTED', 'ACCESS_APPROVED', 'ACCESS_REVOKED', 'UNAUTHORIZED_ACCESS_ATTEMPT'].includes(log.eventType)
  );

  return (
    <div className="space-y-6">
      {/* Patient Header Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{user?.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              {user?.patientId || 'PAT-XXXX'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Blood Group: <span className="font-semibold text-slate-700">{user?.bloodGroup || 'O+'}</span> | DOB: {user?.dateOfBirth || '1988-05-14'} | Emergency: {user?.emergencyContact || 'Verified'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-upload-new-record"
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload Medical Record
          </button>
          <button
            id="btn-export-patient-json"
            onClick={handleExportData}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Export full personal records and consent history as JSON (GDPR Article 20)"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export JSON
          </button>
          <button
            id="btn-open-delete-account"
            onClick={() => setShowDeleteAccountModal(true)}
            className="px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-transparent hover:border-rose-200 transition-colors"
            title="Exercise Data Principal Right to Erasure"
          >
            Erase Records
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Stored Records</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{records.length}</span>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <Lock className="w-3 h-3" /> AES-256-GCM Encrypted
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Active Doctor Grants</span>
          <span className="text-2xl font-bold text-sky-600 mt-1 block">{activeGrants.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Time-limited scoped</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Pending Requests</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{pendingGrants.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting your approval</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Access Events Logged</span>
          <span className="text-2xl font-bold text-slate-800 mt-1 block">{doctorAccessEvents.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Cryptographic audit trail</span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
        <button
          id="tab-patient-records"
          onClick={() => setActiveTab('records')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'records'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          My Medical Records ({records.length})
        </button>

        <button
          id="tab-patient-grants"
          onClick={() => setActiveTab('grants')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'grants'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Consent & Doctor Grants
          {pendingGrants.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px]">
              {pendingGrants.length}
            </span>
          )}
        </button>

        <button
          id="tab-patient-audit"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Who Viewed My Data? ({doctorAccessEvents.length})
        </button>
      </div>

      {/* TAB 1: MEDICAL RECORDS */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search record title, clinic, notes..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs pb-1 sm:pb-0">
              {['ALL', 'PRESCRIPTION', 'LAB_REPORT', 'VISIT_HISTORY', 'DIAGNOSTIC_SCAN'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Records' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Records Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading encrypted medical records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No medical records found</p>
              <p className="text-xs text-slate-400 mt-1">Upload your prescriptions, lab tests, or visit summaries above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  id={`card-record-${record.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                        {record.category}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {record.recordDate}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{record.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {record.doctorOrClinic}
                    </p>

                    <p className="text-xs text-slate-600 mt-2.5 bg-slate-50 p-2 rounded-md line-clamp-2">
                      {record.summary}
                    </p>

                    {/* Encryption status tag */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <ShieldCheck className="w-3 h-3" /> Encrypted at Rest
                      </span>
                      <span className="text-slate-400">{record.attachmentName || 'PDF Document'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      id={`btn-view-record-${record.id}`}
                      onClick={() => setSelectedRecordId(record.id)}
                      className="w-full px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Decrypt & View
                    </button>
                    <button
                      id={`btn-delete-record-${record.id}`}
                      onClick={() => handleDeleteRecord(record.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete this record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONSENT & DOCTOR ACCESS GRANTS */}
      {activeTab === 'grants' && (
        <div className="space-y-6">
          {/* Incoming Pending Requests */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-500" />
              Incoming Doctor Access Requests ({pendingGrants.length})
            </h2>

            {pendingGrants.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                No pending doctor access requests. When a doctor requests permission, it will appear here for your review.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingGrants.map((grant) => (
                  <div
                    key={grant.id}
                    id={`grant-pending-${grant.id}`}
                    className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{grant.doctorName}</span>
                        <span className="text-xs text-slate-500 font-mono">({grant.doctorEmail})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {grant.doctorSpecialty || 'Doctor'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">
                        <span className="font-semibold text-slate-900">Stated Purpose:</span> {grant.purpose}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span>Requested Duration: <strong className="text-slate-800">{grant.requestedDurationHours} hours</strong></span>
                        <span>Scope: <strong className="text-slate-800">{grant.categoryScope?.join(', ')}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {approvingGrantId === grant.id ? (
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                          <label className="text-[11px] font-medium text-slate-700">Duration:</label>
                          <select
                            value={customHours}
                            onChange={(e) => setCustomHours(Number(e.target.value))}
                            className="text-xs border border-slate-300 rounded px-1.5 py-1"
                          >
                            <option value={1}>1 Hour</option>
                            <option value={24}>24 Hours (1 Day)</option>
                            <option value={72}>72 Hours (3 Days)</option>
                            <option value={168}>7 Days</option>
                          </select>
                          <button
                            id={`btn-confirm-approve-${grant.id}`}
                            onClick={() => handleApproveGrant(grant.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                          >
                            Grant
                          </button>
                          <button
                            onClick={() => setApprovingGrantId(null)}
                            className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            id={`btn-approve-grant-${grant.id}`}
                            onClick={() => {
                              setApprovingGrantId(grant.id);
                              setCustomHours(grant.requestedDurationHours || 24);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve Access
                          </button>
                          <button
                            id={`btn-reject-grant-${grant.id}`}
                            onClick={() => handleRejectGrant(grant.id)}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Approved Grants */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Active Time-Limited Grants ({activeGrants.length})
            </h2>

            {activeGrants.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                No active grants currently open. No doctors have active access to your medical records.
              </div>
            ) : (
              <div className="space-y-3">
                {activeGrants.map((grant) => (
                  <div
                    key={grant.id}
                    id={`grant-active-${grant.id}`}
                    className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{grant.doctorName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Permission
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">
                        <span className="font-semibold text-slate-900">Purpose:</span> {grant.purpose}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                        <span>Permitted Categories: <strong className="text-slate-800">{grant.categoryScope?.join(', ')}</strong></span>
                        <span className="text-sky-700 font-medium">
                          Expires at: {grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <button
                      id={`btn-revoke-grant-${grant.id}`}
                      onClick={() => handleRevokeGrant(grant.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start md:self-center"
                      title="Instantly cut off doctor access"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Revoke Immediately
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Grants */}
          {pastGrants.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-500 mb-2">Expired & Revoked Grants History</h2>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {pastGrants.map((grant) => (
                  <div key={grant.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">{grant.doctorName}</span>
                      <span className="text-slate-400 ml-2">({grant.purpose})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      grant.status === 'REVOKED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {grant.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: "WHO VIEWED MY DATA?" AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900">
            <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              Patient Transparency Portal: "Who Viewed My Data?"
            </h3>
            <p className="text-sky-800 leading-relaxed">
              In accordance with GDPR Article 15 (Right of Access) and India DPDP Act Section 12, MediLedger maintains an immutable, cryptographically hash-chained audit record of every access grant, viewing event, and unauthorized attempt.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700">
              Access History for Patient ID: {user?.patientId}
            </div>

            {doctorAccessEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No doctor access events recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {doctorAccessEvents.map((log) => (
                  <div key={log.id || log.sequenceNumber} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.eventType === 'RECORD_VIEWED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.eventType === 'UNAUTHORIZED_ACCESS_ATTEMPT'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {log.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="font-bold text-slate-900">{log.actor.name}</span>
                        <span className="text-slate-400">({log.actor.email})</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-600 mt-1.5">{log.target?.description || log.details?.purpose || 'Record event'}</p>

                    <div className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                      <span>Block #{log.sequenceNumber}</span>
                      <span className="truncate max-w-xs">Hash: {log.entryHash.slice(0, 24)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Upload New Medical Record */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Upload New Medical Record</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Record Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Echocardiogram Report / Blood Pressure Prescription"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as RecordCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  >
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="LAB_REPORT">Lab Report</option>
                    <option value="VISIT_HISTORY">Visit History</option>
                    <option value="DIAGNOSTIC_SCAN">Diagnostic Scan</option>
                    <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Doctor or Clinic Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sarah Chen / Metro Health Clinic"
                  value={newDoctor}
                  onChange={(e) => setNewDoctor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">General Summary</label>
                <input
                  type="text"
                  placeholder="Brief public overview (e.g. Routine blood chemistry evaluation)"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Sensitive Clinical Notes & Details (Encrypted at Rest)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> AES-256-GCM
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter private diagnostic findings, medications, dosages, or lab numbers that will be encrypted at rest..."
                  value={newSensitiveNotes}
                  onChange={(e) => setNewSensitiveNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <span className="text-slate-600 font-medium block">Protected File Document</span>
                <span className="text-[11px] text-slate-400">PDF document simulated and protected with authenticated encryption</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {uploading ? 'Encrypting & Saving...' : 'Save & Encrypt Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Account / Erasure */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-xs">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Right to Erasure (GDPR Art 17)</h3>
            <p className="text-slate-600 mb-3">
              Are you sure you want to permanently erase your medical records and deactivate your account?
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-slate-600 mb-4">
              <p className="font-semibold text-slate-800">What will happen:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>All personal medical records and encrypted clinical payloads will be deleted.</li>
                <li>All active doctor access grants will be revoked immediately.</li>
                <li>Audit log hash-chain entries will have your identity pseudonymized to preserve mathematical integrity without storing your private data.</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
              >
                Permanently Erase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Viewer Modal */}
      {selectedRecordId && (
        <RecordViewerModal
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
        />
      )}
    </div>
  );
};
