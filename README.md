# Daily WhatsApp Challenge

Premium black + green platform where users complete WhatsApp status tasks and get paid, and businesses run status ad campaigns.

## Pages

- `/` — Homepage (hero, 2 categories, carousel)
- `/login` — Unified login (users, business, super admin)
- `/signup-user` — Multi-step user signup (terms → about → generated username/password)
- `/signup-business` — Business signup
- `/dashboard` — User dashboard (wallet, tasks, withdrawals, referrals)
- `/business` — Business dashboard (package, campaigns)
- `/admin` — Super Admin control panel (users, tasks, submissions, businesses, campaigns, withdrawals, settings)

## Super admin

- Username: `shahasad5656`
- Password: `shahasad@challenge`

Hardcoded in `src/lib/session.ts`.

## Backend (Supabase via GitHub sync)

This project uses Supabase's GitHub integration. Push to your linked GitHub repo and Supabase will automatically run migrations under `supabase/migrations/` on your project.

### 1. Set env vars

Create `.env` in the project root:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
```

Get these from **Supabase → Project Settings → API**.

For Vercel/Netlify/etc, add the same env vars to your deployment platform.

### 2. Push to GitHub

`supabase/migrations/20260101000000_init.sql` is auto-applied by Supabase on push. It creates:

`app_users`, `businesses`, `tasks`, `task_assignments`, `campaigns`, `withdrawals`, `wallet_history`, `settings`.

Auth model: **plaintext credentials, no Supabase Auth** (as requested — harden later before production). Data API `anon` role has full CRUD; RLS is not enabled.

### 3. First-run admin setup

Log in as super admin → **Settings** tab and configure:

- UPI ID (for QR codes)
- Terms Google Docs URL, About Google Docs URL, Rejection terms URL
- 2 carousel image Google Drive links
- Business package details
- Referral % · Max free tasks per user

Then add tasks in the **Tasks** tab.

## Image handling

All images (task creatives, proof screenshots, ad creatives, carousel) accept **Google Drive share URLs** (`https://drive.google.com/file/d/…/view`). The client auto-converts to direct-view URLs. Users are instructed to set "Anyone with the link".

## Publishing

Sync to GitHub and deploy the frontend to Vercel/Netlify. Configure the two `VITE_*` env vars on the platform. Supabase applies migrations automatically on the same push.
