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

export default function MessageBubble({ message, timestamp }) {
  const isAi = message?.type === 'ai'
  const content = typeof message?.content === 'string'
    ? message.content
    : JSON.stringify(message?.content ?? '', null, 2)

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
