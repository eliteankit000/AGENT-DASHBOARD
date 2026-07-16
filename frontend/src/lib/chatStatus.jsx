import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient.js'

/**
 * Global chat_status store.
 * Row shape: { session_id, ai_enabled, paused_by, updated_at }
 * Absence of a row means ai_enabled = true (default AI ON).
 *
 * Realtime: listens for every change event on public.chat_status so that
 * external mutations (n8n tool calls, direct Supabase edits) reflect in the
 * dashboard within ~1s, without a page refresh.
 */
const ChatStatusContext = createContext({
  statuses: {},
  ready: false,
  tableMissing: false,
  isPaused: () => false,
  setEnabled: async () => {}
})

export function ChatStatusProvider({ children }) {
  const [statuses, setStatuses] = useState({})
  const [ready, setReady] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const tableMissingRef = useRef(false)

  const applyRow = useCallback((row) => {
    if (!row?.session_id) return
    setStatuses((prev) => ({ ...prev, [row.session_id]: row }))
  }, [])

  const dropRow = useCallback((row) => {
    const sid = row?.session_id
    if (!sid) return
    setStatuses((prev) => {
      if (!(sid in prev)) return prev
      const next = { ...prev }
      delete next[sid]
      return next
    })
  }, [])

  // Full re-fetch, used on subscribe/reconnect to sync any events we may
  // have missed while the socket wasn't yet SUBSCRIBED.
  const refetchAll = useCallback(async () => {
    if (tableMissingRef.current) return
    const { data, error } = await supabase
      .from('chat_status')
      .select('session_id, ai_enabled, paused_by, updated_at')
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        tableMissingRef.current = true
        setTableMissing(true)
      } else {
        console.warn('chat_status refetch error', error.message)
      }
      return
    }
    const map = {}
    for (const r of data || []) map[r.session_id] = r
    setStatuses(map)
  }, [])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      await refetchAll()
      if (mounted) setReady(true)
    })()

    const channel = supabase
      .channel('chat-status-realtime')
      // Catch-all: INSERT, UPDATE, DELETE — external tools writing directly
      // to the table (n8n, Supabase Studio) all land here.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_status' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            dropRow(payload.old)
          } else {
            applyRow(payload.new)
          }
        }
      )
      .subscribe((status) => {
        // On (re)connect, re-fetch the whole table so we don't miss anything
        // that changed while we were connecting or offline.
        if (status === 'SUBSCRIBED') refetchAll()
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('chat_status realtime status:', status)
        }
      })

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [applyRow, dropRow, refetchAll])

  const isPaused = useCallback(
    (sessionId) => statuses[sessionId]?.ai_enabled === false,
    [statuses]
  )

  /**
   * Toggle AI for a session. `enabled=false` → pause AI, human handling.
   * `enabled=true` → hand back to AI.
   */
  const setEnabled = useCallback(async (sessionId, enabled, pausedBy) => {
    if (!sessionId) return { error: new Error('Missing session_id') }
    const nowIso = new Date().toISOString()
    const payload = {
      session_id: sessionId,
      ai_enabled: enabled,
      paused_by: enabled ? null : (pausedBy || null),
      updated_at: nowIso
    }
    // Optimistic — realtime UPDATE will confirm shortly
    applyRow(payload)
    const { error } = await supabase
      .from('chat_status')
      .upsert(payload, { onConflict: 'session_id' })
    if (error) console.warn('chat_status upsert error', error.message)
    return { error }
  }, [applyRow])

  return (
    <ChatStatusContext.Provider value={{ statuses, ready, tableMissing, isPaused, setEnabled }}>
      {children}
    </ChatStatusContext.Provider>
  )
}

export function useChatStatus(sessionId) {
  const { statuses, setEnabled } = useContext(ChatStatusContext)
  const row = sessionId ? statuses[sessionId] : null
  return {
    aiEnabled: row ? row.ai_enabled !== false : true, // default ON when no row
    pausedBy: row?.paused_by || null,
    updatedAt: row?.updated_at || null,
    setEnabled: (enabled, pausedBy) => setEnabled(sessionId, enabled, pausedBy)
  }
}

export function usePausedSessions() {
  const { statuses } = useContext(ChatStatusContext)
  return statuses
}
