# MediLedger - Deploy to Vercel (Next.js App Router)

This folder contains the complete Next.js (App Router) configuration and architecture documentation for deploying **MediLedger** to Vercel with MongoDB Atlas.

## 🚀 1-Click Vercel Deployment Guide

### Prerequisites
1. Free **MongoDB Atlas** cluster ([mongodb.com/atlas](https://www.mongodb.com/atlas)).
2. Free **Vercel** account ([vercel.com](https://vercel.com)).

### Step 1: Environment Variables on Vercel
Set these in your Vercel Project Settings > Environment Variables:

| Variable Name | Value Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:pass@cluster0.mongodb.net/mediledger?retryWrites=true&w=majority` |
| `JWT_SECRET` | 32+ character random secret string | `mediledger-production-jwt-secret-key-32chars` |
| `DATA_ENCRYPTION_KEY` | 64-character hex string (32 bytes) for AES-256-GCM | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |

### Step 2: Push to GitHub & Import to Vercel
1. Clone or export this repository to GitHub.
2. In Vercel, click **Add New Project** -> **Import Git Repository**.
3. Select this repository.
4. Keep the default build settings (`npm run build`, output `.next`).
5. Click **Deploy**. Vercel will build and launch your live URL in under 2 minutes!

---

## 🛡️ Security Architecture Highlight for Academic Defense
- **AES-256-GCM Encryption**: Electronic Protected Health Information (ePHI) encrypted at rest with random 96-bit IVs and authentication tags.
- **Hash-Chained Tamper-Evident Audit Log**: Every login, record creation, doctor access, grant approval/revocation is cryptographically chained with SHA-256. No blockchain overhead.
- **Time-Limited Scoped Consent**: Doctor access expires automatically and can be revoked by the patient instantly with immediate cutoff.
- **Data Principal Rights**: JSON data export (GDPR Art 20) and right to erasure (GDPR Art 17) with audit chain integrity preservation.
