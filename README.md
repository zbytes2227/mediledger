# MediLedger

MediLedger is an academic healthcare data-sharing prototype. It demonstrates patient-controlled consent, server-side role-based access control, encrypted medical-record payloads, and a tamper-evident audit trail. It is a conventional Node.js/MongoDB application; it does not use a blockchain and it is not a certified medical or regulatory-compliance product.

## What is implemented

- Patient, doctor, and administrator accounts.
- JWT authentication with seven-day tokens and bcrypt password hashes.
- Patient medical-record creation, encrypted sensitive payloads, viewing, deletion, and JSON export.
- Doctor search for patients and scoped access requests.
- Patient approval, rejection, expiry, and immediate revocation of doctor access.
- Server-side authorization for every protected record operation.
- AES-256-GCM encryption for sensitive record data.
- SHA-256 canonical hash chaining for audit entries, with verification, tamper simulation, and restoration for demonstration.
- Admin statistics, safe user listing, account-status controls, and audit-chain oversight.
- A compliance-information matrix covering HIPAA, GDPR, and India’s DPDP Act, explicitly presented as an academic mapping rather than legal certification.

## Technology stack

| Area | Implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, `lucide-react`, `motion` |
| Backend | Express 4, TypeScript, `tsx` in development, esbuild bundle in production |
| Authentication | JWT (`jsonwebtoken`), bcryptjs password hashing |
| Database | Mongoose 9 with MongoDB Atlas; in-memory arrays when MongoDB is unavailable |
| Cryptography | Node `crypto`: AES-256-GCM and SHA-256 |
| Runtime | Node.js; npm or Bun lockfiles are present |
| Optional metadata | `@google/genai` is listed as a dependency, but no current source file imports or calls it |

## Architecture

The application is a single process that serves both the API and the React application:

```text
Browser
  │  React SPA + localStorage JWT
  ▼
Express server (server.ts)
  ├─ /api/* → server/routes.ts
  │            ├─ auth.ts: JWT verification and RBAC middleware
  │            ├─ crypto.ts: encryption and audit hashing
  │            └─ db.ts: in-memory store + optional MongoDB persistence
  └─ Vite middleware (development) / dist static files (production)
                 │
                 └─ MongoDB Atlas (optional persistence)
```

The store always keeps working data in memory. If `MONGODB_URI` is valid, startup loads users, records, grants, and audit logs from MongoDB and save operations also persist them. If the connection is missing or fails, the server continues in non-persistent in-memory mode.

## Repository layout

```text
server.ts                    Express/Vite entry point and admin seeding
server/auth.ts               JWT creation, verification, authentication, RBAC
server/crypto.ts             AES-GCM helpers and deterministic audit hashing
server/db.ts                 Store, MongoDB synchronization, audit-chain logic
server/models.ts             Domain types and Mongoose schemas/models
server/routes.ts             All API routes and authorization/business workflows
src/main.tsx                 React bootstrap
src/App.tsx                  App shell, navigation, dashboards, modals
src/context/AuthContext.tsx  Token/session state and authenticated fetch helper
src/types.ts                 Frontend domain types
src/components/              Role dashboards, auth, audit, compliance, and modals
vite.config.ts               React/Tailwind/Vite configuration
index.html                   SPA HTML shell and metadata
.env.example                 Required environment-variable template
nextjs-vercel-export/        Deployment notes only; no Next.js source is present
```

## Roles and authorization

`PATIENT` users can manage their own records, respond to grants, review access history, export data, and delete their account. `DOCTOR` users can search active patients, request access, and read records only through an active approved grant matching the patient and category scope. `ADMIN` users can see platform metrics, user summaries, grants, and audit logs, but the API deliberately rejects raw medical-record access for administrators.

Authorization is enforced on the server, not only in the UI. `authenticateUser` requires `Authorization: Bearer <token>`, verifies the JWT, reloads the user from the store, and rejects inactive accounts. `requireRoles(...)` adds role checks and records unauthorized attempts in the audit chain.

## Core workflows

### Registration and login

`POST /api/auth/register` accepts patient or doctor registration data, creates a bcrypt hash, assigns an application ID, assigns a `PAT-####` identifier to patients, writes `USER_REGISTER`, and returns a JWT plus a password-free user object. `POST /api/auth/login` compares the password, rejects non-active accounts, writes success/failure audit events, and returns a seven-day JWT.

