import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { Sparkles } from 'lucide-react'

export default function SetupWizard({ onDone }) {
  const [agencyName, setAgencyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agencyName.trim()) {
      setError('Agency name is required')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase
      .from('dashboard_settings')
      .upsert(
        { id: 1, agency_name: agencyName.trim(), agency_logo_url: logoUrl.trim() || null, admin_bootstrapped: false },
        { onConflict: 'id' }
      )
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    onDone?.()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wa-bg text-wa-text p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-wa-panel border border-wa-border rounded-xl p-8 space-y-5 shadow-xl"
        data-testid="setup-wizard"
      >
        <div className="flex items-center gap-2 text-wa-accent">
          <Sparkles size={22} />
          <h1 className="text-xl font-semibold">Set up your Dashboard</h1>
        </div>
        <p className="text-sm text-wa-muted">
          One-time white-label setup for this Supabase project. You can change these later in Settings.
        </p>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-wa-muted">Agency Name</label>
          <input
            data-testid="setup-agency-name"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="e.g. Blue Horizon Travel"
            className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-wa-muted">Logo URL (optional)</label>
          <input
            data-testid="setup-logo-url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…/logo.png"
            className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
          />
        </div>

        {error && (
          <div className="text-sm text-wa-cancelled bg-wa-cancelled/10 border border-wa-cancelled/40 rounded px-3 py-2" data-testid="setup-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          data-testid="setup-submit"
          className="w-full bg-wa-accent hover:bg-wa-accent-2 disabled:opacity-60 text-wa-bg font-semibold py-2.5 rounded-md transition-colors"
        >
          {submitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
