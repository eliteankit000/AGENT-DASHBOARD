import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient.js'

/**
 * Global chat_status store.
 * Row shape: { session_id, ai_enabled, paused_by, updated_at }
 * Absence of a row means ai_enabled = true (default AI ON).
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

  const applyRow = useCallback((row) => {
    if (!row?.session_id) return
    setStatuses((prev) => ({ ...prev, [row.session_id]: row }))
  }, [])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data, error } = await supabase
        .from('chat_status')
        .select('session_id, ai_enabled, paused_by, updated_at')
      if (!mounted) return
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          setTableMissing(true)
        } else {
          console.warn('chat_status load error', error.message)
        }
        setReady(true)
        return
      }
      const map = {}
      for (const r of data || []) map[r.session_id] = r
      setStatuses(map)
      setReady(true)
    }
    load()

    const channel = supabase
      .channel('chat-status')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_status' },
        (payload) => applyRow(payload.new)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_status' },
        (payload) => applyRow(payload.new)
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [applyRow])

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
    // Optimistic
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
