import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { CheckCircle2, XCircle, MessageCircle } from 'lucide-react'

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default function TopStatsBar({ agencyName }) {
  const [stats, setStats] = useState({ confirmed: 0, cancelled: 0, active: 0 })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { start, end } = monthBounds()

      const [confirmedRes, cancelledRes, chatsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'confirmed')
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'cancelled')
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('n8n_chat_histories')
          .select('session_id')
          .order('id', { ascending: false })
          .limit(500)
      ])

      if (!mounted) return
      const activeSessions = new Set()
      for (const r of chatsRes.data || []) activeSessions.add(r.session_id)

      setStats({
        confirmed: confirmedRes.count || 0,
        cancelled: cancelledRes.count || 0,
        active: activeSessions.size
      })
    }

    load()

    const channel = supabase
      .channel('topbar-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' }, () => load())
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const cards = [
    { key: 'confirmed', icon: CheckCircle2, label: 'Confirmed this month', value: stats.confirmed, color: 'text-wa-confirmed' },
    { key: 'cancelled', icon: XCircle,      label: 'Cancelled this month', value: stats.cancelled, color: 'text-wa-cancelled' },
    { key: 'active',    icon: MessageCircle,label: 'Active chats (24h)',   value: stats.active,    color: 'text-wa-accent' }
  ]

  return (
    <header className="bg-wa-panel border-b border-wa-border px-3 md:px-4 py-2 md:py-3 flex items-center gap-4" data-testid="top-stats-bar">
      <div className="text-sm text-wa-muted mr-2 hidden md:block">
        <span className="text-wa-text font-semibold">{agencyName || 'Agency'}</span>
        <span className="mx-2 text-wa-border">•</span>
        Live Agent Dashboard
      </div>
      <div className="hidden md:block flex-1" />
      <div className="flex items-center gap-2 md:gap-3 flex-nowrap overflow-x-auto md:flex-wrap md:overflow-visible -mx-3 md:mx-0 px-3 md:px-0 scrollbar-none">
        {cards.map(({ key, icon: Icon, label, value, color }) => (
          <div
            key={key}
            data-testid={`stat-${key}`}
            className="flex items-center gap-2 bg-wa-hover border border-wa-border rounded-md px-3 py-1.5 shrink-0"
          >
            <Icon size={16} className={color} />
            <div className="leading-tight">
              <div className={`text-sm font-bold ${color}`}>{value}</div>
              <div className="text-[10px] uppercase tracking-wide text-wa-muted whitespace-nowrap">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </header>
  )
}
