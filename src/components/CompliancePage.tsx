import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileCheck2,
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  Database,
  ExternalLink,
  Scale,
  CheckCircle2
} from 'lucide-react';

export const CompliancePage: React.FC = () => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [activeFramework, setActiveFramework] = useState<number>(0);

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const res = await authFetch('/api/compliance/matrix');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load compliance matrix', err);
      }
    };
    fetchMatrix();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Regulatory Compliance & Security Architecture Mapping
            </h1>
            <p className="text-xs text-slate-500">
              Academic   demonstration of technical safeguards mapped to international data privacy statutes.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
          <strong>Academic Demonstration Notice:</strong> {data?.disclaimer || 'This is an academic engineering prototype developed for B.Tech Computer Science demonstration purposes, showcasing practical cryptographic and access-control patterns, not a formal certification of legal medical software compliance.'}
        </div>
      </div>

      {/* Framework Selector Tabs */}
      {data?.frameworks && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {data.frameworks.map((fw: any, idx: number) => (
            <button
              key={fw.standard}
              id={`tab-compliance-${idx}`}
              onClick={() => setActiveFramework(idx)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeFramework === idx
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {fw.standard}
            </button>
          ))}
        </div>
      )}

      {/* Active Framework Details */}
      {data?.frameworks && data.frameworks[activeFramework] && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              {data.frameworks[activeFramework].standard}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Detailed technical mapping between statutory mandates and MediLedger implementation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.frameworks[activeFramework].regulations.map((reg: any, i: number) => (
                <div
                  key={i}
                  className="bg-slate-50/75 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">{reg.section}</h3>
                    </div>

                    <div className="mb-3">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">
                        Statutory Requirement
                      </span>
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                        {reg.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide block mb-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      MediLedger Technical Safeguard
                    </span>
                    <p className="text-xs text-slate-800 font-medium">
                      {reg.implementation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Architecture Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          Core Cryptographic & Security Safeguards Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">AES-256-GCM Encryption</span>
            <p className="text-slate-600 text-[11px]">
              Sensitive ePHI is encrypted at rest using 256-bit symmetric keys, 96-bit random IVs, and 128-bit authentication tags to prevent tampering.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Canonical SHA-256 Chaining</span>
            <p className="text-slate-600 text-[11px]">
              Every audit block signs the previous block hash and its own canonical payload. Breaks in sequence or content mutations are flagged immediately.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Strict Server-Side RBAC</span>
            <p className="text-slate-600 text-[11px]">
              Access control enforced at Express/Next.js API route handlers. Doctors cannot read unconsented records even by guessing IDs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
