import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  User,
  LogOut,
  ChevronDown,
  Layers,
  FileCheck2,
  FileText,
  Activity,
  Server,
  KeyRound,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  onOpenVercelModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuthModal,
  onOpenVercelModal
}) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'PATIENT':
        return <span id="badge-role-patient" className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Patient</span>;
      case 'DOCTOR':
        return <span id="badge-role-doctor" className="px-2 py-0.5 text-xs font-medium rounded-md bg-sky-50 text-sky-700 border border-sky-200">Doctor</span>;
      case 'ADMIN':
        return <span id="badge-role-admin" className="px-2 py-0.5 text-xs font-medium rounded-md bg-purple-50 text-purple-700 border border-purple-200">Admin</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <button
              id="btn-nav-home"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                  MediLedger
                </span>
                <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase block">
                  Secure Health Data Platform
                </span>
              </div>
            </button>

            {/* Cryptographic Security Indicator */}
            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                <KeyRound className="w-3 h-3 text-sky-600" />
                AES-256-GCM
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                <Activity className="w-3 h-3 text-emerald-600" />
                SHA-256 Hash Chain
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              id="nav-tab-dashboard"
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {user?.role === 'PATIENT' && 'My Health Records'}
              {user?.role === 'DOCTOR' && 'Doctor Portal'}
              {user?.role === 'ADMIN' && 'Admin Overview'}
              {!user && 'Dashboard'}
            </button>

            <button
              id="nav-tab-audit"
              onClick={() => setCurrentTab('audit')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                currentTab === 'audit'
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 text-slate-400" />
              {user?.role === 'PATIENT' ? 'Who Viewed My Data?' : 'Audit Log & Chain'}
            </button>

            <button
              id="nav-tab-compliance"
              onClick={() => setCurrentTab('compliance')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                currentTab === 'compliance'
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-slate-400" />
              Compliance Matrix
            </button>

            <button
              id="nav-tab-vercel-guide"
              onClick={onOpenVercelModal}
              className="px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Server className="w-4 h-4 text-slate-400" />
              Vercel / Next.js
            </button>
          </nav>

          {/* User profile */}
          <div className="flex items-center gap-3">
            {/* User Profile or Login */}
            {user ? (
              <div className="relative">
                <button
                  id="btn-user-profile-menu"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-hidden"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-slate-800 leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      {user.patientId || user.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div
                    id="dropdown-user-menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 text-xs"
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-slate-500 truncate">{user.email}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {getRoleBadge(user.role)}
                        {user.patientId && (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {user.patientId}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      id="btn-user-logout"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-open-auth-modal"
                onClick={onOpenAuthModal}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
