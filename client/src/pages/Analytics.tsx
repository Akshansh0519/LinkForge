import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { analyticsApi, urlApi, AnalyticsResponse, UrlResponse } from '../api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { ArrowLeft, MousePointerClick, Globe, Smartphone, ExternalLink } from 'lucide-react'

const COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

const tooltipStyle = {
  backgroundColor: '#1a1a24',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '0.8rem',
}

export default function Analytics() {
  const { id } = useParams<{ id: string }>()
  const { accessToken } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [url, setUrl] = useState<UrlResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetch() {
      if (!id || !accessToken) return
      setLoading(true)
      try {
        const [a, u] = await Promise.all([
          analyticsApi.get(id, accessToken),
          urlApi.get(id, accessToken),
        ])
        setAnalytics(a)
        setUrl(u)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, accessToken])

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>
  if (error) return <div className="form-error" style={{ margin: 40 }}>{error}</div>
  if (!analytics || !url) return null

  return (
    <>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <Link to="/urls" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Links
        </Link>
      </div>

      <div className="page-header">
        <h2>Analytics</h2>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-primary-hover)' }}>/{url.slug}</span>
          <span style={{ color: 'var(--text-tertiary)' }}>→</span>
          <span className="url-original" style={{ maxWidth: 400 }}>{url.original}</span>
          <a href={url.shortUrl} target="_blank" rel="noopener" style={{ display: 'inline-flex' }}>
            <ExternalLink size={14} />
          </a>
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon"><MousePointerClick size={20} /></div>
          <span className="stat-value">{analytics.totalClicks.toLocaleString()}</span>
          <span className="stat-label">Total Clicks</span>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon"><Globe size={20} /></div>
          <span className="stat-value">{analytics.clicksByCountry.length}</span>
          <span className="stat-label">Countries</span>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon"><Smartphone size={20} /></div>
          <span className="stat-value">{analytics.clicksByDevice.length}</span>
          <span className="stat-label">Device Types</span>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon"><ExternalLink size={20} /></div>
          <span className="stat-value">{analytics.clicksByReferrer.length}</span>
          <span className="stat-label">Referrers</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Clicks Over Time */}
        <div className="glass-card chart-container" style={{ gridColumn: 'span 2' }}>
          <h4>Clicks Over Time (Last 30 Days)</h4>
          {analytics.clicksByDay.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No click data yet. Share your link to start tracking!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.clicksByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#818cf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Clicks by Country */}
        <div className="glass-card chart-container">
          <h4>Top Countries</h4>
          {analytics.clicksByCountry.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.clicksByCountry} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis type="category" dataKey="country" tick={{ fill: '#9ca3af', fontSize: 12 }} width={80} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Clicks by Device */}
        <div className="glass-card chart-container">
          <h4>Device Breakdown</h4>
          {analytics.clicksByDevice.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.clicksByDevice}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="device"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={((props: any) =>
                    `${props.device || ''} ${((props.percent as number) * 100).toFixed(0)}%`
                  ) as any}
                >
                  {analytics.clicksByDevice.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Referrers Table */}
      {analytics.clicksByReferrer.length > 0 && (
        <div className="glass-card" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-lg)' }}>
          <h4 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Top Referrers</h4>
          <table className="url-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Clicks</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {analytics.clicksByReferrer.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{r.referrer}</td>
                  <td style={{ fontWeight: 600 }}>{r.count.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        height: 6, borderRadius: 3,
                        background: COLORS[i % COLORS.length],
                        width: `${Math.max(10, (r.count / analytics.totalClicks) * 200)}px`,
                        transition: 'width 0.5s ease',
                      }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {((r.count / analytics.totalClicks) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