The frontend stores the token in `localStorage` under `mediledger_token`. `AuthContext` restores the session through `/api/auth/me`, adds the bearer header through `authFetch`, and clears the token after a 401 response. Logout is client-side token removal plus a server-side `LOGOUT` audit event; JWTs are not server-side revoked.

### Medical records

Patients create records through `POST /api/records`. The server serializes sensitive notes, summary, uploader, and upload time, encrypts that JSON, and stores the resulting ciphertext, IV, authentication tag, and algorithm alongside searchable metadata. Patients can list their own records, open/decrypt them, and delete them. Doctors can list or open records only when a matching approved, unexpired grant covers the patient and record category.

The API returns decrypted data only after authorization and successful GCM authentication. The frontend’s record viewer exposes both a clinical view and a cryptographic payload view; the download button creates a local JSON file from the API response.

### Consent grants

Doctors submit a purpose, requested duration, patient ID/email, and category scope through `POST /api/grants/request`. Patients see their pending requests and can approve with an optional narrower duration/scope, reject, or revoke an existing grant. Approved grants receive an ISO expiration timestamp. A 30-second interval and request-time checks convert expired approvals to `EXPIRED` and append `ACCESS_EXPIRED`.

Grant categories are the record categories in `server/models.ts`, plus `ALL`. The record-list endpoint filters records by the approved grant’s categories, and the single-record endpoint checks the category again before decrypting.

### Audit chain

Every audit entry contains a sequence number, event metadata, actor, optional target, details, previous hash, and entry hash. `canonicalizeObject` sorts object keys, and `computeAuditEntryHash` hashes the pipe-delimited canonical payload with SHA-256. The first entry points to 64 zeroes; each later entry points to the previous entry hash.

`GET /api/audit/verify` recomputes every block and checks sequence and linkage. The UI can demonstrate an alteration with `/api/audit/simulate-tamper`, then restore the in-memory backup with `/api/audit/restore`. This is a teaching tool, not an operational recovery mechanism. MongoDB audit writes are asynchronous, while the in-memory chain is authoritative for the running process.

### Data rights

`GET /api/patient/export` returns a downloadable JSON bundle containing profile data, decrypted records, grants, and patient-related audit history. `POST /api/patient/delete-account` removes the patient’s records, revokes active grants, deactivates and renames the account, and preserves the audit chain by recording an anonymized deletion event rather than deleting historical blocks.

## API reference

All paths below are relative to `/api`. Unless noted otherwise, routes require a bearer JWT.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register patient or doctor |
| POST | `/auth/login` | Public | Authenticate and issue JWT |
| GET | `/auth/me` | Authenticated | Return current safe user |
| POST | `/auth/logout` | Authenticated | Append logout audit event |
| GET | `/patients/search?query=` | Doctor/Admin | Search active patients |
| GET | `/records` | Patient/Doctor | List own records or grant-scoped patient records |
| POST | `/records` | Patient | Encrypt and create a record |
| GET | `/records/:id` | Patient/authorized Doctor | Decrypt and view one record |
| DELETE | `/records/:id` | Patient owner | Delete a record |
| GET | `/grants` | Authenticated | List grants visible to the role |
| POST | `/grants/request` | Doctor | Request patient access |
| POST | `/grants/:id/approve` | Patient owner | Approve and activate grant |
| POST | `/grants/:id/reject` | Patient owner | Reject pending grant |
| POST | `/grants/:id/revoke` | Patient owner/Admin | Revoke grant |
| GET | `/audit` | Authenticated | Role-filtered audit log |
| GET | `/audit/verify` | Authenticated | Verify complete hash chain |
| POST | `/audit/simulate-tamper` | Patient/Admin | Demonstration mutation |
| POST | `/audit/restore` | Patient/Admin | Restore demonstration backup |
| GET | `/patient/export` | Patient | Export decrypted patient bundle |
| POST | `/patient/delete-account` | Patient | Delete records and deactivate account |
| GET | `/admin/stats` | Admin | Platform counts and security status |
| GET | `/admin/users` | Admin | List users without password hashes |
| PATCH | `/admin/users/:id/status` | Admin | Change account status |
| GET | `/compliance/matrix` | Public | Return informational compliance matrix |
| GET | `/health` | Public | Return service and database mode |

