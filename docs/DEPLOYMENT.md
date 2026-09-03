# Deployment Guide

This app has two independently deployable pieces:

- **Frontend** (`frontend/`) — a static site (Vite build output). Netlify,
  Vercel, Cloudflare Pages, or any static host/CDN works.
- **Backend** (`backend/`) — a long-running Node/Express process with a
  SQLite file on disk. Netlify does **not** run this — it needs a host that
  keeps a Node process alive (Render, Fly.io, Railway, a VPS, etc.).

Nothing in this repository has been deployed. This document describes how
to, when you're ready.

## 1. Backend

Any Node host that runs `npm install && npm start` from the `backend/`
directory works. Two things matter beyond that:

**Persistent disk.** The SQLite database (`DATABASE_FILE`) and uploaded
images (`UPLOAD_DIR`) must live on storage that survives redeploys — an
ephemeral filesystem (some free-tier serverless platforms) will silently
lose all orders and menu photos on the next deploy. Look for "persistent
disk" / "volume" support when choosing a host. For genuinely serverless
hosting, better-sqlite3's file-per-process model doesn't fit at all — that
would need a real hosted database (Postgres, etc.), which is a bigger
change than this deployment step and isn't needed for a single-instance
restaurant site.

**Environment variables.** Set every value from `backend/.env.example` on
the host, especially:

- `NODE_ENV=production` — the server refuses to boot without strong
  `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` in this mode (by design).
- `CORS_ORIGINS` — the exact frontend origin(s), e.g.
  `https://your-site.netlify.app,https://yourdomain.com`.
- `PUBLIC_API_URL` — the backend's own public URL, used to build absolute
  image URLs for uploaded menu photos.
- `TRUST_PROXY=true` — set this if the host puts the app behind a reverse
  proxy/load balancer (most do), so `secure` cookies and rate limiting see
  the real client IP.
- `COOKIE_SAME_SITE=none` — required if the frontend and backend end up on
  **different domains** (the common case: frontend on Netlify, backend on
  Render/Fly/Railway). Requires HTTPS on both sides, which those hosts give
  you by default. Leave it at the default (`lax`) only if you reverse-proxy
  both under one domain (see §3).

Then, once, on the deployed backend:

```bash
npm run db:migrate
npm run db:seed     # creates the owner account from SEED_ADMIN_* env vars
```

Log in and **change the seed password immediately** — it's a placeholder,
not a real credential.

## 2. Frontend (Netlify)

`frontend/netlify.toml` is already set up: build command, publish
directory, Node version, and the SPA redirect rule every client-side-routed
app needs (`/*` → `/index.html`) — without it, a direct link or refresh on
any route other than `/` 404s on static hosting.

To connect it:

1. In Netlify, "Add new site" → point at this repository, branch as
   appropriate. The base directory (`frontend`) and build settings are
   read from `netlify.toml` automatically.
2. If the backend is on a **different domain** than the Netlify site, set
   the `VITE_API_URL` environment variable in Netlify's site settings to
   the backend's public URL (e.g. `https://api.yourdomain.com`) — this is
   a **build-time** variable (Vite bakes it into the built JS), so changing
   it requires a rebuild, not just a redeploy of the same artifact.
   Leave it unset if you're using the same-domain reverse-proxy setup in §3.
3. Trigger the deploy.

**Do not connect or trigger any of this until you've explicitly approved
it** — it's documented here so it's ready when you are, not to imply it
should happen automatically.

## 3. Alternative: same domain for both

Instead of `VITE_API_URL` + cross-origin cookies, you can reverse-proxy
`/api/*` and `/uploads/*` on your main domain to the backend host (e.g. an
Nginx/Cloudflare rule, or your DNS/CDN provider's path-based routing) so
the browser sees everything as one origin. This keeps `COOKIE_SAME_SITE=lax`
(simpler, slightly more defense against CSRF) and avoids the `VITE_API_URL`
build variable entirely. Whether this is worth the extra infrastructure
piece depends on your hosting choice — most teams find the cross-origin
setup in §1/§2 simpler to operate.

## 4. Post-deploy checklist

- [ ] Backend health check responds: `curl https://api.yourdomain.com/api/health`
- [ ] `npm run db:migrate && npm run db:seed` run once against the
      production database
- [ ] Logged in as the seed owner account and **changed the password**
- [ ] Real restaurant details entered in Admin → Settings (see
      [BUSINESS_INFO_NEEDED.md](./BUSINESS_INFO_NEEDED.md)) — the seed data
      is entirely placeholder content
- [ ] Placed a real test order end-to-end (menu → cart → checkout →
      confirmation → admin order detail → status update) against the live
      deployment, not just locally
- [ ] Confirmed uploaded menu images persist across a redeploy (tests the
      persistent-disk requirement from §1)
- [ ] `CORS_ORIGINS` on the backend matches the actual deployed frontend
      URL exactly (scheme + host, no trailing slash)
