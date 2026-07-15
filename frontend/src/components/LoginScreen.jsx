import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { LogIn } from 'lucide-react'
import AgencyLogo from './AgencyLogo.jsx'

export default function LoginScreen({ agencyName, agencyLogoUrl }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })
    setSubmitting(false)
    if (err) setError(err.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wa-bg text-wa-text p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-wa-panel border border-wa-border rounded-xl p-8 space-y-5 shadow-xl"
        data-testid="login-screen"
      >
        <div className="flex items-center gap-3">
          <AgencyLogo name={agencyName} url={agencyLogoUrl} size={44} testId="login-agency-logo" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-wa-text truncate">
              {agencyName || 'Agent Live Dashboard'}
            </h1>
            <p className="text-xs text-wa-muted flex items-center gap-1"><LogIn size={11} /> Admin sign-in</p>
          </div>
        </div>
        <p className="text-sm text-wa-muted">
          Enter your admin email and password to access the live agent dashboard.
        </p>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-wa-muted">Email</label>
          <input
            data-testid="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-wa-muted">Password</label>
          <input
            data-testid="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="text-sm text-wa-cancelled bg-wa-cancelled/10 border border-wa-cancelled/40 rounded px-3 py-2" data-testid="login-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          data-testid="login-submit"
          className="w-full min-h-[44px] bg-wa-accent hover:bg-wa-accent-2 disabled:opacity-60 text-wa-bg font-semibold py-2.5 rounded-md transition-colors"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
