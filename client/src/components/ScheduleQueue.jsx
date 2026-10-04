import { useEffect, useState } from 'react'
import { api } from '../api'

export default function ScheduleQueue() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getSchedule()
      setItems(data.items || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <section className="card schedule-queue">
      <div className="banner">
        Planned queue only. Nothing is published automatically. Real publishing is future scope.
      </div>
      <button type="button" className="btn btn-ghost btn-small" onClick={load} disabled={loading}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
      {error && <div className="error">{error}</div>}
      {!loading && !error && items.length === 0 && <p className="muted">Nothing scheduled yet.</p>}
      <ul className="queue-list">
        {items.map((it) => (
          <li key={it.clipId} className="queue-item">
            <strong>{it.title}</strong>
            <span className="muted"> {it.platform} · {new Date(it.scheduledAt).toLocaleString()} · {it.filename}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
