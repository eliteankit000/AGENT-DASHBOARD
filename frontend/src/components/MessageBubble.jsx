import AiBadge from './AiBadge.jsx'

function formatTime(ts) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function normalizeMessage(raw) {
  // Defensive: some rows may have been inserted with the jsonb column
  // holding a JSON-encoded STRING instead of a real JSON object (e.g. a
  // double-stringified value from an external insert). Unwrap until we
  // get a real object, without throwing on genuinely malformed data.
  let value = raw
  let attempts = 0
  while (typeof value === 'string' && attempts < 3) {
    try {
      value = JSON.parse(value)
    } catch {
      break
    }
    attempts += 1
  }
  return value && typeof value === 'object' ? value : null
}

export default function MessageBubble({ message, timestamp }) {
  const normalized = normalizeMessage(message)
  const isAi = normalized?.type === 'ai'
  const content = normalized == null
    ? '[Unreadable message]'
    : typeof normalized.content === 'string'
      ? normalized.content
      : JSON.stringify(normalized.content ?? '', null, 2)

  return (
    <div
      className={`w-full flex ${isAi ? 'justify-end' : 'justify-start'} animate-fadeIn`}
      data-testid={isAi ? 'msg-ai' : 'msg-human'}
    >
      <div
        className={
          'relative max-w-[85%] md:max-w-[75%] rounded-lg px-3 pt-2 pb-1.5 shadow-sm ' +
          (isAi
            ? 'bg-wa-outgoing text-wa-text rounded-tr-sm'
            : 'bg-wa-incoming text-wa-text rounded-tl-sm')
        }
      >
        {isAi && (
          <div className="mb-1">
            <AiBadge />
          </div>
        )}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {content}
        </div>
        <div className="text-[10px] text-wa-muted/80 mt-1 text-right">
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  )
}
