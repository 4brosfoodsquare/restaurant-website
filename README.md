# 4 Bros Food Square

A production-ready restaurant website, online ordering system, and restaurant
admin dashboard — built for a specialist Indian non-vegetarian kitchen
(biriyani, kabab, chilli chicken).

This is a **completely independent project** — it shares no code, branding,
configuration, or business logic with any other project.

> **Status:** initial build complete and locally verified (backend + frontend
> tests passing, linted, built, and manually driven through a real browser).
> Not yet pushed to the remote repository — see [Finalizing](#finalizing)
> below.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Admin Access](#admin-access)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [Build](#build)
- [Deployment](#deployment)
- [Business Information Still Needed](#business-information-still-needed)
- [Finalizing](#finalizing)

## Technology Stack

**Backend** — Node.js, Express 5, SQLite (`better-sqlite3`), JWT + rotating
refresh-token cookies for auth, `zod` for validation, `multer` for image
uploads, `express-rate-limit`, `helmet`.

**Frontend** — React 19, Vite, React Router 7. No CSS framework — a small
hand-built design system (`frontend/src/styles/`) driven by CSS custom
properties, built from the restaurant's own logo colors.

**Testing** — Node's built-in test runner + `supertest` (backend), Vitest +
Testing Library (frontend).

There is no online payment integration in this build by design (see
[Payment Architecture](#payment-architecture) below) and no build framework
beyond Vite — kept intentionally minimal.

## Project Structure

```
backend/
  src/
    config/        environment configuration, secret validation
    db/            SQLite connection, migrations, seed data
    middleware/     auth, validation, error handling
    modules/        one folder per domain: auth, categories, menu, orders,
                     settings, uploads, users — each with
                     *.routes.js / *.service.js / *.repository.js / *.schemas.js
    utils/          password hashing, id/slug generation, boolean coercion,
                     audit logging
  tests/            backend test suite (node --test + supertest)
  uploads/          uploaded menu/category images (gitignored)
  data/             SQLite database file (gitignored)

frontend/
  src/
    pages/customer/   Home, Menu, Item detail, Cart, Checkout, Confirmation,
                       Order status, About, Contact, 404
    pages/admin/       Login, Dashboard, Orders, Menu, Categories, Staff, Settings
    components/        customer/, admin/, shared/ — reusable UI pieces
    context/           Cart, Auth, Settings React contexts
    layouts/           CustomerLayout, AdminLayout, route guards
    lib/               API client, money formatting, diet labels
    styles/            design tokens + base stylesheet
  public/
    brand/             the restaurant's real logo (see below)

docs/                  deployment guide, business-info checklist
```

### The logo

`frontend/public/brand/logo.png` is the restaurant's real logo — recovered
from this session's own transcript (Claude Code stores image attachments as
embedded data) and used exactly as provided: cropped only to remove the
surrounding photo background, never redrawn, recolored, or redistorted.
`logo-original.jpg` keeps the untouched source photo. If a studio-quality
logo file (transparent PNG/SVG) becomes available later, it can simply
replace these two files — no code changes needed.

## Getting Started

Requires Node.js ≥ 20.11 (see `.nvmrc`).

```bash
npm run install:all      # installs backend + frontend dependencies

cp backend/.env.example backend/.env
# edit backend/.env — at minimum set real values for
# JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (see the file for how to generate
# them) and SEED_ADMIN_PASSWORD before you seed the database

npm run db:migrate
npm run db:seed

npm run dev:backend      # http://localhost:4000
npm run dev:frontend     # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173 for the customer site and
http://localhost:5173/admin/login for the admin dashboard.

## Environment Variables

All backend configuration lives in `backend/.env` (never committed — see
`backend/.env.example` for the full annotated list). The important ones:

| Variable | Purpose |
|---|---|
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Required, ≥32 random chars each, must differ. Server refuses to boot in production without them. |
| `DATABASE_FILE` | Path to the SQLite file. |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins. |
| `COOKIE_SAME_SITE`, `TRUST_PROXY` | Set when the frontend and API are on different domains/behind a proxy in production. |
| `UPLOAD_DIR`, `MAX_UPLOAD_BYTES` | Where menu/category images are stored and the per-file size cap. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | The owner account `npm run db:seed` creates. Change the password immediately after first login in any real deployment. |

The frontend has no build-time secrets — it only ever talks to `/api/*` on
the same origin (or wherever `vite.config.js`'s dev proxy / your production
reverse proxy points it).

## Database

SQLite via `better-sqlite3`, file-based (no separate database server to run).
Schema lives in `backend/src/db/migrations/001_initial_schema.sql`.

```bash
npm run db:migrate   # applies any not-yet-applied migration, safe to re-run
npm run db:seed       # idempotent: creates the owner account, default
                       # settings, and demo categories/menu items if missing
npm run db:reset       # DEV ONLY — deletes the database file; refuses to run
                        # if NODE_ENV=production
```

Money is stored as **integer minor units** (paise) throughout — never as a
float — and every order line snapshots its name/category/price at the moment
of purchase, so editing the menu later never rewrites historical orders.

## Admin Access

After seeding, log in at `/admin/login` with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` from `backend/.env` (defaults: `owner@example.com` /
`ChangeMe!2024` — **change this password immediately** via the account menu
in any environment beyond your own machine).

Three roles, enforced server-side on every request (never just hidden UI):

- **Owner** — full access, including creating/managing admin and owner accounts.
- **Admin (Manager)** — orders, menu, categories, settings; can create/manage
  staff accounts only.
- **Staff** — orders (view + progress status), menu availability toggling,
  read-only settings. No access to categories or staff management.

## Development Commands

Run from the repo root unless noted:

```bash
npm run dev:backend       # backend dev server (auto-restart on change)
npm run dev:frontend      # frontend dev server (Vite, HMR)
npm run lint              # eslint, backend + frontend
npm test                  # full test suite, backend + frontend
npm run build              # production frontend build -> frontend/dist
npm run verify              # lint + test + build, in that order
```

## Testing

- **Backend** (`backend/tests/`, `node --test`): every module — auth, menu,
  categories, orders, settings, uploads, users — with a fresh isolated SQLite
  database per test file. Covers the security-critical paths specifically:
  RBAC per role, server-authoritative order pricing, availability
  enforcement, idempotent order submission, the order status state machine,
  password reset vs. self-service change, image-upload content-type
  spoofing.
- **Frontend** (`frontend/src/**/__tests__/`, Vitest + Testing Library): cart
  logic, the API client's token-refresh/retry behavior, and key components.
  Includes two deliberate regression tests for real bugs found and fixed
  during this build (see commit history) — a SQLite-boolean-coercion bug and
  a refresh-token race condition.

This project was also manually driven through a real browser (Playwright,
against the actual dev servers) for the full customer and admin flows, a
responsive sweep across 4 breakpoints, and a WCAG 2 A/AA audit
(`axe-core`) — not just unit-tested in isolation. See the commit history for
what that surfaced and how it was fixed.

## Build

```bash
npm run build
```

Produces `frontend/dist/` — a static site (code-split per route) ready to
serve from any static host or CDN. The backend is not part of this build; it
runs as its own Node process (see [Deployment](#deployment)).

## Deployment

The frontend (static) and backend (a long-running Node/Express process) need
**separate hosting** — Netlify serves static sites, not persistent Node
servers. See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full guide,
including the Netlify configuration already in this repo
(`frontend/netlify.toml`) and what to set up on the API side.

**The repository is technically deployment-ready but nothing has been
deployed.** No Netlify site is connected, and no production build has been
pushed anywhere, per explicit instruction — deployment happens only after
review and an explicit go-ahead.

### Payment Architecture

No online payment provider is integrated in this build — checkout collects
an order with `payment_method: pay_on_collection`. The `payments` table and
`orders.payment_status`/`payment_method` columns already exist, unused, so a
provider (Razorpay, Stripe, etc.) can be added later without a schema
migration or rebuild — see the comments in
`backend/src/db/migrations/001_initial_schema.sql`.

## Business Information Still Needed

Every piece of real business data (name confirmation, address, phone,
actual menu items and prices, tax rate, delivery charges, cancellation
policy, payment provider) is currently a clearly-marked placeholder — see
**[docs/BUSINESS_INFO_NEEDED.md](docs/BUSINESS_INFO_NEEDED.md)** for the full
checklist of what to provide before this goes live, and where in the admin
dashboard each one gets entered.

## Finalizing

This repository's remote (`origin`) has **not** been touched — every commit
so far is local-only on the working branch, per explicit instruction. Once
you've reviewed the build and are ready, say so and the branch will be
pushed.
