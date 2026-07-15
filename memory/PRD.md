# Agent Live Dashboard — PRD

## Original problem statement (verbatim)
Build a production-ready React web app called "Agent Live Dashboard" — a WhatsApp-themed admin panel that connects to any Supabase project to show live AI agent chats and bookings in real time. Reusable across agencies via env vars only. Deployable to Vercel.

## Stack (locked)
- Vite + React 18
- Tailwind CSS (WhatsApp theme, tokens `wa-*`)
- @supabase/supabase-js v2 (browser client)
- react-router-dom v6 (Live Chats / Bookings / Settings routes)
- No custom backend (FastAPI dir kept but unused)

## Architecture
- `/app/frontend/` is the entire deployable app. Supervisor runs `yarn start` → `vite --host 0.0.0.0 --port 3000`.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (only these two — no code changes per agency).
- Supabase tables consumed: `n8n_chat_histories` (read), `bookings` (read), `dashboard_settings` (read+write).
- Realtime: `postgres_changes` INSERT subscription on `n8n_chat_histories`; `*` on `bookings` and `dashboard_settings`.
- Auth: `supabase.auth.signUp` / `signInWithPassword`; session managed by `onAuthStateChange`. No password/localStorage handling.

## Personas
- **Agency admin**: single user per Supabase project. First visit runs Setup Wizard → Admin Signup → Login. Subsequent visits go straight to dashboard.

## Core requirements (static)
- Zero hardcoded agency/Supabase values in `/src`.
- Read-only RLS on chats/bookings; read+write on `dashboard_settings`.
- WhatsApp-Web layout: 64-px nav rail + 340-px chat sidebar + chat panel; top stats bar; separate Bookings and Settings pages.
- Responsive down to tablet width.

## Implemented (2026-02-15)
- Vite project scaffolded, CRA replaced.
- Components: `LoginScreen`, `AdminSignup`, `SetupWizard`, `Sidebar`, `ChatWindow`, `MessageBubble`, `AiBadge`, `BookingBadge`, `TopStatsBar`, `BookingsPage`, `SettingsPage`.
- `supabaseClient.js` with `isSupabaseConfigured` guard + `ConfigMissing` fallback UI.
- Bootstrap flow: `dashboard_settings.admin_bootstrapped` flag decides Setup Wizard vs Admin Signup vs Login vs Dashboard.
- Sidebar realtime pulse + unread counter, chat auto-scroll, pinned booking summary in chat header.
- Bookings page: month-group collapse, month + status filters, name/phone/session search.
- Settings page: edit `agency_name`, `agency_logo_url`, live logo preview.
- `vercel.json`, `.env.example`, comprehensive README with copy-paste SQL block for user setup.
- Vite build passes (~418 kB JS gzipped ~118 kB), ESLint clean, screenshot verified.

## User setup required (documented in README)
Run the SQL block in Supabase SQL Editor to create `bookings` and `dashboard_settings`, add realtime publications, and apply RLS policies. Confirmed `n8n_chat_histories` already exists in the user's Supabase project.

## Prioritised backlog
- **P1**: Live "typing" indicator or agent presence.
- **P1**: Booking status inline edit (admin can flip pending → confirmed) — currently strictly read-only per spec.
- **P2**: Multi-admin invites (currently one bootstrap admin).
- **P2**: CSV export of bookings.
- **P2**: Optional dashboard i18n (agency-side).

## Next actions
- User: run the README SQL block against Supabase project, then reload the app.
- User: push repo to GitHub and deploy on Vercel with the two env vars.
