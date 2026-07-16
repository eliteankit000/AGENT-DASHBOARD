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
import AgencyLogo from './components/AgencyLogo.jsx'
import { CustomerNamesProvider } from './lib/customerNames.jsx'
import { ChatStatusProvider } from './lib/chatStatus.jsx'
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

const NAV_LINKS = [
  { to: '/', icon: MessageCircle, label: 'Chats', testid: 'nav-chats' },
  { to: '/bookings', icon: CalendarCheck, label: 'Bookings', testid: 'nav-bookings' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings', testid: 'nav-settings' }
]

function isNavActive(pathname, to) {
  if (to === '/') return pathname === '/' || pathname.startsWith('/chats')
  return pathname === to
}

function NavRail({ agencyName, agencyLogoUrl, onLogout, onNavigate }) {
  const location = useLocation()

  return (
    <div className="hidden md:flex w-16 shrink-0 bg-wa-panel border-r border-wa-border flex-col items-center py-4 gap-1" data-testid="nav-rail">
      <div className="mb-3">
        <AgencyLogo name={agencyName} url={agencyLogoUrl} size={40} testId="nav-agency-logo" />
      </div>
      {NAV_LINKS.map(({ to, icon: Icon, label, testid }) => {
        const active = isNavActive(location.pathname, to)
        return (
          <button
            key={to}
            onClick={() => onNavigate(to)}
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
        onClick={onLogout}
        data-testid="nav-logout"
        title="Log out"
        className="w-11 h-11 rounded-lg flex items-center justify-center text-wa-muted hover:text-wa-cancelled hover:bg-wa-hover transition-colors"
      >
        <LogOut size={22} strokeWidth={1.8} />
      </button>
    </div>
  )
}

function BottomNav({ onLogout, onNavigate }) {
  const location = useLocation()
  const items = [...NAV_LINKS, { to: '__logout', icon: LogOut, label: 'Logout', testid: 'nav-logout-mobile' }]
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-wa-panel border-t border-wa-border flex items-stretch"
      data-testid="bottom-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ to, icon: Icon, label, testid }) => {
        const active = to !== '__logout' && isNavActive(location.pathname, to)
        const handleClick = to === '__logout' ? onLogout : () => onNavigate(to)
        return (
          <button
            key={testid}
            onClick={handleClick}
            data-testid={testid}
            className={
              'flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ' +
              (active
                ? 'text-wa-accent'
                : to === '__logout'
                  ? 'text-wa-muted hover:text-wa-cancelled'
                  : 'text-wa-muted hover:text-wa-text')
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span className="leading-none">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function DashboardShell({ settings, refreshSettings }) {
  const [selectedSession, setSelectedSession] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const handleNavigate = (to) => {
    // When user taps "Chats" bring them back to the sidebar list (mobile UX)
    if (to === '/') setSelectedSession(null)
    navigate(to)
  }

  // On mobile the "/" route is either sidebar OR chat, not both
  const onHome = location.pathname === '/'
  const mobileShowChat = onHome && selectedSession

  return (
    <CustomerNamesProvider>
      <div className="h-screen flex bg-wa-bg text-wa-text overflow-hidden">
        <NavRail
          agencyName={settings?.agency_name}
          agencyLogoUrl={settings?.agency_logo_url}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
        <div className="flex-1 flex flex-col min-w-0 pb-14 md:pb-0">
          <TopStatsBar agencyName={settings?.agency_name} />
          <Routes>
            <Route
              path="/"
              element={
                <div className="flex-1 flex min-h-0">
                  <div className={(mobileShowChat ? 'hidden' : 'flex') + ' md:flex w-full md:w-auto min-h-0'}>
                    <Sidebar
                      selectedSession={selectedSession}
                      onSelectSession={setSelectedSession}
                    />
                  </div>
                  <div className={(mobileShowChat ? 'flex' : 'hidden') + ' md:flex flex-1 min-w-0 min-h-0'}>
                    <ChatWindow
                      sessionId={selectedSession}
                      onBack={() => setSelectedSession(null)}
                    />
                  </div>
                </div>
              }
            />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/settings" element={<SettingsPage settings={settings} onSaved={refreshSettings} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav onLogout={handleLogout} onNavigate={handleNavigate} />
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
    for (const table of ['bookings', 'chat_status']) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error && TABLE_MISSING_CODES.has(error.code)) {
        setMissingTables((prev) => Array.from(new Set([...prev, table])))
      }
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
        agencyLogoUrl={settings.agency_logo_url}
        onDone={async () => { await checkAdminExists() }}
      />
    )
  }

  // Step 3: if not authenticated, show login
  if (!session) {
    return <LoginScreen agencyName={settings.agency_name} agencyLogoUrl={settings.agency_logo_url} />
  }

  // Step 4: main dashboard
  return <DashboardShell settings={settings} refreshSettings={loadSettings} session={session} />
}
