import { useState } from 'react'
import { api } from '../api'

const STATUSES = ['idea', 'scripted', 'edited', 'ready', 'scheduled']
const PLATFORMS = [['reels', 'Reels'], ['shorts', 'Shorts'], ['linkedin', 'LinkedIn']]

export default function StatusPills({ clip, onChange }) {
  const current = clip.status || 'idea'
  const [picking, setPicking] = useState(false)
  const [when, setWhen] = useState('')
  const [platform, setPlatform] = useState(clip.scheduledPlatform || 'reels')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const apply = async (payload) => {
    setBusy(true)
    setError('')
    try {
      const updated = await api.setClipStatus(clip.id, payload)
      onChange(updated)
      setPicking(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const choose = (s) => {
    if (s === 'scheduled') { setPicking(true); return }
    setPicking(false)
    apply({ status: s })
  }

  const confirmSchedule = () => {
    if (!when) { setError('Pick a date and time'); return }
    apply({ status: 'scheduled', scheduledAt: new Date(when).toISOString(), platform })
  }

  return (
    <div className="status-pills">
      <div className="pill-row">
        {STATUSES.map((s) => (
          <button key={s} type="button" disabled={busy}
            className={`pill ${current === s ? 'active' : ''}`} onClick={() => choose(s)}>
            {s}
          </button>
        ))}
      </div>

      {picking && (
        <div className="schedule-picker">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
            {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="button" className="btn btn-small" disabled={busy} onClick={confirmSchedule}>Schedule</button>
          <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => setPicking(false)}>Cancel</button>
        </div>
      )}

      {current === 'scheduled' && clip.scheduledAt && !picking && (
        <div className="muted">
          Planned for {new Date(clip.scheduledAt).toLocaleString()} on {clip.scheduledPlatform}
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  )
}
