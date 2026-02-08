
# XRM React (Extensible Relationship Management)

A robust **XRM** starter built with **React + TypeScript + Vite** featuring:

- 🔐 Auth (mock JWT) & Role-based access (RBAC)
- 🧭 React Router v6
- 🧱 Redux Toolkit + redux-persist
- 🎨 MUI theming (light/dark)
- 🌍 i18next (EN/RU)
- 🧩 Entities: Accounts, Contacts, Opportunities, Cases, Activities, **Leads, Campaigns, Invoices**
- 📝 Real CRUD forms (react-hook-form + zod validation) for **Leads, Campaigns, Invoices**
- 🔧 Plugin loader, ⚙️ Workflow engine (demo)
- 📊 Chart.js demo dashboard
- 📦 PWA basics (service worker)
- ✅ Vitest + RTL, ESLint + Prettier, GitHub Actions CI
- 🚀 Optional Express mock API (with CRUD for new modules)

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

© 2026 XRM React Starter
