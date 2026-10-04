import { useEffect, useState } from 'react'
import { api } from '../api'

const TYPES = [['snippet', 'Snippet'], ['link', 'Link'], ['note', 'Note']]

export default function AssetLibrary({ videoId }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('snippet')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiedId, setCopiedId] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.listAssets(videoId)
      setAssets(res.assets || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [videoId])

  const add = async () => {
    setBusy(true)
    setError('')
    try {
      const created = await api.addAsset(videoId, { type, title, content })
      setAssets((prev) => [...prev, created])
      setTitle('')
      setContent('')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (assetId) => {
    setError('')
    try {
      await api.deleteAsset(videoId, assetId)
      setAssets((prev) => prev.filter((a) => a.id !== assetId))
    } catch (e) {
      setError(e.message)
    }
  }

  const copy = async (a) => {
    try {
      await navigator.clipboard.writeText(a.content)
      setCopiedId(a.id)
      setTimeout(() => setCopiedId(''), 1500)
    } catch {
      setError('Clipboard blocked by the browser')
    }
  }

  return (
    <section className="card asset-library">
      <h4 className="edit-title">Asset library</h4>
      <p className="muted">Reusable text snippets, links and notes for this video. No file uploads (future scope).</p>

      <div className="asset-form">
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Asset type">
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="text" placeholder="Title" maxLength={80}
          value={title} onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          rows={2} maxLength={2000}
          placeholder={type === 'link' ? 'https://...' : 'Text to reuse'}
          value={content} onChange={(e) => setContent(e.target.value)}
        />
        <button type="button" className="btn btn-small" disabled={busy} onClick={add}>
          {busy ? 'Adding…' : 'Add asset'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !error && assets.length === 0 && <p className="muted">No assets yet.</p>}

      <ul className="asset-list">
        {assets.map((a) => (
          <li key={a.id} className="asset-item">
            <div>
              <span className="status-badge">{a.type}</span> <strong>{a.title}</strong>
              <div className="asset-content">
                {a.type === 'link'
                  ? <a href={a.content} target="_blank" rel="noreferrer">{a.content}</a>
                  : a.content}
              </div>
            </div>
            <div className="asset-actions">
              <button type="button" className="btn btn-ghost btn-small" onClick={() => copy(a)}>
                {copiedId === a.id ? 'Copied' : 'Copy'}
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => remove(a.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