## Data model

The Mongoose schemas mirror the TypeScript interfaces in `server/models.ts`:

- `User`: identity, role/status, password hash, patient profile fields, or doctor professional fields.
- `MedicalRecord`: patient ownership, searchable metadata, and `encryptedData` (`ciphertext`, `iv`, `authTag`, `algorithm`).
- `AccessGrant`: patient/doctor relationship, purpose, duration, category scope, status, and lifecycle timestamps.
- `AuditLog`: ordered cryptographic blocks with actor/target metadata and hashes.

Application IDs are custom strings such as `usr_patient_<timestamp>`, `rec_<timestamp>`, and `grant_<timestamp>`; MongoDB’s `_id` also exists. Startup normalizes loaded documents so the application can consistently use `id`.

## Configuration

Copy `.env.example` to `.env` and set:

```dotenv
MONGODB_URI="mongodb+srv://username:password@cluster.example.mongodb.net/mediledger?retryWrites=true&w=majority"
JWT_SECRET="at-least-32-random-characters"
DATA_ENCRYPTION_KEY="64-hex-characters"
PORT="3000"
```

`JWT_SECRET` must be at least 32 characters. `DATA_ENCRYPTION_KEY` must be exactly 64 hexadecimal characters (32 bytes). The encryption key is required even when MongoDB is not configured because record encryption/decryption uses it.

## Running locally

Prerequisites: Node.js with npm (Bun lockfile support is also present) and, for persistence, a reachable MongoDB deployment.

```bash
npm install
cp .env.example .env
# Replace the example secrets and optionally set MONGODB_URI
npm run dev
```

The development server runs the combined Express/Vite application at `http://localhost:3000` by default. Useful commands:

```bash
npm run lint    # TypeScript check without emitting files
npm run build   # Vite frontend build + bundled dist/server.cjs
npm start       # Run the production bundle
npm run preview # Preview Vite output only
npm run clean   # Remove dist and server.js
```

At startup, if no administrator exists, the server seeds `admin@mediledger.local` with password `admin123`. Change or remove this demo credential before any real deployment. The seed is stored in MongoDB when connected, or disappears on restart in in-memory mode.

## Security and operational limitations

This repository demonstrates security mechanisms but is not production-ready clinical software. Important limitations visible in the code include localStorage token storage, no rate limiting or account lockout, no refresh-token/revocation system, no uploaded binary-file storage (attachment fields are metadata and the UI generates JSON downloads), in-memory operation when MongoDB fails, generated timestamp-based IDs, and a demonstration tamper-restore backup held only in memory. MongoDB audit persistence is asynchronous and there is no distributed concurrency control for sequence assignment.

The compliance page is an educational mapping; it does not establish HIPAA, GDPR, DPDP, or any other legal certification. Production use would require a formal threat model, secret management/KMS, TLS and deployment hardening, validation and testing, monitoring, backup/restore procedures, privacy/legal review, and clinical/regulatory controls.

## Frontend behavior

`App.tsx` provides the shell and switches among dashboard, audit, and compliance views. `Navbar` changes labels by role and opens authentication/deployment modals. `PatientDashboard` manages records, grants, export, deletion, and record viewing. `DoctorDashboard` handles patient search, access requests, active grants, and record access. `AdminDashboard` loads metrics/users/grants/audit data, changes user status, and runs chain demonstrations. `AuditLogViewer` filters and expands role-visible logs. `CompliancePage` renders the API-provided framework matrix. Styling is primarily Tailwind utility classes imported from the one-line `src/index.css`.

## Deployment notes

Production mode serves the Vite output from `dist` and falls back all non-API paths to `dist/index.html`. The repository’s actual deployment target is this Node/Express process. `nextjs-vercel-export/README.md` and the in-app “Vercel / Next.js” modal describe a proposed Next.js/Vercel direction, but no `next.config`, `app/`, `pages/`, or serverless API implementation exists here; those instructions should not be treated as a runnable Next.js export.

## Source of truth

This README is derived from the current TypeScript source, package manifest, environment template, Vite configuration, and both existing deployment notes. When behavior changes, update the relevant route/model/component and this document together.

