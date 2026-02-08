
# XRM React (Extensible Relationship Management)

A robust **XRM** starter built with **React + TypeScript + Vite** featuring:

- 🔐 Auth (mock JWT) & Role-based access (RBAC)
- 🧭 React Router v6
- 🧱 Redux Toolkit + redux-persist
- 🎨 MUI theming (light/dark)
- 🌍 i18next (EN/RU)
- 🧩 Entities: Accounts, Contacts, Opportunities, Cases, Activities, **Leads, Campaigns, Invoices**
- 📝 **Real CRUD forms** (react-hook-form + zod) for **Leads, Campaigns, Invoices**
- 📎 **Invoice attachments** with:
  - **Client-side file type filters & validation** (PDF & images, 10 MB)
  - **Cloud storage via presigned URLs (AWS S3)** with fallback to local uploads
  - **Progress bar** and **retries** on upload
  - **Image thumbnails** & **inline PDF previews**
- 🔧 Plugin loader, ⚙️ Workflow engine (demo)
- 📊 Chart.js demo dashboard
- 📦 PWA basics (service worker)
- ✅ Vitest + RTL, ESLint + Prettier, GitHub Actions CI
- 🚀 Optional Express mock API (with CRUD + attachments + presign)

## Quick Start

```bash
# frontend
cd xrm-react
npm install
npm run dev
# open http://localhost:5173
```

Optional mock API server:
```bash
cd server
npm install
npm run dev
# http://localhost:4000
```

`.env` (optional):
```
VITE_API_BASE_URL=http://localhost:4000
```

### Configure S3 (optional, for presigned uploads)
Set these env vars when running the server:
```
S3_BUCKET=your-bucket
S3_REGION=eu-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```
> Ensure your bucket **CORS** allows PUT from your frontend origin and exposes `ETag` headers.

© 2026 XRM React Starter
