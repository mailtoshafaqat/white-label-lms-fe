# Frontend (Next.js 15)

Student and admin web app for the white-label LMS.

## Layout

```
frontend/
├── docs/              # Client proposals, architecture, build tracker
├── src/
│   ├── app/           # App Router pages (/, /admin, /login, …)
│   ├── components/    # UI and landing section components
│   └── lib/           # API client, branding, tenant helpers
├── middleware.ts      # Subdomain → tenant cookie
└── next.config.mjs
```

## Prerequisites

- Node.js 20+
- Backend API running on `http://localhost:5237`

## Quick start

```bash
npm install
npm run dev
```

App: `http://localhost:3000`

Optional env in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5237
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Client documents

Proposals, technical architecture, and build tracker live in `docs/`:

| File | Purpose |
|------|---------|
| `docs/01-Existing-LMS-Features-Reference.md` | Market baseline |
| `docs/02-White-Label-AI-LMS-Proposal.md` | Client proposal |
| `docs/03-Technical-Architecture-LMS.md` | Engineering spec |
| `docs/04-Build-Progress-Tracker.md` | Build status |

See `docs/README.md` for details.

### PDF export

```bash
cd docs
npm install
npm run pdf
```
