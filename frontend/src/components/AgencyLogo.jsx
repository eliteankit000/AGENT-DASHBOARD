import { useState, useMemo, useEffect } from 'react'

// Deterministic color per agency name so the fallback circle isn't grey
function hashColor(str) {
  if (!str) return '#25D366'
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 65% 42%)`
}

// Accept "friendly" image URLs users often paste and rewrite them to a
// direct-image URL the browser can actually render.
export function normalizeImageUrl(input) {
  if (!input) return ''
  let u = String(input).trim()

  // GitHub "blob" (HTML) → raw.githubusercontent (binary)
  //   https://github.com/user/repo/blob/branch/path
  // → https://raw.githubusercontent.com/user/repo/branch/path
  const gh = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i)
  if (gh) {
    return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`
  }

  // github.com/.../raw/branch/... → raw.githubusercontent.com
  const ghRaw = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/(.+)$/i)
  if (ghRaw) {
    return `https://raw.githubusercontent.com/${ghRaw[1]}/${ghRaw[2]}/${ghRaw[3]}`
  }

  // Google Drive share link → uc?export=view direct link
  //   https://drive.google.com/file/d/FILE_ID/view?...
  // → https://drive.google.com/uc?export=view&id=FILE_ID
  const gd = u.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i)
  if (gd) {
    return `https://drive.google.com/uc?export=view&id=${gd[1]}`
  }

  return u
}

export default function AgencyLogo({ name = '', url = '', size = 40, className = '', testId = 'agency-logo' }) {
  const [failed, setFailed] = useState(false)
  const letter = (name || 'A').trim().charAt(0).toUpperCase() || 'A'
  const bg = useMemo(() => hashColor(name), [name])
  const normalizedUrl = useMemo(() => normalizeImageUrl(url), [url])
  const dimension = { width: size, height: size, minWidth: size, minHeight: size }
  const showFallback = !normalizedUrl || failed

  // Reset the failed flag when the URL changes so a new URL gets a fresh chance
  useEffect(() => { setFailed(false) }, [normalizedUrl])

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
          src={normalizedUrl}
          alt={name || 'Agency logo'}
          className="agency-logo"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          data-testid={`${testId}-img`}
        />
      )}
    </div>
  )
}

