import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Link2, Zap, Shield, BarChart3, Copy, Check, ArrowRight } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShorten = (e: React.FormEvent) => {
    e.preventDefault()
    // Auth is required — redirect to register
    navigate('/register')
  }

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="landing-page">
      {/* ── Nav ─────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="logo">
          <Link2 size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          LinkForge
        </div>
        <div className="nav-actions">
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/register" className="btn btn-primary">
            Sign Up <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="landing-hero">
        <h1>
          Shorten. Track.<br />
          <span>Analyze.</span>
        </h1>
        <p>
          Transform long URLs into powerful short links with real-time analytics,
          custom slugs, and blazing-fast redirects.
        </p>

        {/* ── Shortener Bar ──────────────────────────── */}
        <form className="landing-shortener glass-card" onSubmit={handleShorten}>
          <input
            type="url"
            className="input"
            placeholder="Paste a long URL here…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">
            <Link2 size={16} />
            Shorten
          </button>
        </form>

        {/* ── Result ─────────────────────────────────── */}
        {result && (
          <div className="landing-result glass-card">
            <span className="short-url">{result}</span>
            <button className="btn btn-secondary copy-btn" onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </section>

      {/* ── Features Grid ───────────────────────────── */}
      <section className="landing-features">
        <div className="feature-card glass-card">
          <div className="feature-icon">
            <Zap size={24} />
          </div>
          <h3>Blazing Fast</h3>
          <p>
            Redis-powered cache-aside pattern delivers sub-10ms redirects.
            Your users never wait.
          </p>
        </div>

        <div className="feature-card glass-card">
          <div className="feature-icon">
            <BarChart3 size={24} />
          </div>
          <h3>Real-time Analytics</h3>
          <p>
            Track clicks by country, device, and referrer. Beautiful dashboards
            with actionable insights.
          </p>
        </div>

        <div className="feature-card glass-card">
          <div className="feature-icon">
            <Shield size={24} />
          </div>
          <h3>Enterprise Security</h3>
          <p>
            JWT authentication, sliding-window rate limiting, and Helmet
            security headers built-in.
          </p>
        </div>
      </section>
    </div>
  )
}
