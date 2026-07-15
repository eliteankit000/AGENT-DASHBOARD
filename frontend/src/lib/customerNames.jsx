import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const CustomerNamesContext = createContext({ names: {}, ready: false })

export function CustomerNamesProvider({ children }) {
  const [names, setNames] = useState({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('session_id, customer_name')
      if (!mounted) return
      if (error) {
        // Table might not exist yet — fail soft, dashboard still works with phone-only display
        console.warn('customers load error', error.message)
        setReady(true)
        return
      }
      const map = {}
      for (const row of data || []) {
        if (row?.session_id && row?.customer_name) map[row.session_id] = row.customer_name
      }
      setNames(map)
      setReady(true)
    }
    load()

    const channel = supabase
      .channel('customers-names')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customers' },
        (payload) => {
          const r = payload.new
          if (r?.session_id && r?.customer_name) {
            setNames((prev) => ({ ...prev, [r.session_id]: r.customer_name }))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customers' },
        (payload) => {
          const r = payload.new
          if (!r?.session_id) return
          setNames((prev) => {
            const next = { ...prev }
            if (r.customer_name) next[r.session_id] = r.customer_name
            else delete next[r.session_id]
            return next
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <CustomerNamesContext.Provider value={{ names, ready }}>
      {children}
    </CustomerNamesContext.Provider>
  )
}

export function useCustomerName(sessionId) {
  const { names } = useContext(CustomerNamesContext)
  return sessionId ? names[sessionId] || null : null
}

export function useCustomerNames() {
  return useContext(CustomerNamesContext)
}
