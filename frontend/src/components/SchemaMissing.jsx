import { Database, RefreshCw, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const SETUP_SQL = `-- Bookings written by your n8n workflow
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

-- Dashboard branding + admin bootstrap flag
create table if not exists dashboard_settings (
  id                  int4 primary key default 1,
  agency_name         text,
  agency_logo_url     text,
  admin_bootstrapped  boolean default false
);

-- Customer names linked to session_id (populated by n8n workflow)
create table if not exists customers (
  session_id    varchar primary key,
  customer_name text,
  updated_at    timestamptz default now()
);

-- AI on/off per chat (used by the dashboard's manual-handoff feature)
create table if not exists chat_status (
  session_id  varchar primary key,
  ai_enabled  boolean default true,
  paused_by   text,
  updated_at  timestamptz default now()
);

-- Realtime
alter publication supabase_realtime add table n8n_chat_histories;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table chat_status;

-- RLS: read-only for chats, bookings, customers; read+write for settings & chat_status
alter table n8n_chat_histories enable row level security;
drop policy if exists "dashboard_read_chats" on n8n_chat_histories;
create policy "dashboard_read_chats" on n8n_chat_histories for select using (true);

-- Allow authenticated dashboard users to append manual replies to chat history
drop policy if exists "dashboard_insert_chats" on n8n_chat_histories;
create policy "dashboard_insert_chats" on n8n_chat_histories
  for insert to authenticated with check (true);

alter table bookings enable row level security;
drop policy if exists "dashboard_read_bookings" on bookings;
create policy "dashboard_read_bookings" on bookings for select using (true);

alter table customers enable row level security;
drop policy if exists "dashboard_read_customers" on customers;
create policy "dashboard_read_customers" on customers for select using (true);

alter table dashboard_settings enable row level security;
drop policy if exists "dashboard_read_settings" on dashboard_settings;
drop policy if exists "dashboard_write_settings" on dashboard_settings;
create policy "dashboard_read_settings" on dashboard_settings for select using (true);
create policy "dashboard_write_settings" on dashboard_settings for all using (true) with check (true);

alter table chat_status enable row level security;
drop policy if exists "dashboard_read_chat_status" on chat_status;
drop policy if exists "dashboard_write_chat_status" on chat_status;
create policy "dashboard_read_chat_status"  on chat_status for select using (true);
create policy "dashboard_write_chat_status" on chat_status for all
  to authenticated using (true) with check (true);`

export default function SchemaMissing({ missingTables, onRetry }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SQL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="min-h-screen bg-wa-bg text-wa-text p-6 flex items-start justify-center overflow-y-auto">
      <div
        className="max-w-3xl w-full bg-wa-panel border border-wa-border rounded-xl p-7 space-y-5 shadow-xl my-8"
        data-testid="schema-missing"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-wa-hover flex items-center justify-center text-wa-accent">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-wa-text">Database setup required</h1>
            <p className="text-sm text-wa-muted">
              One-time step for this Supabase project — takes about 15 seconds.
            </p>
          </div>
        </div>

        <div className="text-sm text-wa-muted space-y-2">
          <p>
            The following table{missingTables.length > 1 ? 's are' : ' is'} missing from your Supabase project:
          </p>
          <ul className="flex flex-wrap gap-2">
            {missingTables.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1 bg-wa-cancelled/10 border border-wa-cancelled/40 text-wa-cancelled text-xs font-mono px-2 py-1 rounded"
              >
                public.{t}
              </li>
            ))}
          </ul>
        </div>

        <ol className="list-decimal list-inside text-sm text-wa-muted space-y-1 pl-1">
          <li>Open your Supabase project → <span className="text-wa-text font-medium">SQL Editor</span> → <span className="text-wa-text font-medium">New query</span>.</li>
          <li>Paste the SQL below and click <span className="text-wa-text font-medium">Run</span>.</li>
          <li>Come back here and click <span className="text-wa-text font-medium">I&apos;ve run the SQL — retry</span>.</li>
        </ol>

        <div className="relative">
          <button
            onClick={copy}
            data-testid="schema-copy-sql"
            className="absolute top-2 right-2 inline-flex items-center gap-1 bg-wa-hover hover:bg-wa-hover/70 border border-wa-border text-xs text-wa-text px-2 py-1 rounded"
          >
            {copied ? <Check size={12} className="text-wa-accent" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <pre className="bg-wa-bg border border-wa-border rounded-lg p-4 text-[11px] leading-relaxed text-wa-text overflow-auto max-h-[360px]">
{SETUP_SQL}
          </pre>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onRetry}
            data-testid="schema-retry"
            className="inline-flex items-center gap-2 bg-wa-accent hover:bg-wa-accent-2 text-wa-bg font-semibold px-4 py-2 rounded-md transition-colors"
          >
            <RefreshCw size={16} />
            I&apos;ve run the SQL — retry
          </button>
        </div>
      </div>
    </div>
  )
}
