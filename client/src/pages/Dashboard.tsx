import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { urlApi, UrlResponse } from '../api'
import { Link } from 'react-router-dom'
import { Link2, MousePointerClick, TrendingUp, Clock } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

/* ── Placeholder chart data (no aggregate analytics endpoint) ── */
const sampleChartData = [
  { day: 'Mon', clicks: 12 },
  { day: 'Tue', clicks: 28 },
  { day: 'Wed', clicks: 19 },
  { day: 'Thu', clicks: 35 },
  { day: 'Fri', clicks: 42 },
  { day: 'Sat', clicks: 31 },
  { day: 'Sun', clicks: 24 },
]

/* ── Custom recharts tooltip ─────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        fontSize: '0.8rem',
      }}
    >
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--brand-primary-hover)', fontWeight: 700 }}>
        {payload[0].value} clicks
      </p>
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────────── */
function truncateUrl(url: string, max = 50) {
  return url.length > max ? url.slice(0, max) + '…' : url
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

/* ═══════════════════════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { accessToken } = useAuth()
  const [urls, setUrls] = useState<UrlResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    async function fetchUrls() {
      try {
        const data = await urlApi.list(1, 20, accessToken!)
        if (!cancelled) setUrls(data.urls)
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Failed to load URLs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchUrls()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  /* ── Derived stats ───────────────────────────────────── */
  const totalLinks = urls.length
  const totalClicks = urls.reduce((sum, u) => sum + u.clickCount, 0)
  const avgClicks = totalLinks > 0 ? (totalClicks / totalLinks).toFixed(1) : '0'
  const activeLinks = urls.filter((u) => !isExpired(u.expiresAt)).length
  const recentUrls = urls.slice(0, 5)

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  /* ── Error ───────────────────────────────────────────── */
  if (error) {
    return (
      <div className="page-loader">
        <div className="form-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="dashboard-page" style={{ animation: 'fade-in 0.35s ease' }}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your link performance</p>
      </div>

      {/* ── Stats Grid ──────────────────────────────────── */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon">
            <Link2 size={20} />
          </div>
          <span className="stat-label">Total Links</span>
          <span className="stat-value">{totalLinks}</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon">
            <MousePointerClick size={20} />
          </div>
          <span className="stat-label">Total Clicks</span>
          <span className="stat-value">{totalClicks}</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon">
            <TrendingUp size={20} />
          </div>
          <span className="stat-label">Avg Clicks / Link</span>
          <span className="stat-value">{avgClicks}</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon">
            <Clock size={20} />
          </div>
          <span className="stat-label">Active Links</span>
          <span className="stat-value">{activeLinks}</span>
        </div>
      </div>

      {/* ── Click Trend Chart ───────────────────────────── */}
      <div className="glass-card chart-container" style={{ marginBottom: 'var(--space-xl)' }}>
        <h4>Click Trends (Last 7 Days)</h4>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={sampleChartData}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
              width={32}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#818cf8',
                stroke: '#6366f1',
                strokeWidth: 2,
              }}
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Recent URLs ─────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-md)',
          }}
        >
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Recent URLs
          </h4>
          {totalLinks > 5 && (
            <Link to="/urls" className="btn btn-ghost btn-sm">
              View All →
            </Link>
          )}
        </div>

        {recentUrls.length === 0 ? (
          <div className="empty-state">
            <Link2 className="empty-icon" />
            <h3>No links yet</h3>
            <p>Create your first shortened link to get started.</p>
            <Link to="/urls/new" className="btn btn-primary">
              Create Link
            </Link>
          </div>
        ) : (
          <div className="url-table-container">
            <table className="url-table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Original URL</th>
                  <th>Clicks</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentUrls.map((url) => (
                  <tr key={url.id}>
                    <td>
                      <a 
                        href={url.shortUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="url-slug" 
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Click to open link"
                      >
                        /{url.slug}
                      </a>
                    </td>
                    <td>
                      <span className="url-original">{truncateUrl(url.original)}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{url.clickCount}</span>
                    </td>
                    <td>
                      {isExpired(url.expiresAt) ? (
                        <span className="badge badge-error">Expired</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/urls/${url.id}/analytics`}
                        className="btn btn-ghost btn-sm"
                      >
                        View Analytics
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
