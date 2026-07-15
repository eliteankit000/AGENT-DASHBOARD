import { Bot } from 'lucide-react'

export default function AiBadge({ className = '' }) {
  return (
    <span
      data-testid="ai-badge"
      className={
        'inline-flex items-center gap-1 rounded-full bg-wa-ai/90 text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ' +
        className
      }
    >
      <Bot size={11} strokeWidth={2.5} />
      AI
    </span>
  )
}
