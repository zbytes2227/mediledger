import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { PatientDashboard } from './components/PatientDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuditLogViewer } from './components/AuditLogViewer';
import { CompliancePage } from './components/CompliancePage';
import { AuthModal } from './components/AuthModal';
import { VercelGuideModal } from './components/VercelGuideModal';
import {
  ShieldCheck,
  Lock,
  Activity,
  Layers,
  FileCheck2,
  Server,
  UserCheck,
  KeyRound,
  ArrowRight,
  Database
} from 'lucide-react';

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showVercelModal, setShowVercelModal] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenVercelModal={() => setShowVercelModal(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <>
            {user?.role === 'PATIENT' && <PatientDashboard />}
            {user?.role === 'DOCTOR' && <DoctorDashboard />}
            {user?.role === 'ADMIN' && <AdminDashboard />}

            {/* Unauthenticated Landing / Role Entry for Evaluation */}
            {!user && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-3xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
                    MediLedger
                  </h1>
                  <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                    A secure healthcare data-sharing web platform featuring patient-controlled consent, AES-256-GCM encryption at rest, and a tamper-evident SHA-256 hash-chained audit log.
                  </p>

                  <button onClick={() => setShowAuthModal(true)} className="mt-6 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors">
                    Sign in or create an account
                  </button>
                </div>

                {/* Key Technical Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-xs">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                    <KeyRound className="w-6 h-6 text-sky-600 mb-2" />
                    <h3 className="font-bold text-slate-900 mb-1">AES-256-GCM Encryption</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Medical records and clinical payloads are encrypted using random 96-bit initialization vectors and 128-bit authentication tags.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                    <Layers className="w-6 h-6 text-emerald-600 mb-2" />
                    <h3 className="font-bold text-slate-900 mb-1">Hash-Chained Audit Log</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Cryptographic chaining without blockchain overhead. Any database alteration breaks the chain and is mathematically identified.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                    <UserCheck className="w-6 h-6 text-purple-600 mb-2" />
                    <h3 className="font-bold text-slate-900 mb-1">Patient-Controlled Consent</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Doctors cannot access patient data without approved, time-limited, and category-scoped permission grants.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {currentTab === 'audit' && <AuditLogViewer />}
        {currentTab === 'compliance' && <CompliancePage />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">MediLedger</span>
            <span>•</span>
            <span>  Academic Prototype</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Conventional Mongoose & SHA-256 (No Blockchain)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('compliance')}
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              Regulatory Matrix
            </button>
            <span>•</span>
            <button
              onClick={() => setShowVercelModal(true)}
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              Vercel Deployment
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showVercelModal && <VercelGuideModal onClose={() => setShowVercelModal(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
