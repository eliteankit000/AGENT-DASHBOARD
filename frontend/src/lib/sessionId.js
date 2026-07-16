/**
 * A "real" WhatsApp session id looks like a phone number (digits, optionally
 * a leading +). n8n sometimes writes the literal placeholder "unknown_session"
 * into n8n_chat_histories when it couldn't resolve the sender — those rows
 * should never be surfaced in the sidebar or chat header.
 */
const PLACEHOLDER_SIDS = new Set(['unknown_session', 'unknown', ''])

export function isValidSessionId(sid) {
  if (sid == null) return false
  const s = String(sid).trim()
  if (!s) return false
  if (PLACEHOLDER_SIDS.has(s.toLowerCase())) return false
  return true
}

/**
 * Human-readable label for a session id. Used only as a safety net for the
 * chat header if a bad id ever reaches it — the sidebar filters bad ids out.
 */
export function sessionIdLabel(sid) {
  return isValidSessionId(sid) ? String(sid) : 'Unknown contact'
}
