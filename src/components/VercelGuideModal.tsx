import React from 'react';
import { X, Server, ExternalLink, CheckCircle2, Copy, Terminal, ShieldCheck } from 'lucide-react';

interface VercelGuideModalProps {
  onClose: () => void;
}

export const VercelGuideModal: React.FC<VercelGuideModalProps> = ({ onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const envSample = `MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/mediledger?retryWrites=true&w=majority"
JWT_SECRET="mediledger-secure-session-secret-key-btech-demo-2026"
DATA_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
              ▲
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Deploy MediLedger to Vercel (Next.js)</h3>
              <p className="text-[11px] text-slate-500">Turnkey Next.js App Router & MongoDB Atlas deployment guide</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-slate-700">
          {/* Step 1 */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">1</span>
              Step 1: MongoDB Atlas Database (Free Tier)
            </h4>
            <p className="text-slate-600 mb-2">
              Create a free cluster at <a href="https://mongodb.com/atlas" target="_blank" rel="noreferrer" className="text-sky-600 underline">mongodb.com/atlas</a>. Whitelist IP address <code className="bg-white px-1 rounded border">0.0.0.0/0</code> (Allow access from anywhere for Vercel serverless functions).
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">2</span>
                Step 2: Vercel Environment Variables
              </h4>
              <button
                onClick={handleCopyEnv}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-medium text-slate-700 flex items-center gap-1 hover:bg-slate-100"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy Variables'}
              </button>
            </div>
            <p className="text-slate-600 mb-2">
              In your Vercel Project Dashboard, navigate to <strong>Settings &gt; Environment Variables</strong> and paste:
            </p>
            <pre className="bg-slate-900 text-sky-300 p-2.5 rounded text-[11px] overflow-x-auto font-mono">
{envSample}
            </pre>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">3</span>
              Step 3: Push Repository & Deploy in 1 Click
            </h4>
            <p className="text-slate-600 mb-2">
              Export this project to GitHub from the top settings menu, then in Vercel click <strong>Import Git Repository</strong> and <strong>Deploy</strong>. Vercel automatically bundles the API route handlers and static assets in under 60 seconds!
            </p>
          </div>

          {/* Academic Highlights */}
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-900">
            <span className="font-bold flex items-center gap-1 mb-1">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              Academic Defense Readiness Checklist:
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Zero Blockchain Dependencies: 100% conventional Mongoose & Node.js crypto hash-chaining.</li>
              <li>Dual Mode Storage: Runs in-memory out of the box, auto-upgrades to MongoDB Atlas if URI is set.</li>
              <li>Tamper-Evident Proof: Interactive tamper attack simulation demonstrates instant algorithmic detection.</li>
              <li>Patient Privacy Rights: Time-limited access grants, instant revocation, and JSON data export.</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
