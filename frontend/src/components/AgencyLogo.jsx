import { useState, useMemo } from 'react'

// Deterministic color per agency name so the fallback circle isn't grey
function hashColor(str) {
  if (!str) return '#25D366'
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 65% 42%)`
}

export default function AgencyLogo({ name = '', url = '', size = 40, className = '', testId = 'agency-logo' }) {
  const [failed, setFailed] = useState(false)
  const letter = (name || 'A').trim().charAt(0).toUpperCase() || 'A'
  const bg = useMemo(() => hashColor(name), [name])
  const dimension = { width: size, height: size, minWidth: size, minHeight: size }
  const showFallback = !url || failed

  return (
    <div
      className={`agency-logo-container border border-wa-border ${className}`}
      style={{ ...dimension, backgroundColor: showFallback ? bg : 'var(--bg-hover)' }}
      title={name || undefined}
      data-testid={testId}
    >
      {showFallback ? (
        <span
          className="text-white font-semibold select-none"
          style={{ fontSize: Math.max(12, Math.round(size * 0.42)) }}
          data-testid={`${testId}-fallback`}
        >
          {letter}
        </span>
      ) : (
        <img
          src={url}
          alt={name || 'Agency logo'}
          className="agency-logo"
          onError={() => setFailed(true)}
          data-testid={`${testId}-img`}
        />
      )}
    </div>
  )
}
