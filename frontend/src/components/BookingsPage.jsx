import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import BookingBadge from './BookingBadge.jsx'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'

function monthKey(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleDateString([], { year: 'numeric', month: 'long' })
}

export default function BookingsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (error) {
        console.warn('bookings load error', error.message)
        setRows([])
      } else {
        setRows(data || [])
      }
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('bookings-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [])

  const months = useMemo(() => {
    const set = new Set(rows.map(r => monthKey(r.created_at)))
    return Array.from(set)
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (statusFilter !== 'all' && (r.status || '').toLowerCase() !== statusFilter) return false
      if (monthFilter !== 'all' && monthKey(r.created_at) !== monthFilter) return false
      if (!q) return true
      return (
        (r.customer_name || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.session_id || '').toLowerCase().includes(q)
      )
    })
  }, [rows, statusFilter, monthFilter, search])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of filtered) {
      const k = monthKey(r.created_at)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(r)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-wa-bg" data-testid="bookings-page">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-semibold text-wa-text mb-1">Bookings</h1>
        <p className="text-sm text-wa-muted mb-5">All bookings written by the AI agent, grouped by month.</p>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-muted" />
            <input
              data-testid="bookings-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or session id"
              className="w-full bg-wa-panel border border-wa-border rounded-md pl-9 pr-3 py-2 text-sm text-wa-text placeholder:text-wa-muted focus:outline-none focus:border-wa-accent"
            />
          </div>
          <select
            data-testid="bookings-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-wa-panel border border-wa-border rounded-md px-3 py-2 text-sm text-wa-text focus:outline-none focus:border-wa-accent"
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
          <select
            data-testid="bookings-filter-month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-wa-panel border border-wa-border rounded-md px-3 py-2 text-sm text-wa-text focus:outline-none focus:border-wa-accent"
          >
            <option value="all">All months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-wa-muted text-center py-16">Loading bookings…</div>
        ) : grouped.length === 0 ? (
          <div className="text-wa-muted text-center py-16" data-testid="bookings-empty">
            No bookings match your filters yet.
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([month, items]) => {
              const isCollapsed = Boolean(collapsed[month])
              return (
                <div key={month} className="bg-wa-panel border border-wa-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [month]: !c[month] }))}
                    data-testid={`bookings-group-${month}`}
                    className="w-full flex items-center justify-between px-4 py-3 bg-wa-hover/50 hover:bg-wa-hover transition-colors"
                  >
                    <span className="flex items-center gap-2 text-wa-text font-semibold">
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      {month}
                    </span>
                    <span className="text-xs text-wa-muted">{items.length} booking{items.length === 1 ? '' : 's'}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-[10px] uppercase tracking-wide text-wa-muted bg-wa-panel">
                          <tr>
                            <th className="text-left px-4 py-2">Ref</th>
                            <th className="text-left px-4 py-2">Customer</th>
                            <th className="text-left px-4 py-2">Phone</th>
                            <th className="text-left px-4 py-2">Destination</th>
                            <th className="text-left px-4 py-2">Travel Date</th>
                            <th className="text-right px-4 py-2">Amount</th>
                            <th className="text-left px-4 py-2">Status</th>
                            <th className="text-left px-4 py-2">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(r => (
                            <tr key={r.id} className="border-t border-wa-border hover:bg-wa-hover/40">
                              <td className="px-4 py-2 font-mono text-[11px] text-wa-muted truncate max-w-[100px]">{String(r.id).slice(0, 8)}</td>
                              <td className="px-4 py-2 text-wa-text">{r.customer_name || '—'}</td>
                              <td className="px-4 py-2 text-wa-muted">{r.phone || '—'}</td>
                              <td className="px-4 py-2 text-wa-text">{r.destination || '—'}</td>
                              <td className="px-4 py-2 text-wa-muted">{r.travel_date ? new Date(r.travel_date).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-2 text-right text-wa-accent font-semibold">
                                {r.amount != null ? Number(r.amount).toLocaleString() : '—'}
                              </td>
                              <td className="px-4 py-2"><BookingBadge status={r.status} size="sm" /></td>
                              <td className="px-4 py-2 text-wa-muted text-xs">
                                {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
