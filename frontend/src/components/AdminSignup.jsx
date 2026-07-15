import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { UserPlus } from 'lucide-react'
import AgencyLogo from './AgencyLogo.jsx'

export default function AdminSignup({ agencyName, agencyLogoUrl, onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password
    })
    if (err) {
      setSubmitting(false)
      setError(err.message)
      return
    }
    // Mark admin as bootstrapped so we never show signup again
    await supabase
      .from('dashboard_settings')
      .update({ admin_bootstrapped: true })
      .eq('id', 1)

    setSubmitting(false)
    if (data.session) {
      // Auto-logged in — App will pick up session via onAuthStateChange
      onDone?.()
    } else {
      // Email confirmation required
      setError('Account created. Please confirm your email, then log in.')
      onDone?.()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wa-bg text-wa-text p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-wa-panel border border-wa-border rounded-xl p-8 space-y-5 shadow-xl"
        data-testid="admin-signup"
      >
        <div className="flex items-center gap-3">
          <AgencyLogo name={agencyName} url={agencyLogoUrl} size={44} testId="signup-agency-logo" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-wa-text truncate">
              {agencyName || 'Agent Live Dashboard'}
            </h1>
            <p className="text-xs text-wa-muted flex items-center gap-1"><UserPlus size={11} /> Create admin account</p>
          </div>
        </div>
        <p className="text-sm text-wa-muted">
          {agencyName ? <>Set up the first admin login for <span className="text-wa-text font-medium">{agencyName}</span>.</> : 'Set up the first admin login.'}
          <br />This will be your permanent login.
        </p>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-wa-muted">Email</label>
          <input
            data-testid="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@yourdomain.com"
            className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-wa-muted">Password</label>
          <input
            data-testid="signup-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-wa-muted">Confirm Password</label>
          <input
            data-testid="signup-confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="text-sm text-wa-cancelled bg-wa-cancelled/10 border border-wa-cancelled/40 rounded px-3 py-2" data-testid="signup-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          data-testid="signup-submit"
          className="w-full min-h-[44px] bg-wa-accent hover:bg-wa-accent-2 disabled:opacity-60 text-wa-bg font-semibold py-2.5 rounded-md transition-colors"
        >
          {submitting ? 'Creating…' : 'Create Admin'}
        </button>
      </form>
    </div>
  )
}
