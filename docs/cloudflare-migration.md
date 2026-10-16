# Cloudflare Deployment & Migration Guide

This project has been migrated from Vercel to **Cloudflare Workers & Pages** (Cloudflare's unified architecture with static assets).

---

## Architecture

- **Frontend (SPA)**: React 18 + Vite 6 built to `apps/web/dist`.
  - Hosted globally on Cloudflare edge CDN.
  - SPA client routing handled natively via Wrangler assets SPA configuration (`not_found_handling = "single-page-application"` in `wrangler.toml`).
- **Backend (API)**: Fastify 5 + Prisma 6 running in Cloudflare Workers via [`apps/api/src/cloudflare.ts`](file:///apps/api/src/cloudflare.ts).
  - Uses Cloudflare `nodejs_compat` runtime.
  - Prisma connects to Postgres (Supabase) via `@prisma/adapter-pg` over Cloudflare TCP sockets (`cloudflare:sockets`).
  - Scheduled retention sweep runs natively via Cloudflare Cron Triggers (`0 3 * * *`), replacing Vercel Crons.

---

## 1. Prerequisites

1. Install Wrangler (already added to project `devDependencies`).
2. Log in to your Cloudflare account:
   ```bash
   npx wrangler login
   ```

---

## 2. Configure Cloudflare Secrets & Environment Variables

Cloudflare keeps sensitive credentials separate from public code. Run the following commands to set each secret in your Cloudflare Worker:

```bash
# 1. Postgres Connection string (Supabase session pooler on port 5432)
npx wrangler secret put DATABASE_URL

# 2. JWT secret (at least 16 random characters)
npx wrangler secret put JWT_SECRET

# 3. Supabase URL & Service Role Key (for private video uploads)
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# 4. Optional: Shared secret for internal retention API
npx wrangler secret put CRON_SECRET

# 5. Optional: Groq / OpenAI LLM API key for AI support bot
npx wrangler secret put SUPPORT_LLM_API_KEY
```

> **Note:** Non-sensitive variables (`NODE_ENV`, `MEDIA_PROVIDER=supabase`, `SUPABASE_STORAGE_BUCKET=submissions`, `SUPPORT_LLM_MODEL`) are already configured in [`wrangler.toml`](file:///wrangler.toml).

---

## 3. Build & Deploy

To build the database client, compile the web assets, and deploy to Cloudflare:

```bash
npm run deploy:cloudflare
```

This runs:
1. `npm run db:generate` (Prisma client generation)
2. `npm run build -w @skillflex/web` (Vite SPA production build)
3. `wrangler deploy` (bundles the Cloudflare Worker and uploads static assets)

---

## 4. Local Testing with Cloudflare Workers

To preview the application locally using Cloudflare's local runtime simulator:

```bash
npm run dev:cloudflare
```

---

## 5. Alternative: Cloudflare Pages Git Integration

If you connect your GitHub repository directly to Cloudflare Pages / Workers in the Cloudflare Dashboard:

- **Build command**: `npm run cloudflare-build`
- **Build output directory**: `apps/web/dist`
- **Root directory**: `/` (repo root)
- **Environment variables**: Add `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MEDIA_PROVIDER=supabase`, `NODE_ENV=production` in the project settings.
