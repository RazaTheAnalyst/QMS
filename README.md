# Quotation Management System (QMS)

A React + TypeScript SPA for managing logistics quotations across UAE, Qatar, and Oman. Built with Vite, Material UI, Supabase backend, and deployed on Vercel as a PWA.

## Features

- **Dashboard** — Analytics with stats cards, forwarder performance, entity breakdown
- **Quotation Management** — Create, edit, approve/reject quotations with multi-forwarder quotes
- **Forwarder Management** — CRUD operations for logistics partner contacts
- **User Management** — Role-based access control (Admin, Logistics, Sales) with module permissions
- **Excel Export** — Export quotations to Excel for reporting
- **PWA** — Installable progressive web app with offline caching

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Material UI 5
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Deployment:** Vercel with security headers and SPA routing

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Database Setup

Run the SQL migrations in Supabase SQL editor in order:

1. `supabase_app_users.sql` — Users table, roles, and RLS policies
2. `supabase_rls_quotations_forwarders.sql` — RLS policies for quotations and forwarders tables

## Security

- Row Level Security (RLS) enforced on all database tables
- Server-side authorization via Supabase RLS policies
- Client-side access control for UI hints only (not security-critical)
- Content Security Policy configured in `vercel.json`
- Auth tokens stored in cookies with `SameSite=Lax` and `Secure` (on HTTPS). Note: cookies are set from the client, so they are not `httpOnly`; access is further limited by the Content Security Policy and the service worker never caches API responses.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
