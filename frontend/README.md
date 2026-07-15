# Agent Live Dashboard

A production-ready React web app (Vite + Tailwind + Supabase) that gives travel agencies a live WhatsApp-themed admin panel over their existing n8n AI agent workflow. Deploy the exact same repo per agency — only the Supabase env vars change.

---

## 1 — Prerequisites

You already have a Supabase project running your n8n WhatsApp AI agent workflow, and that workflow writes conversations into a `n8n_chat_histories` table with this shape:

| column      | type    |
|-------------|---------|
| id          | int4 (pk) |
| session_id  | varchar (customer phone) |
| message     | jsonb  `{ "type": "human" \| "ai", "content": "..." }` |

You have your Supabase **Project URL** and **anon (public) key** ready from  *Supabase → Project Settings → API*.

---

## 2 — Prepare the Supabase database (one-time)

Open **Supabase → SQL Editor** and run this single block. It creates the two tables the dashboard needs, enables realtime for chats, and sets read-only RLS for chats/bookings + read/write RLS for settings.

```sql
-- Bookings written by your n8n workflow
create table if not exists bookings (
  id             uuid primary key default gen_random_uuid(),
  session_id     varchar,
  customer_name  text,
  phone          text,
  destination    text,
  travel_date    date,
  amount         numeric,
  status         text check (status in ('confirmed','cancelled','pending')),
  created_at     timestamptz default now()
);
create index if not exists bookings_session_id_idx on bookings(session_id);
create index if not exists bookings_created_at_idx on bookings(created_at);

-- Dashboard branding + admin bootstrap flag (used by this app only)
create table if not exists dashboard_settings (
  id                  int4 primary key default 1,
  agency_name         text,
  agency_logo_url     text,
  admin_bootstrapped  boolean default false
);

-- Realtime for chats
alter publication supabase_realtime add table n8n_chat_histories;
alter publication supabase_realtime add table bookings;

-- RLS: read-only for chats and bookings
alter table n8n_chat_histories enable row level security;
drop policy if exists "dashboard_read_chats" on n8n_chat_histories;
create policy "dashboard_read_chats" on n8n_chat_histories for select using (true);

alter table bookings enable row level security;
drop policy if exists "dashboard_read_bookings" on bookings;
create policy "dashboard_read_bookings" on bookings for select using (true);

-- RLS: read+write for settings
alter table dashboard_settings enable row level security;
drop policy if exists "dashboard_read_settings" on dashboard_settings;
drop policy if exists "dashboard_write_settings" on dashboard_settings;
create policy "dashboard_read_settings" on dashboard_settings for select using (true);
create policy "dashboard_write_settings" on dashboard_settings for all using (true) with check (true);
```

> The dashboard only ever needs **SELECT** on `n8n_chat_histories` and `bookings`. Do not grant INSERT/UPDATE/DELETE on those two tables to the anon role.

---

## 3 — Local development

```bash
npm install
cp .env.example .env
# Edit .env and paste:
#   VITE_SUPABASE_URL=https://<your-project>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<your anon key>
npm run dev
```

Open http://localhost:3000. The first visit runs the **Setup Wizard** (agency name + optional logo) and then the **Admin Signup** (real email + password). Both are stored in your Supabase project — nothing is hardcoded.

---

## 4 — Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Under **Environment Variables** (during import or later in *Project Settings → Environment Variables*) add:

   | Key                        | Value |
   |----------------------------|-------|
   | `VITE_SUPABASE_URL`        | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY`   | your Supabase anon / public key |

4. Click **Deploy**. Vercel auto-detects Vite (`vercel.json` is included) and gives you a live URL.
5. Open the live URL: complete the **Setup Wizard** (agency name) and create the **admin login** (email + password). Nothing is pre-filled.

---

## 5 — Reusing this repo for another agency

Duplicate the repo (or reuse it with a new Vercel project) and point the two env vars at the new agency's own Supabase project. Deploy. Completely separate data and login per agency, zero code changes.

---

## 6 — File map

```
src/
  lib/supabaseClient.js       ← reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
  components/
    SetupWizard.jsx           ← first-run: agency name + logo
    AdminSignup.jsx           ← first-run: create the admin login
    LoginScreen.jsx           ← email/password sign-in
    Sidebar.jsx               ← distinct session_id list + realtime pulse
    ChatWindow.jsx            ← full message thread + pinned booking badge
    MessageBubble.jsx         ← human / AI bubble
    AiBadge.jsx               ← "AI" pill with robot icon
    BookingBadge.jsx          ← Confirmed / Cancelled / Pending pill
    TopStatsBar.jsx           ← Monthly confirmed / cancelled / active chats
    BookingsPage.jsx          ← grouped by month + filters + search
    SettingsPage.jsx          ← edit agency name & logo any time
  App.jsx / main.jsx / index.css
.env.example
vercel.json
```

## 7 — Hard rules honoured

- No agency name, logo, email, password, Supabase URL, or anon key hardcoded anywhere in `src/`.
- No raw passwords in localStorage — session is managed by `supabase.auth`.
- Read-only RLS on chats and bookings.
- Realtime uses `postgres_changes` subscriptions — no polling / `setInterval`.
- Responsive down to tablet width.
