import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { Send, AlertTriangle } from 'lucide-react'

/**
 * Composer visible ONLY when AI is paused for the current chat.
 * On send:
 *   1. POST { session_id, message, staff_name } to VITE_WHATSAPP_SEND_URL
 *      (the user's n8n webhook that reuses the same WhatsApp send node
 *       the AI Agent uses — no parallel integration).
 *   2. Insert the message into n8n_chat_histories with the same shape the
 *      AI agent uses, so it renders as an outgoing bubble in the same thread.
 */
export default function MessageComposer({ sessionId, staffName }) {
  const sendUrl = import.meta.env.VITE_WHATSAPP_SEND_URL || ''
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    // Focus on mount / session change for fast reply
    textareaRef.current?.focus()
  }, [sessionId])

  const autoresize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(140, el.scrollHeight) + 'px'
  }

  const submit = async () => {
    const message = text.trim()
    if (!message || sending || !sessionId) return
    setSending(true)
    setError('')
    setWarning('')

    // 1) Send via configured webhook (reuses AI agent's WhatsApp integration)
    let deliveryOk = false
    if (sendUrl) {
      try {
        const res = await fetch(sendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            message,
            staff_name: staffName || null,
            source: 'dashboard_manual'
          })
        })
        deliveryOk = res.ok
        if (!res.ok) {
          setError(`WhatsApp send failed (${res.status}). Message not delivered.`)
        }
      } catch (e) {
        setError(`WhatsApp send failed: ${e.message}. Message not delivered.`)
      }
    } else {
      setWarning('VITE_WHATSAPP_SEND_URL is not configured — message logged but not delivered.')
    }

    // 2) Insert into n8n_chat_histories so it appears in the thread (only if
    // WhatsApp delivery succeeded, OR if delivery is not configured yet — in
    // that case we still log locally so staff can see what they typed).
    if (deliveryOk || !sendUrl) {
      const { error: insErr } = await supabase
        .from('n8n_chat_histories')
        .insert({
          session_id: sessionId,
          message: { type: 'ai', content: message }
        })
      if (insErr) {
        setError((prev) => prev || `Could not log message to chat history: ${insErr.message}`)
      } else {
        setText('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    }

    setSending(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="bg-wa-panel border-t border-wa-border px-3 md:px-4 py-3" data-testid="message-composer">
      {error && (
        <div
          className="mb-2 flex items-center gap-2 bg-wa-cancelled/10 border border-wa-cancelled/40 text-wa-cancelled text-xs rounded px-2.5 py-1.5"
          data-testid="composer-error"
        >
          <AlertTriangle size={13} /> {error}
        </div>
      )}
      {warning && (
        <div
          className="mb-2 flex items-center gap-2 bg-wa-pending/10 border border-wa-pending/40 text-wa-pending text-xs rounded px-2.5 py-1.5"
          data-testid="composer-warning"
        >
          <AlertTriangle size={13} /> {warning}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          data-testid="composer-input"
          value={text}
          onChange={(e) => { setText(e.target.value); autoresize() }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Type a reply — press Enter to send, Shift+Enter for new line"
          className="flex-1 resize-none bg-wa-hover border border-wa-border rounded-lg px-3 py-2 text-sm text-wa-text placeholder:text-wa-muted focus:outline-none focus:border-wa-accent min-h-[40px] max-h-[140px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={sending || !text.trim()}
          data-testid="composer-send"
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-wa-accent hover:bg-wa-accent-2 disabled:opacity-50 disabled:cursor-not-allowed text-wa-bg transition-colors"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
