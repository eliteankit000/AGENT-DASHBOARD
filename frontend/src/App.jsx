import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient.js'
import LoginScreen from './components/LoginScreen.jsx'
import AdminSignup from './components/AdminSignup.jsx'
import SetupWizard from './components/SetupWizard.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import TopStatsBar from './components/TopStatsBar.jsx'
import BookingsPage from './components/BookingsPage.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import SchemaMissing from './components/SchemaMissing.jsx'
import { CustomerNamesProvider } from './lib/customerNames.jsx'
import { MessageCircle, CalendarCheck, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Postgrest error codes indicating a required table has not been created yet
const TABLE_MISSING_CODES = new Set(['PGRST205', '42P01'])

function ConfigMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-wa-bg text-wa-text p-6">
      <div className="max-w-lg w-full bg-wa-panel border border-wa-border rounded-lg p-8 space-y-4" data-testid="config-missing">
        <h1 className="text-2xl font-semibold text-wa-accent">Configuration Required</h1>
        <p className="text-wa-muted">
          The Supabase environment variables are not set. Add them to your Vercel project
          (Project Settings → Environment Variables) or to a local <code className="text-wa-accent">.env</code> file
          based on <code className="text-wa-accent">.env.example</code>:
        </p>
        <pre className="bg-wa-bg border border-wa-border rounded p-3 text-sm text-wa-text overflow-x-auto">
{`VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>`}
        </pre>
        <p className="text-wa-muted text-sm">Once set, redeploy (or restart <code>npm run dev</code>) and reload this page.</p>
      </div>
    </div>
  )
}

function NavRail({ agencyName, agencyLogoUrl }) {
  const location = useLocation()
  const navigate = useNavigate()

  const links = [
    { to: '/', icon: MessageCircle, label: 'Live Chats', testid: 'nav-chats' },
    { to: '/bookings', icon: CalendarCheck, label: 'Bookings', testid: 'nav-bookings' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings', testid: 'nav-settings' }
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="w-16 shrink-0 bg-wa-panel border-r border-wa-border flex flex-col items-center py-4 gap-1" data-testid="nav-rail">
      <div className="w-10 h-10 rounded-full bg-wa-hover flex items-center justify-center overflow-hidden mb-3 border border-wa-border" title={agencyName}>
        {agencyLogoUrl ? (
          <img src={agencyLogoUrl} alt={agencyName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-wa-accent font-semibold text-sm">
            {(agencyName || 'A').slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      {links.map(({ to, icon: Icon, label, testid }) => {
        const active = location.pathname === to || (to === '/' && location.pathname.startsWith('/chats'))
        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            data-testid={testid}
            title={label}
            className={
              'w-11 h-11 rounded-lg flex items-center justify-center transition-colors ' +
              (active ? 'bg-wa-hover text-wa-accent' : 'text-wa-muted hover:text-wa-text hover:bg-wa-hover')
            }
          >
            <Icon size={22} strokeWidth={1.8} />
          </button>
        )
      })}
      <div className="flex-1" />
      <button
        onClick={handleLogout}
        data-testid="nav-logout"
        title="Log out"
        className="w-11 h-11 rounded-lg flex items-center justify-center text-wa-muted hover:text-wa-cancelled hover:bg-wa-hover transition-colors"
      >
        <LogOut size={22} strokeWidth={1.8} />
      </button>
    </div>
  )
}

function DashboardShell({ settings, refreshSettings }) {
  const [selectedSession, setSelectedSession] = useState(null)

  return (
    <CustomerNamesProvider>
      <div className="h-screen flex bg-wa-bg text-wa-text overflow-hidden">
        <NavRail agencyName={settings?.agency_name} agencyLogoUrl={settings?.agency_logo_url} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopStatsBar agencyName={settings?.agency_name} />
          <Routes>
            <Route
              path="/"
              element={
                <div className="flex-1 flex min-h-0">
                  <Sidebar selectedSession={selectedSession} onSelectSession={setSelectedSession} />
                  <ChatWindow sessionId={selectedSession} />
                </div>
              }
            />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/settings" element={<SettingsPage settings={settings} onSaved={refreshSettings} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </CustomerNamesProvider>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [settings, setSettings] = useState(null)
  const [adminExists, setAdminExists] = useState(null)
  const [missingTables, setMissingTables] = useState([])

  const loadSettings = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('dashboard_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (error) {
      if (TABLE_MISSING_CODES.has(error.code)) {
        setMissingTables((prev) => Array.from(new Set([...prev, 'dashboard_settings'])))
      } else if (error.code !== 'PGRST116') {
        console.warn('dashboard_settings load error', error.message)
      }
    }
    setSettings(data || null)
  }, [])

  const checkAdminExists = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('dashboard_settings')
      .select('id, admin_bootstrapped')
      .eq('id', 1)
      .maybeSingle()
    if (error && TABLE_MISSING_CODES.has(error.code)) {
      setMissingTables((prev) => Array.from(new Set([...prev, 'dashboard_settings'])))
    }
    setAdminExists(Boolean(data?.admin_bootstrapped))
  }, [])

  const probeBookingsTable = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.from('bookings').select('id', { head: true, count: 'exact' }).limit(1)
    if (error && TABLE_MISSING_CODES.has(error.code)) {
      setMissingTables((prev) => Array.from(new Set([...prev, 'bookings'])))
    }
  }, [])

  const runBootstrap = useCallback(async () => {
    setMissingTables([])
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await Promise.all([loadSettings(), checkAdminExists(), probeBookingsTable()])
    setLoading(false)
  }, [loadSettings, checkAdminExists, probeBookingsTable])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    runBootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [runBootstrap])

  if (!isSupabaseConfigured) {
    return <ConfigMissing />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wa-bg" data-testid="loading">
        <div className="text-wa-accent text-lg">Loading…</div>
      </div>
    )
  }

  // Guard: required tables missing in Supabase
  if (missingTables.length > 0) {
    return (
      <SchemaMissing
        missingTables={missingTables}
        onRetry={async () => {
          setLoading(true)
          await runBootstrap()
        }}
      />
    )
  }

  // Step 1: setup wizard if no settings row exists
  if (!settings) {
    return <SetupWizard onDone={async () => { await loadSettings(); await checkAdminExists() }} />
  }

  // Step 2: if no admin yet, force signup
  if (!adminExists) {
    return (
      <AdminSignup
        agencyName={settings.agency_name}
        onDone={async () => { await checkAdminExists() }}
      />
    )
  }

  // Step 3: if not authenticated, show login
  if (!session) {
    return <LoginScreen agencyName={settings.agency_name} />
  }

  // Step 4: main dashboard
  return <DashboardShell settings={settings} refreshSettings={loadSettings} />
}
