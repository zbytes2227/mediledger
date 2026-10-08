import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IUser, IAccessGrant, IAuditLog, IChainVerificationResult } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  FileText,
  Key,
  Database,
  Activity,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Bug,
  RotateCcw,
  Search,
  Lock
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<IUser[]>([]);
  const [grants, setGrants] = useState<IAccessGrant[]>([]);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [verificationResult, setVerificationResult] = useState<IChainVerificationResult | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [tampering, setTampering] = useState<boolean>(false);
  const [tamperMessage, setTamperMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userSearch, setUserSearch] = useState<string>('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, grantsRes, auditRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/users'),
        authFetch('/api/grants'),
        authFetch('/api/audit')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (grantsRes.ok) {
        const data = await grantsRes.json();
        setGrants(data.grants || []);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await authFetch('/api/audit/verify');
      if (res.ok) {
        const result = await res.json();
        setVerificationResult(result);
      }
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    setTampering(true);
    try {
      const res = await authFetch('/api/audit/simulate-tamper', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTamperMessage(`Tamper attack injected at Block #${data.tamperedIndex}: payload modified in database without re-signing the SHA-256 hash. Run verification now to observe tamper detection!`);
        handleVerifyChain();
        fetchAdminData();
      }
    } catch (err) {
      console.error('Tamper attack failed', err);
    } finally {
      setTampering(false);
    }
  };

  const handleRestoreIntegrity = async () => {
    try {
      const res = await authFetch('/api/audit/restore', { method: 'POST' });
      if (res.ok) {
        setTamperMessage(null);
        handleVerifyChain();
        fetchAdminData();
      }
    } catch (err) {
      console.error('Restore failed', err);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await authFetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to change user status', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
    handleVerifyChain();
  }, []);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.patientId && u.patientId.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Admin Title Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Administrative Platform Oversight</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Security Controller
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System governance, role validation, tamper-evident audit verification, and account controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-admin-verify-chain"
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying Chain...' : 'Verify Cryptographic Chain'}
          </button>
        </div>
      </div>

      {/* Security Banner: Admin Confidentiality Restriction */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 block">Principle of Least Privilege Enforced:</span>
          Administrators oversee accounts and audit chain integrity, but are cryptographically and policy-restricted from viewing patients' confidential medical records.
        </div>
      </div>

      {/* Platform Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Total Registered Users</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats?.totalUsers || users.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats?.patientsCount || 0} Patients | {stats?.doctorsCount || 0} Doctors
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Stored Medical Records</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats?.totalMedicalRecords || 0}</span>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" /> AES-256-GCM
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Audit Chain Blocks</span>
          <span className="text-2xl font-bold text-sky-600 mt-1 block">{stats?.auditBlocksCount || auditLogs.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Append-only SHA-256</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Chain Integrity Status</span>
          <span className={`text-base font-bold mt-2 flex items-center gap-1.5 ${
            verificationResult?.isValid ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {verificationResult?.isValid ? (
              <>
                <CheckCircle2 className="w-5 h-5" /> 100% Verified
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" /> Tamper Detected
              </>
            )}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {verificationResult?.totalBlocks || 0} blocks checked
          </span>
        </div>
      </div>

      {/* Tamper Detection Demonstration Control Card (Academic   Defense Showcase) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              Cryptographic Tamper-Evidence Verification & Attack Simulator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrate that any unauthorized mutation of database logs is mathematically detected by the SHA-256 canonical hash chain.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-simulate-tamper"
              onClick={handleSimulateTamper}
              disabled={tampering}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Intentionally mutate a database entry without updating its cryptographic hash"
            >
              <Bug className="w-3.5 h-3.5 text-rose-600" />
              Simulate Database Tamper Attack
            </button>
            <button
              id="btn-restore-chain"
              onClick={handleRestoreIntegrity}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Clean Chain
            </button>
          </div>
        </div>

        {/* Verification Status Alert */}
        {tamperMessage && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-mono">
            {tamperMessage}
          </div>
        )}

        {verificationResult && (
          <div className={`mt-3 p-3.5 rounded-lg border text-xs ${
            verificationResult.isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              {verificationResult.isValid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Cryptographic Audit Chain Integrity Validated (No Tampering)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  TAMPER DETECTED! Cryptographic Hash Mismatch Identified
                </>
              )}
            </div>
            <p className="text-xs">
              {verificationResult.isValid
                ? `All ${verificationResult.totalBlocks} sequential entries from Genesis Block #0 to tip verified. Every block's stored entryHash matches canonical SHA-256 recalculation, and each previousHash link is intact.`
                : verificationResult.errorReason}
            </p>
          </div>
        )}
      </div>

      {/* User Accounts Management Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Registered Platform Accounts</h3>
            <p className="text-xs text-slate-500">Manage user accounts and role permissions</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name, email, ID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Identifier / Details</th>
                <th className="px-4 py-2.5">Account Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id || u._id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900 block">{u.name}</span>
                    <span className="text-slate-400">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      u.role === 'PATIENT' ? 'bg-emerald-50 text-emerald-700' :
                      u.role === 'DOCTOR' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.patientId && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{u.patientId}</span>}
                    {u.doctorSpecialty && <span>{u.doctorSpecialty}</span>}
                    {!u.patientId && !u.doctorSpecialty && <span className="text-slate-400">Security Officer</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      u.accountStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                      u.accountStatus === 'SUSPENDED' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {u.accountStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleToggleUserStatus(u.id || u._id!, u.accountStatus)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          u.accountStatus === 'ACTIVE'
                            ? 'text-amber-700 hover:bg-amber-50 border border-amber-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        {u.accountStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
