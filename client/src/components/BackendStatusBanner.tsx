import { useState, useEffect } from 'react'
import { Zap, ServerCrash, CheckCircle2, X, RefreshCw } from 'lucide-react'

type ServerStatus = 'CHECKING' | 'WAKING_UP' | 'ONLINE' | 'DISMISSED'

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * BackendStatusBanner
 *
 * Polls GET /api/health every 3 seconds.
 * - While the Render free-tier server is cold-starting (50s warm-up), shows an
 *   amber "Waking Up" banner with a pulsing indicator and attempt counter.
 * - Once the server responds 200 OK, switches to a green "All Systems Live" card
 *   that auto-dismisses after 4 seconds.
 *
 * Only renders in production (VITE_API_URL is set). Hidden completely in dev
 * where the proxy points at localhost which is always instantly available.
 */
export default function BackendStatusBanner() {
  const [status, setStatus] = useState<ServerStatus>('CHECKING')
  const [attempt, setAttempt] = useState(0)
  const [autoDismissing, setAutoDismissing] = useState(false)

  // Only show if pointing at a real remote backend
  const isProduction = !!import.meta.env.VITE_API_URL

  useEffect(() => {
    if (!isProduction) return

    let isMounted = true
    let timer: ReturnType<typeof setTimeout>
    let dismissTimer: ReturnType<typeof setTimeout>

    const checkHealth = async () => {
      if (!isMounted) return

      try {
        const res = await fetch(`${API_BASE}/api/health`, {
          signal: AbortSignal.timeout(5000),
        })

        if (!isMounted) return

        if (res.ok) {
          setStatus('ONLINE')
          // Auto-dismiss after 4 seconds
          setAutoDismissing(true)
          dismissTimer = setTimeout(() => {
            if (isMounted) setStatus('DISMISSED')
          }, 4000)
        } else {
          throw new Error(`${res.status}`)
        }
      } catch {
        if (!isMounted) return
        setStatus('WAKING_UP')
        setAttempt((prev) => prev + 1)
        // Retry in 3 seconds
        timer = setTimeout(checkHealth, 3000)
      }
    }

    checkHealth()

    return () => {
      isMounted = false
      clearTimeout(timer)
      clearTimeout(dismissTimer)
    }
  }, [isProduction])

  if (!isProduction || status === 'DISMISSED') return null

  return (
    <div className="backend-status-banner-wrapper">
      {/* ── Waking Up / Checking card ── */}
      {(status === 'CHECKING' || status === 'WAKING_UP') && (
        <div className="bsb-card bsb-card--warning">
          {/* Top accent bar */}
          <div className="bsb-accent-bar bsb-accent-bar--warning" />

          <div className="bsb-header">
            <div className="bsb-header-left">
              <span className="bsb-pulse-dot bsb-pulse-dot--warning">
                <span className="bsb-pulse-ring" />
                <span className="bsb-pulse-core bsb-pulse-core--warning" />
              </span>
              <ServerCrash size={15} className="bsb-icon--warning" />
              <span className="bsb-title bsb-title--warning">Render Free Tier — Cold Start</span>
            </div>
            <span className="bsb-attempt-badge">
              Attempt #{attempt || 1}
            </span>
          </div>

          <p className="bsb-body">
            The LinkForge API runs on{' '}
            <strong>Render's free tier</strong> and sleeps after 15 min of
            inactivity. It's waking up now —{' '}
            <span className="bsb-highlight--warning">~30–50 s warm-up</span>.
            <span className="bsb-subtext">
              Keep this tab open. The banner disappears the instant the server
              returns&nbsp;200&nbsp;OK.
            </span>
          </p>

          {/* Service row */}
          <div className="bsb-services">
            <div className="bsb-service-row">
              <span className="bsb-service-label">
                <Zap size={12} />
                Express API (Render)
              </span>
              <span className="bsb-badge bsb-badge--waking">
                <RefreshCw size={10} className="bsb-spin" />
                Waking up…
              </span>
            </div>
            <div className="bsb-service-row">
              <span className="bsb-service-label">
                <Zap size={12} />
                PostgreSQL (Neon)
              </span>
              <span className="bsb-badge bsb-badge--standby">Standby</span>
            </div>
            <div className="bsb-service-row">
              <span className="bsb-service-label">
                <Zap size={12} />
                Redis Cache (Upstash)
              </span>
              <span className="bsb-badge bsb-badge--standby">Standby</span>
            </div>
          </div>

          <div className="bsb-footer">
            <span>Checking every 3 s</span>
            <button
              className="bsb-dismiss-link"
              onClick={() => setStatus('DISMISSED')}
            >
              Hide Warning
            </button>
          </div>
        </div>
      )}

      {/* ── All Systems Live card ── */}
      {status === 'ONLINE' && (
        <div className="bsb-card bsb-card--success">
          <div className="bsb-accent-bar bsb-accent-bar--success" />

          <div className="bsb-header">
            <div className="bsb-header-left">
              <span className="bsb-pulse-dot bsb-pulse-dot--success">
                <span className="bsb-pulse-ring bsb-pulse-ring--success" />
                <span className="bsb-pulse-core bsb-pulse-core--success" />
              </span>
              <CheckCircle2 size={15} className="bsb-icon--success" />
              <span className="bsb-title bsb-title--success">All Systems Live</span>
            </div>
            <button
              className="bsb-close-btn"
              onClick={() => setStatus('DISMISSED')}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          <p className="bsb-body">
            LinkForge API returned{' '}
            <strong className="bsb-highlight--success">200 OK</strong>. The
            Express server, PostgreSQL database, and Redis cache are all
            operational. You're good to go!
          </p>

          <button
            className="bsb-cta"
            onClick={() => setStatus('DISMISSED')}
          >
            Got It — Start Shortening Links 🔗
          </button>

          {autoDismissing && (
            <p className="bsb-auto-dismiss">Auto-dismissing in 4 seconds…</p>
          )}
        </div>
      )}
    </div>
  )
}
