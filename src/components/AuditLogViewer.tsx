import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IAuditLog, IChainVerificationResult } from '../types';
import {
  Layers,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Hash,
  Link,
  Code
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { authFetch, user } = useAuth();
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [verification, setVerification] = useState<IChainVerificationResult | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await authFetch('/api/audit/verify');
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
      }
    } catch (err) {
      console.error('Verification error', err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    handleVerify();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchType = eventTypeFilter === 'ALL' || log.eventType === eventTypeFilter;
    const matchSearch =
      log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.target?.description && log.target.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.entryHash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const getEventBadge = (type: string) => {
    if (type.includes('UNAUTHORIZED') || type.includes('FAILED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">{type}</span>;
    }
    if (type.includes('APPROVED') || type.includes('SUCCESS') || type.includes('RESTORED') || type.includes('VERIFIED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{type}</span>;
    }
    if (type.includes('REQUESTED') || type.includes('TAMPER')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">{type}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">{type}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tamper-Evident Cryptographic Audit Log</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              SHA-256 Hash Chain
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Conventional database-backed, append-only cryptographic ledger. Each entry deterministically signs the previous block hash.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-verify-audit-chain-now"
            onClick={handleVerify}
            disabled={verifying}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Recalculating Hashes...' : 'Re-verify Entire Chain'}
          </button>
        </div>
      </div>

      {/* Verification Summary Banner */}
      {verification && (
        <div className={`p-4 rounded-xl border text-xs shadow-xs ${
          verification.isValid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-bold text-sm">
              {verification.isValid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Hash Chain Validated: 100% Tamper-Evident Integrity
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Data Tamper Detected at Block #{verification.tamperedIndex}
                </>
              )}
            </div>
            <span className="font-mono text-xs text-slate-500">
              Total Height: {verification.totalBlocks} Blocks
            </span>
          </div>
          <p className="mt-1.5 text-xs">
            {verification.isValid
              ? `Every entry from Genesis Block #0 through tip block #${verification.totalBlocks - 1} was recalculated using canonical JSON serialization and SHA-256. No unauthorized modifications detected.`
              : verification.errorReason}
          </p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search actor, event type, hash, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-slate-500 font-medium">Event Filter:</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          >
            <option value="ALL">All Event Types</option>
            <option value="USER_REGISTER">USER_REGISTER</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="RECORD_CREATED">RECORD_CREATED</option>
            <option value="RECORD_VIEWED">RECORD_VIEWED</option>
            <option value="ACCESS_REQUESTED">ACCESS_REQUESTED</option>
            <option value="ACCESS_APPROVED">ACCESS_APPROVED</option>
            <option value="ACCESS_REVOKED">ACCESS_REVOKED</option>
            <option value="ACCESS_EXPIRED">ACCESS_EXPIRED</option>
            <option value="UNAUTHORIZED_ACCESS_ATTEMPT">UNAUTHORIZED_ACCESS_ATTEMPT</option>
            <option value="AUDIT_CHAIN_VERIFIED">AUDIT_CHAIN_VERIFIED</option>
          </select>
        </div>
      </div>

      {/* Chain Blocks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading audit ledger entries...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            No audit records match the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === (log.id || String(log.sequenceNumber));
            const isGenesis = log.sequenceNumber === 0;

            return (
              <div
                key={log.id || log.sequenceNumber}
                id={`audit-block-${log.sequenceNumber}`}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs transition-all hover:border-slate-300"
              >
                {/* Block header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                      #{log.sequenceNumber}
                    </span>
                    {getEventBadge(log.eventType)}
                    <span className="text-xs font-semibold text-slate-800">
                      {log.target?.description || log.eventType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : (log.id || String(log.sequenceNumber)))}
                      className="text-sky-600 hover:text-sky-800 font-medium flex items-center gap-0.5"
                    >
                      {isExpanded ? (
                        <>
                          Hide Payload <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Inspect Proof <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Actor & Hash Strip */}
                <div className="pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">Actor (Authorized Identity)</span>
                    <span className="font-semibold text-slate-900">{log.actor.name}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">({log.actor.email} - {log.actor.role})</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block text-[11px] flex items-center gap-1">
                      <Hash className="w-3 h-3 text-sky-600" />
                      Current Entry Hash (SHA-256)
                    </span>
                    <span className="font-mono text-[11px] text-slate-700 truncate block bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {log.entryHash}
                    </span>
                  </div>
                </div>

                {/* Chaining Link Indicator */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <Link className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Prev Hash: {isGenesis ? '0000000000000000000000000000000000000000000000000000000000000000 (GENESIS)' : log.previousHash}
                  </span>
                </div>

                {/* Expanded Cryptographic Inspection Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 rounded-lg p-3 text-xs space-y-2.5 font-mono">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px] font-sans">
                      <Code className="w-3.5 h-3.5 text-sky-600" />
                      Canonical Canonicalized Entry Payload
                    </div>
                    <pre className="bg-slate-900 text-sky-300 p-2.5 rounded-md overflow-x-auto text-[11px] leading-relaxed">
{JSON.stringify({
  sequenceNumber: log.sequenceNumber,
  timestamp: log.timestamp,
  eventType: log.eventType,
  actor: log.actor,
  target: log.target,
  details: log.details,
  previousHash: log.previousHash,
  calculatedEntryHash: log.entryHash
}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
