import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  ShieldCheck,
  User,
  KeyRound,
  Mail,
  UserCheck,
  AlertCircle,
  Building2,
  Stethoscope,
  Lock
} from 'lucide-react';
import { UserRole } from '../types';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('PATIENT');
  const [specialty, setSpecialty] = useState('Cardiovascular Medicine');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({
          name,
          email,
          password,
          role,
          doctorSpecialty: role === 'DOCTOR' ? specialty : undefined
        });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isRegister ? 'Create MediLedger Account' : 'MediLedger Authentication'}
              </h3>
              <p className="text-[11px] text-slate-500">Secure role-based access control (RBAC)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 mt-4 mb-4">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`flex-1 pb-2 font-semibold text-xs border-b-2 text-center transition-colors ${
              !isRegister ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In with Password
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`flex-1 pb-2 font-semibold text-xs border-b-2 text-center transition-colors ${
              isRegister ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Register New Account
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <>
              <div>
                <label className="font-medium text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Account Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('PATIENT')}
                    className={`p-2 rounded-lg border font-semibold text-center transition-all ${
                      role === 'PATIENT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('DOCTOR')}
                    className={`p-2 rounded-lg border font-semibold text-center transition-all ${
                      role === 'DOCTOR'
                        ? 'bg-sky-50 border-sky-500 text-sky-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Doctor / Physician
                  </button>
                </div>
              </div>

              {role === 'DOCTOR' && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Medical Specialty</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Neurology, Cardiology, General"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="font-medium text-slate-700 block mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="user@mediledger.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs transition-colors mt-2"
          >
            {submitting
              ? 'Processing...'
              : isRegister
              ? 'Complete Registration'
              : 'Sign In to MediLedger'}
          </button>
        </form>
      </div>
    </div>
  );
};
