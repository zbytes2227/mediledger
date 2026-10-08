import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IMedicalRecord, IAccessGrant, RecordCategory } from '../types';
import {
  UserCheck,
  Search,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Send,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  Lock,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';
import { RecordViewerModal } from './RecordViewerModal';

export const DoctorDashboard: React.FC = () => {
  const { user, authFetch } = useAuth();
  const [grants, setGrants] = useState<IAccessGrant[]>([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Request modal
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [requestPurpose, setRequestPurpose] = useState<string>('');
  const [requestedHours, setRequestedHours] = useState<number>(24);
  const [requestedCategories, setRequestedCategories] = useState<RecordCategory[]>([
    'PRESCRIPTION',
    'LAB_REPORT',
    'VISIT_HISTORY'
  ]);
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  // Active viewing records
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);
  const [viewingPatientName, setViewingPatientName] = useState<string>('');
  const [activeGrantInfo, setActiveGrantInfo] = useState<any>(null);
  const [patientRecords, setPatientRecords] = useState<IMedicalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'history'>('active');

  const fetchGrants = async () => {
    try {
      const res = await authFetch('/api/grants');
      if (res.ok) {
        const data = await res.json();
        setGrants(data.grants || []);
      }
    } catch (err) {
      console.error('Failed to load doctor grants', err);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, []);

  const handlePatientSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await authFetch(`/api/patients/search?query=${encodeURIComponent(patientSearchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.patients || []);
      }
    } catch (err) {
      console.error('Patient search error', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !requestPurpose.trim()) return;

    setSubmittingRequest(true);
    setRequestMessage(null);
    try {
      const res = await authFetch('/api/grants/request', {
        method: 'POST',
        body: JSON.stringify({
          patientIdentifier: selectedPatient.patientId || selectedPatient.email,
          purpose: requestPurpose,
          requestedDurationHours: requestedHours,
          categoryScope: requestedCategories
        })
      });

      const data = await res.json();
      if (res.ok) {
        setRequestMessage('Access request sent to patient. Awaiting patient consent approval.');
        setTimeout(() => {
          setSelectedPatient(null);
          setRequestPurpose('');
          setRequestMessage(null);
          fetchGrants();
        }, 1800);
      } else {
        alert(data.error || 'Failed to submit request');
      }
    } catch (err) {
      console.error('Access request failed', err);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleViewPatientRecords = async (grant: IAccessGrant) => {
    setViewingPatientId(grant.patientId);
    setViewingPatientName(grant.patientName);
    setActiveGrantInfo(grant);
    setLoadingRecords(true);
    setRecordsError(null);

    try {
      const res = await authFetch(`/api/records?patientId=${grant.patientId}`);
      const data = await res.json();
      if (res.ok) {
        setPatientRecords(data.records || []);
      } else {
        setRecordsError(data.error || 'Access denied. Valid consent grant required.');
        setPatientRecords([]);
      }
    } catch (err: any) {
      setRecordsError(err.message || 'Error fetching records.');
      setPatientRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Filter grant groups
  const activeGrants = grants.filter(g => g.status === 'APPROVED');
  const pendingGrants = grants.filter(g => g.status === 'PENDING');
  const historyGrants = grants.filter(g => ['EXPIRED', 'REVOKED', 'REJECTED'].includes(g.status));

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{user?.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              {user?.doctorSpecialty || 'Clinical Physician'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            License: <span className="font-mono text-slate-700">{user?.doctorLicenseNumber || 'MD-NY-849201'}</span> | Hospital: {user?.hospitalAffiliation || 'Metro Health Medical Center'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-patient-search"
            onClick={() => {
              setPatientSearchQuery('PAT-1082');
              setSearchResults([]);
            }}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Search className="w-4 h-4" />
            Lookup Patient & Request Access
          </button>
        </div>
      </div>

      {/* Patient Search & Request Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-sky-600" />
          Patient Controlled Lookup Mechanism
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Search by official Patient Identifier (e.g. <strong className="text-slate-700">PAT-1082</strong>) or registered patient email.
        </p>

        <form onSubmit={handlePatientSearch} className="flex gap-2 max-w-xl">
          <input
            type="text"
            placeholder="Enter Patient ID (e.g. PAT-1082) or email..."
            value={patientSearchQuery}
            onChange={(e) => setPatientSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {searchResults.map((patient) => (
              <div key={patient.patientId} className="p-3 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{patient.name}</span>
                  <span className="ml-2 px-2 py-0.5 bg-white border border-slate-200 font-mono text-[11px] rounded">
                    {patient.patientId}
                  </span>
                  <span className="text-slate-500 ml-2">({patient.email})</span>
                </div>
                <button
                  id={`btn-request-access-${patient.patientId}`}
                  onClick={() => setSelectedPatient(patient)}
                  className="px-3 py-1 bg-sky-600 text-white rounded text-xs font-semibold hover:bg-sky-700 flex items-center gap-1 shadow-2xs"
                >
                  <Send className="w-3 h-3" />
                  Request Permission
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Request Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Request Medical Access Permission</h3>
              <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 mb-4 text-sky-900">
              Patient: <strong className="text-sky-950">{selectedPatient.name}</strong> ({selectedPatient.patientId})
            </div>

            {requestMessage ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-center font-medium">
                {requestMessage}
              </div>
            ) : (
              <form onSubmit={handleSendAccessRequest} className="space-y-3.5">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Clinical Purpose of Access * (Required by DPDP & HIPAA)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiovascular pre-op clearance and medication review"
                    value={requestPurpose}
                    onChange={(e) => setRequestPurpose(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Requested Duration *</label>
                  <select
                    value={requestedHours}
                    onChange={(e) => setRequestedHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  >
                    <option value={1}>1 Hour (Emergency Assessment)</option>
                    <option value={24}>24 Hours (Standard Consultation)</option>
                    <option value={72}>72 Hours (3 Days Follow-Up)</option>
                    <option value={168}>7 Days (Treatment Review)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Permitted Category Scope</label>
                  <div className="space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    {(['PRESCRIPTION', 'LAB_REPORT', 'VISIT_HISTORY', 'DIAGNOSTIC_SCAN'] as RecordCategory[]).map((cat) => (
                      <label key={cat} className="flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={requestedCategories.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRequestedCategories([...requestedCategories, cat]);
                            } else {
                              setRequestedCategories(requestedCategories.filter(c => c !== cat));
                            }
                          }}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>{cat.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingRequest ? 'Submitting...' : 'Send Request to Patient'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
        <button
          id="tab-doctor-active"
          onClick={() => setActiveTab('active')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Active Authorized Patients ({activeGrants.length})
        </button>

        <button
          id="tab-doctor-pending"
          onClick={() => setActiveTab('pending')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          Pending Consent ({pendingGrants.length})
        </button>

        <button
          id="tab-doctor-history"
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-slate-400" />
          Expired & Revoked Grants ({historyGrants.length})
        </button>
      </div>

      {/* ACTIVE AUTHORIZED PATIENTS */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeGrants.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No active patient grants currently authorized.</p>
              <p className="text-slate-400 mt-1">Search for a patient above to request access permission.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGrants.map((grant) => (
                <div
                  key={grant.id}
                  id={`doctor-grant-${grant.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-base">{grant.patientName}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded text-[10px]">
                        ACTIVE GRANT
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{grant.patientId}</span>

                    <p className="text-xs text-slate-700 mt-2">
                      <span className="font-semibold text-slate-900">Purpose:</span> {grant.purpose}
                    </p>

                    <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600">
                      <div>Permitted Scope: <strong className="text-slate-900">{grant.categoryScope?.join(', ')}</strong></div>
                      <div className="flex items-center gap-1 text-sky-700 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        Expires: {grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Consent Validated
                    </span>
                    <button
                      id={`btn-open-patient-records-${grant.patientId}`}
                      onClick={() => handleViewPatientRecords(grant)}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Authorized Records
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Records Display Drawer for Selected Patient */}
          {viewingPatientId && (
            <div className="mt-6 bg-slate-50 border-2 border-sky-200 rounded-xl p-5 shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sky-600" />
                    Medical Records for {viewingPatientName} ({viewingPatientId})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Viewing under Consent Grant ID: <span className="font-mono text-slate-700">{activeGrantInfo?.id}</span> | Scope: {activeGrantInfo?.categoryScope?.join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => setViewingPatientId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200"
                >
                  Close View
                </button>
              </div>

              {loadingRecords ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Verifying consent grant and loading authorized patient records...
                </div>
              ) : recordsError ? (
                <div className="py-6 text-center text-rose-600 text-xs font-medium">
                  {recordsError}
                </div>
              ) : patientRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No records found within your permitted category scope.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                  {patientRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700">
                            {rec.category}
                          </span>
                          <span className="text-[11px] text-slate-400">{rec.recordDate}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-2">{rec.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{rec.doctorOrClinic}</p>
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                          {rec.summary}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedRecordId(rec.id)}
                        className="mt-3 w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Decrypt & View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PENDING REQUESTS */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingGrants.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              No pending access requests. All submitted requests have been processed by patients.
            </div>
          ) : (
            pendingGrants.map((grant) => (
              <div key={grant.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{grant.patientName}</span>
                  <span className="text-slate-400 ml-2">({grant.patientId})</span>
                  <p className="text-slate-600 mt-1">Purpose: {grant.purpose}</p>
                  <span className="text-slate-400 text-[11px]">Requested: {new Date(grant.createdAt || '').toLocaleString()}</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-semibold rounded text-xs">
                  Pending Patient Approval
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* EXPIRED & REVOKED */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {historyGrants.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              No expired or revoked grants.
            </div>
          ) : (
            historyGrants.map((grant) => (
              <div key={grant.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{grant.patientName}</span>
                  <span className="text-slate-400 ml-2">({grant.patientId})</span>
                  <p className="text-slate-600 mt-0.5">Purpose: {grant.purpose}</p>
                  {grant.revokedReason && (
                    <p className="text-rose-600 text-[11px] mt-0.5 font-medium">Reason: {grant.revokedReason}</p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded font-semibold text-xs ${
                  grant.status === 'REVOKED'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {grant.status} (Access Cutoff)
                </span>
              </div>
            ))
          )}
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
