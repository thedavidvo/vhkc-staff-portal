# VHKC Staff Portal

Internal staff portal for managing VHKC seasons, drivers, check-in, incidents, licenses, race data, points, standings, teams, and reports.

The app is built with Next.js App Router, TypeScript, Tailwind CSS, and Neon Postgres.

## Overview

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Database**: Neon Postgres via `@neondatabase/serverless`
- **UI**: Tailwind CSS + Lucide icons
- **Auth**: Environment variable login

## Current Modules

- **Available**: Dashboard, Season, Drivers, Check In, Payments, License, Incidents, Races, Results, Points, Divisions, Standings, Teams, Reports, Locations
- **Coming soon / disabled**: Compare

## Project Structure

```text
vhkc-staff-portal/
├── app/                  # App Router pages and API routes
├── components/           # Shared UI and modal components
├── lib/                  # Database helpers, services, auth, utilities
├── scripts/              # DB init and migration scripts
├── public/               # Static assets
├── types/                # Shared TypeScript types
├── QUICKSTART.md         # Neon setup quick guide
└── AUTH_SETUP.md         # Authentication setup guide
```

## Environment Variables

Create `.env.local` in the project root.

### Required

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_password
```

### Optional / migration-related

If you still migrate data from Google Sheets, keep the existing Sheets credentials used by your local setup.

See `AUTH_SETUP.md` for authentication details.

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Initialize the database

```bash
npm run init-db
```

### 3. Apply focused schema migrations as needed

```bash
npm run migrate-incidents-licenses
npm run migrate-fks
```

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database Setup Notes

The schema is created in `lib/db.ts`, and additional maintenance migrations live in `scripts/`.

Useful commands:

```bash
npm run init-db
npm run migrate
npm run migrate-incidents-licenses
npm run migrate-fks
npm run migrate-sql -- scripts/your-file.sql
```

### What these do

- **`npm run init-db`**: Creates the base Neon schema
- **`npm run migrate`**: Migrates data from Google Sheets into Neon
- **`npm run migrate-incidents-licenses`**: Backfills incident/license tables for older databases
- **`npm run migrate-fks`**: Adds foreign keys safely using `NOT VALID`
- **`npm run migrate-sql -- <file>`**: Runs any SQL migration file via the local TypeScript runner

## NPM Scripts

```bash
npm run dev
npm run build
npm run start
npm run init-db
npm run migrate
npm run migrate-add-points
npm run migrate-add-mobile
npm run migrate-incidents-licenses
npm run migrate-sql -- scripts/file.sql
npm run migrate-fks
npm run migrate-rounds-location-id
npm run migrate-remove-rounds-name
npm run migrate-remove-fields
npm run import-drivers-csv
```

## Authentication

Authentication is handled by environment variables and the login route.

- Login page: `/login`
- API route: `/api/auth/login`
- Setup guide: `AUTH_SETUP.md`

## Feature Notes

### Incidents and Licenses

- Incident management is backed by `incidents`, `licenses`, and `license_points_history`
- License history now enforces foreign keys against real incidents
- Empty licenses for new drivers are created without fake history rows

### Payments

- Payment management is available from the `Payments` page
- Payment-related tables may not exist in all older databases and may require `npm run init-db`

## Validation / Tooling Notes

- `npm run lint` may prompt for ESLint setup if linting has not been configured locally yet
- A full `npx tsc --noEmit` can still fail on unrelated existing issues outside the file you are working on

## Deployment

This app is intended to run as a server-backed Next.js application.

Recommended deployment targets:

- Vercel
- Any Node.js host that supports Next.js App Router and environment variables

When deploying, make sure these are configured in the target environment:

- `DATABASE_URL`
- `AUTH_USERNAME`
- `AUTH_PASSWORD`

## Related Docs

- `QUICKSTART.md` — quick Neon setup flow
- `AUTH_SETUP.md` — auth configuration and troubleshooting

## Ownership

This repository is private and proprietary.
