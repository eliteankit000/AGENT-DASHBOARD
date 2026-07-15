export default function PhonePill({ phone, className = '' }) {
  if (!phone) return null
  return (
    <span
      data-testid={`phone-pill-${phone}`}
      className={
        'inline-flex items-center rounded-md bg-wa-hover text-wa-muted text-[11px] font-mono px-2 py-0.5 leading-none ' +
        className
      }
      title={phone}
    >
      {phone}
    </span>
  )
}
