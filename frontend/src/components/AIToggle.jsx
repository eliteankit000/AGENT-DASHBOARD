import { Bot, UserCog } from 'lucide-react'

/**
 * Small pill-style AI on/off toggle. Green = AI, amber = paused (human).
 * Controlled via `enabled` + `onChange(nextEnabled)`.
 */
export default function AIToggle({ enabled, onChange, disabled }) {
  const handleClick = () => {
    if (disabled) return
    onChange?.(!enabled)
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
      data-testid="ai-toggle"
      data-state={enabled ? 'ai' : 'human'}
      title={enabled ? 'AI is handling this chat — click to pause and take over' : 'You are handling this chat — click to hand back to the AI'}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors select-none ' +
        (enabled
          ? 'bg-wa-accent/15 border-wa-accent/50 text-wa-accent hover:bg-wa-accent/25'
          : 'bg-wa-pending/15 border-wa-pending/50 text-wa-pending hover:bg-wa-pending/25') +
        (disabled ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer')
      }
    >
      {enabled ? <Bot size={12} strokeWidth={2.5} /> : <UserCog size={12} strokeWidth={2.5} />}
      <span>AI</span>
      <span
        aria-hidden
        className={
          'relative inline-block w-7 h-3.5 rounded-full transition-colors ' +
          (enabled ? 'bg-wa-accent/70' : 'bg-wa-pending/70')
        }
      >
        <span
          className={
            'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ' +
            (enabled ? 'left-[14px]' : 'left-0.5')
          }
        />
      </span>
      <span className="text-[10px] tracking-normal normal-case opacity-90">
        {enabled ? 'On' : 'Off'}
      </span>
    </button>
  )
}
