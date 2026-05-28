import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { urlApi, UrlResponse } from '../api'
import { Link } from 'react-router-dom'
import {
  Plus, Copy, Check, Trash2, BarChart3, ExternalLink, QrCode,
  Link2, Search
} from 'lucide-react'

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: UrlResponse) => void }) {
  const { accessToken } = useAuth()
  const [original, setOriginal] = useState('')
  const [slug, setSlug] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!original) return
    setLoading(true)
    setError('')
    try {
      const data: { original: string; slug?: string; expiresAt?: string } = { original }
      if (slug.trim()) data.slug = slug.trim()
      if (expiresAt) data.expiresAt = new Date(expiresAt).toISOString()
      const url = await urlApi.create(data, accessToken!)
      onCreated(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create URL')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Short Link</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div className="input-group">
              <label>Destination URL *</label>
              <input
                className="input"
                type="url"
                placeholder="https://example.com/very-long-url"
                value={original}
                onChange={e => setOriginal(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="input-group">
              <label>Custom Slug (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="my-custom-slug"
                value={slug}
                onChange={e => setSlug(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Expires At (optional)</label>
              <input
                className="input"
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !original}>
              {loading ? <span className="spinner" /> : <Plus size={16} />}
              Create Link
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UrlsPage() {
  const { accessToken } = useAuth()
  const [urls, setUrls] = useState<UrlResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function fetchUrls() {
    if (!accessToken) return
    setLoading(true)
    try {
      const data = await urlApi.list(page, 10, accessToken)
      setUrls(data.urls)
      setTotalPages(data.pages)
    } catch {
      // handle error silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUrls() }, [page, accessToken])

  async function handleDelete(id: string) {
    if (!confirm('Delete this link?')) return
    try {
      await urlApi.delete(id, accessToken!)
      setUrls(urls.filter(u => u.id !== id))
    } catch {
      // handle error
    }
  }

  function handleCopy(shortUrl: string, id: string) {
    navigator.clipboard.writeText(shortUrl)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleCreated(url: UrlResponse) {
    setUrls(prev => [url, ...prev])
    setShowCreate(false)
  }

  const filtered = urls.filter(u =>
    u.slug.toLowerCase().includes(search.toLowerCase()) ||
    u.original.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Links</h2>
          <p>Manage all your shortened URLs</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Link
        </button>
      </div>

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input"
            placeholder="Search links..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <Link2 className="empty-icon" />
          <h3>No links yet</h3>
          <p>Create your first short link to get started with analytics tracking.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create First Link
          </button>
        </div>
      ) : (
        <>
          <div className="glass-card url-table-container">
            <table className="url-table">
              <thead>
                <tr>
                  <th>Short Link</th>
                  <th>Destination</th>
                  <th>Clicks</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(url => (
                  <tr key={url.id}>
                    <td>
                      <span className="url-slug" onClick={() => handleCopy(url.shortUrl, url.id)}>
                        /{url.slug}
                      </span>
                    </td>
                    <td>
                      <span className="url-original" title={url.original}>{url.original}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{url.clickCount.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                      {new Date(url.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {url.expiresAt && new Date(url.expiresAt) < new Date() ? (
                        <span className="badge badge-error">Expired</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td>
                      <div className="url-actions">
                        <button
                          className="btn btn-ghost btn-icon copy-btn"
                          onClick={() => handleCopy(url.shortUrl, url.id)}
                          title="Copy short URL"
                        >
                          {copied === url.id ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                        </button>
                        <Link to={`/analytics/${url.id}`} className="btn btn-ghost btn-icon" title="View analytics">
                          <BarChart3 size={14} />
                        </Link>
                        <a href={url.shortUrl} target="_blank" rel="noopener" className="btn btn-ghost btn-icon" title="Open link">
                          <ExternalLink size={14} />
                        </a>
                        <Link to={`/qr/${url.id}`} className="btn btn-ghost btn-icon" title="QR Code">
                          <QrCode size={14} />
                        </Link>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(url.id)} title="Delete">
                          <Trash2 size={14} color="var(--error)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                Previous
              </button>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </>
  )
}
