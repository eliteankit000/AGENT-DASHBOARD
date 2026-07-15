import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { Save, Image as ImageIcon } from 'lucide-react'

export default function SettingsPage({ settings, onSaved }) {
  const [agencyName, setAgencyName] = useState(settings?.agency_name || '')
  const [logoUrl, setLogoUrl] = useState(settings?.agency_logo_url || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    setAgencyName(settings?.agency_name || '')
    setLogoUrl(settings?.agency_logo_url || '')
  }, [settings])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const { error } = await supabase
      .from('dashboard_settings')
      .update({
        agency_name: agencyName.trim(),
        agency_logo_url: logoUrl.trim() || null
      })
      .eq('id', 1)
    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
      return
    }
    setMsg({ type: 'ok', text: 'Settings saved.' })
    onSaved?.()
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-wa-bg" data-testid="settings-page">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-wa-text mb-1">Settings</h1>
        <p className="text-sm text-wa-muted mb-6">Update your agency branding. No redeploy required.</p>

        <form
          onSubmit={handleSave}
          className="bg-wa-panel border border-wa-border rounded-lg p-6 space-y-5"
        >
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-wa-muted">Agency Name</label>
            <input
              data-testid="settings-agency-name"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-wa-muted">Logo URL</label>
            <input
              data-testid="settings-logo-url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              className="w-full bg-wa-hover border border-wa-border rounded-md px-3 py-2 text-wa-text placeholder:text-wa-muted focus:border-wa-accent focus:outline-none"
            />
            {logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-wa-hover border border-wa-border flex items-center justify-center overflow-hidden">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <span className="text-xs text-wa-muted flex items-center gap-1"><ImageIcon size={12} /> Logo preview</span>
              </div>
            )}
          </div>

          {msg && (
            <div
              data-testid="settings-message"
              className={
                'text-sm rounded px-3 py-2 border ' +
                (msg.type === 'ok'
                  ? 'bg-wa-confirmed/10 border-wa-confirmed/40 text-wa-confirmed'
                  : 'bg-wa-cancelled/10 border-wa-cancelled/40 text-wa-cancelled')
              }
            >
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            data-testid="settings-save"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-wa-accent hover:bg-wa-accent-2 disabled:opacity-60 text-wa-bg font-semibold px-4 py-2 rounded-md transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
