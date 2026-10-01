# Quotation Management System (QMS)

A Next.js + TypeScript app for managing logistics quotations across UAE, Qatar, and Oman. Built with Next.js 16, Tailwind CSS, shadcn-style UI, Supabase backend, and deployed on Vercel as a PWA.

> Previous Vite + MUI build is preserved on the `legacy-vite` branch.

## Features

- **Dashboard** — stat cards, freight-award trends (PO / freight / savings), forwarder performance, entity breakdown
- **Quotation Management** — create, edit, approve/reject quotations with multi-forwarder quotes, Lowest/Highest ranking, savings tracking
- **Forwarder Management** — CRUD operations for logistics partner contacts
- **User Management** — role-based access control (Admin, Logistics, Sales) with module permissions
- **Excel Export** — export filtered quotations to Excel
- **PWA** — installable app; static assets cached offline, Supabase API/auth traffic never cached

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, ApexCharts
- **Backend:** Supabase (PostgreSQL + Auth + RLS, via `@supabase/ssr`)
- **Deployment:** Vercel with security headers

## Getting Started

```bash
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a Supabase Auth user whose email exists in `app_users` (or the admin email).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Full-access admin email (default `admin@netceedmea.com`) |

Set the same values in the Vercel project dashboard (Production + Preview).

## Database Setup

Run `supabase_run_me.sql` in the Supabase SQL editor (RLS tables + policies). No migration is needed when deploying over the previous Vite build — same Supabase project.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
