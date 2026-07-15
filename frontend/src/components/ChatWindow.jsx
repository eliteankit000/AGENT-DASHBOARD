import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import MessageBubble from './MessageBubble.jsx'
import BookingBadge from './BookingBadge.jsx'
import { MessageSquare, User, Phone, ArrowLeft } from 'lucide-react'
import { useCustomerName } from '../lib/customerNames.jsx'
import PhonePill from './PhonePill.jsx'

export default function ChatWindow({ sessionId, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(null)
  const customerName = useCustomerName(sessionId)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      setBooking(null)
      return
    }
    let mounted = true

    const loadThread = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('id, session_id, message')
        .eq('session_id', sessionId)
        .order('id', { ascending: true })
      if (!mounted) return
      if (error) {
        console.warn('chat load error', error.message)
        setMessages([])
      } else {
        setMessages(data || [])
      }
      setLoading(false)
    }

    const loadBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!mounted) return
      setBooking(data && data.length ? data[0] : null)
    }

    loadThread()
    loadBooking()

    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `session_id=eq.${sessionId}` },
        () => loadBooking()
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!sessionId) {
    return (
      <div className="flex-1 chat-bg flex items-center justify-center" data-testid="chat-empty">
        <div className="text-center text-wa-muted max-w-sm px-6">
          <MessageSquare size={56} className="mx-auto mb-4 opacity-50" strokeWidth={1.4} />
          <h2 className="text-wa-text text-lg font-medium">Agent Live Dashboard</h2>
          <p className="text-sm mt-2">
            Select a conversation on the left to see the full thread. New messages arrive here in real time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 chat-bg" data-testid="chat-window">
      {/* Header */}
      <div className="bg-wa-panel border-b border-wa-border px-3 md:px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            data-testid="chat-back"
            aria-label="Back to chats"
            className="md:hidden w-11 h-11 -ml-1 rounded-lg flex items-center justify-center text-wa-muted hover:text-wa-text hover:bg-wa-hover transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-wa-hover border border-wa-border flex items-center justify-center text-wa-muted shrink-0">
          <User size={18} />
        </div>
        <div className="min-w-0 flex-1">
          {customerName ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-sm font-semibold text-wa-text truncate"
                data-testid="chat-header-name"
              >
                {customerName}
              </span>
              <PhonePill phone={sessionId} />
            </div>
          ) : (
            <div
              className="text-sm font-medium text-wa-text truncate"
              data-testid="chat-header-phone"
            >
              {sessionId}
            </div>
          )}
          <div className="text-xs text-wa-muted flex items-center gap-1 mt-0.5">
            <Phone size={11} /> WhatsApp customer
          </div>
        </div>
        {booking && (
          <BookingBadge status={booking.status} data-testid="chat-header-booking" />
        )}
      </div>

      {/* Pinned booking summary */}
      {booking && (
        <div className="bg-wa-panel/70 border-b border-wa-border px-4 py-2 text-xs text-wa-muted flex flex-wrap items-center gap-x-4 gap-y-1" data-testid="chat-booking-pinned">
          <span><span className="text-wa-text font-medium">{booking.customer_name || '—'}</span></span>
          {booking.destination && <span>→ {booking.destination}</span>}
          {booking.travel_date && <span>on {new Date(booking.travel_date).toLocaleDateString()}</span>}
          {booking.amount != null && <span className="text-wa-accent font-semibold">₹{Number(booking.amount).toLocaleString()}</span>}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
        {loading ? (
          <div className="text-center text-wa-muted text-sm py-10">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-wa-muted text-sm py-10">No messages in this conversation yet.</div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m.message} timestamp={null} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Read-only footer note */}
      <div className="bg-wa-panel border-t border-wa-border px-4 py-2 text-[11px] text-wa-muted text-center">
        Read-only view — messages are handled by the AI agent
      </div>
    </div>
  )
}
