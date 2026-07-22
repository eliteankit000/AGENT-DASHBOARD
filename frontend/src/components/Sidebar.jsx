import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { Search, User, UserCog, Trash2 } from 'lucide-react'
import { useCustomerNames } from '../lib/customerNames.jsx'
import { usePausedSessions } from '../lib/chatStatus.jsx'
import { isValidSessionId } from '../lib/sessionId.js'
import PhonePill from './PhonePill.jsx'

function extractPreview(message) {
  // Defensive: some rows may have the jsonb column holding a JSON-encoded
  // STRING instead of a real object (e.g. a double-stringified insert).
  // Unwrap until we get a real object before reading .content.
  let value = message
  let attempts = 0
  while (typeof value === 'string' && attempts < 3) {
    try { value = JSON.parse(value) } catch { break }
    attempts += 1
  }
  const content = value && typeof value === 'object' ? value.content : undefined
  if (typeof content === 'string') return content
  if (content == null) return ''
  try { return JSON.stringify(content) } catch { return '' }
}

function relativeTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Sidebar({ selectedSession, onSelectSession }) {
  const [sessions, setSessions] = useState([]) // { session_id, preview, ts, unread }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pulseIds, setPulseIds] = useState({})
  const [deletingId, setDeletingId] = useState(null)
  const { names: customerNames } = useCustomerNames()
  const chatStatuses = usePausedSessions()
  const selectedRef = useRef(selectedSession)
  useEffect(() => { selectedRef.current = selectedSession }, [selectedSession])

  const upsertSession = (sessionId, preview, ts, isNew) => {
    setSessions((prev) => {
      const others = prev.filter(s => s.session_id !== sessionId)
      const existing = prev.find(s => s.session_id === sessionId)
      const merged = {
        session_id: sessionId,
        preview: preview ?? existing?.preview ?? '',
        ts: ts || existing?.ts || null,
        unread: isNew && selectedRef.current !== sessionId
          ? (existing?.unread || 0) + 1
          : (existing?.unread || 0)
      }
      return [merged, ...others].sort((a, b) => {
        const ta = a.ts ? new Date(a.ts).getTime() : 0
        const tb = b.ts ? new Date(b.ts).getTime() : 0
        return tb - ta
      })
    })
  }

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation()
    if (deletingId) return
    const confirmed = window.confirm('Delete this chat? This will remove the conversation history permanently.')
    if (!confirmed) return

    setDeletingId(sessionId)
    const { error } = await supabase
      .from('n8n_chat_histories')
      .delete()
      .eq('session_id', sessionId)

    setDeletingId(null)

    if (error) {
      console.warn('delete chat error', error.message)
      window.alert('Could not delete this chat: ' + error.message)
      return
    }

    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))
    if (selectedRef.current === sessionId) {
      onSelectSession(null)
    }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      // Fetch latest 500 messages then group in JS (n8n_chat_histories has no created_at
      // guarantee in the spec; we sort by id descending which acts as latest-first).
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('id, session_id, message')
        .order('id', { ascending: false })
        .limit(500)

      if (error) {
        console.warn('sidebar load error', error.message)
        if (mounted) setLoading(false)
        return
      }
      const map = new Map()
      for (const row of data || []) {
        // Skip n8n's placeholder rows so we never show "unknown_session"
        if (!isValidSessionId(row.session_id)) continue
        if (!map.has(row.session_id)) {
          map.set(row.session_id, {
            session_id: row.session_id,
            preview: extractPreview(row.message),
            ts: null, // no timestamp column; keep null, use id order as proxy
            _lastId: row.id
          })
        }
      }
      const arr = Array.from(map.values()).sort((a, b) => b._lastId - a._lastId)
      if (mounted) {
        setSessions(arr.map(s => ({ ...s, unread: 0 })))
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('sidebar-chats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' },
        (payload) => {
          const row = payload.new
          if (!row?.session_id) return
          if (!isValidSessionId(row.session_id)) return
          const preview = extractPreview(row.message)
          upsertSession(row.session_id, preview, new Date().toISOString(), true)
          // Trigger pulse
          setPulseIds((m) => ({ ...m, [row.session_id]: Date.now() }))
          setTimeout(() => {
            setPulseIds((m) => {
              const copy = { ...m }
              delete copy[row.session_id]
              return copy
            })
          }, 3000)
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  // Clear unread when a session becomes selected
  useEffect(() => {
    if (!selectedSession) return
    setSessions((prev) => prev.map(s => s.session_id === selectedSession ? { ...s, unread: 0 } : s))
  }, [selectedSession])

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions
    const q = search.toLowerCase()
    return sessions.filter(s => {
      const name = customerNames[s.session_id] || ''
      return (
        (s.session_id || '').toLowerCase().includes(q) ||
        (s.preview || '').toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      )
    })
  }, [sessions, search, customerNames])

  return (
    <aside className="w-full md:w-[260px] lg:w-[340px] shrink-0 bg-wa-panel md:border-r md:border-wa-border flex flex-col min-h-0" data-testid="sidebar">
      <div className="p-3 border-b border-wa-border">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-muted" />
          <input
            data-testid="sidebar-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or filter chats"
            className="w-full bg-wa-hover border border-transparent focus:border-wa-accent rounded-md pl-9 pr-3 py-2 text-sm text-wa-text placeholder:text-wa-muted focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-6 text-sm text-wa-muted text-center">Loading chats…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-wa-muted text-center" data-testid="sidebar-empty">
            No conversations yet. New WhatsApp chats will appear here in real time.
          </div>
        ) : (
          <ul>
            {filtered.map((s) => {
              const active = s.session_id === selectedSession
              const pulsing = Boolean(pulseIds[s.session_id])
              const name = customerNames[s.session_id]
              const paused = chatStatuses[s.session_id]?.ai_enabled === false
              return (
                <li key={s.session_id} className="relative group flex items-stretch">
                  <button
                    data-testid={`chat-item-${s.session_id}`}
                    onClick={() => onSelectSession(s.session_id)}
                    className={
                      'flex-1 min-w-0 text-left flex items-center gap-3 px-3 py-3 min-h-[60px] border-b border-wa-border/60 transition-colors ' +
                      (active ? 'bg-wa-hover' : 'hover:bg-wa-hover/70 active:bg-wa-hover')
                    }
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-wa-hover border border-wa-border flex items-center justify-center text-wa-muted">
                        <User size={18} />
                      </div>
                      {paused && (
                        <span
                          data-testid={`paused-dot-${s.session_id}`}
                          title="AI paused — human handling"
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-wa-pending border-2 border-wa-panel flex items-center justify-center"
                        >
                          <UserCog size={9} strokeWidth={3} className="text-wa-bg" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-1.5">
                          {name ? (
                            <>
                              <span
                                className="text-sm font-semibold text-wa-text truncate"
                                data-testid={`chat-item-name-${s.session_id}`}
                              >
                                {name}
                              </span>
                              <PhonePill phone={s.session_id} />
                            </>
                          ) : (
                            <span
                              className="text-sm font-medium text-wa-text truncate"
                              data-testid={`chat-item-phone-${s.session_id}`}
                            >
                              {s.session_id}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-wa-muted shrink-0">{relativeTime(s.ts)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-wa-muted truncate">{s.preview || '—'}</span>
                        {(s.unread > 0 || pulsing) && (
                          <span
                            data-testid={`unread-${s.session_id}`}
                            className={
                              'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-wa-accent text-wa-bg text-[10px] font-bold ' +
                              (pulsing ? 'animate-pulseDot' : '')
                            }
                          >
                            {s.unread || '•'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    data-testid={`chat-delete-${s.session_id}`}
                    onClick={(e) => handleDeleteSession(e, s.session_id)}
                    disabled={deletingId === s.session_id}
                    aria-label="Delete chat"
                    title="Delete chat"
                    className={
                      'shrink-0 w-10 flex items-center justify-center border-b border-wa-border/60 text-wa-muted hover:text-wa-cancelled hover:bg-wa-hover md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50 ' +
                      (active ? 'bg-wa-hover' : '')
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
