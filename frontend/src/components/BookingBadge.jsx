import { CheckCircle2, XCircle, Clock } from 'lucide-react'

const styles = {
  confirmed: { bg: 'bg-wa-confirmed/15', text: 'text-wa-confirmed', border: 'border-wa-confirmed/40', Icon: CheckCircle2, label: 'Confirmed' },
  cancelled: { bg: 'bg-wa-cancelled/15', text: 'text-wa-cancelled', border: 'border-wa-cancelled/40', Icon: XCircle, label: 'Cancelled' },
  pending:   { bg: 'bg-wa-pending/15',   text: 'text-wa-pending',   border: 'border-wa-pending/40',   Icon: Clock,       label: 'Pending' }
}

export default function BookingBadge({ status = 'pending', size = 'md', className = '' }) {
  const key = (status || 'pending').toLowerCase()
  const s = styles[key] || styles.pending
  const Icon = s.Icon
  const sizing = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span
      data-testid={`booking-badge-${key}`}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${s.bg} ${s.text} ${s.border} ${sizing} ${className}`}
    >
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.5} />
      {s.label}
    </span>
  )
}
