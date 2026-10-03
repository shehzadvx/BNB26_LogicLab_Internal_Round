import { useState, useEffect } from 'react'
import { api } from '../api'
import { fmtLength } from '../utils'

const PLATFORMS = [
  { id: 'reels', label: 'Reels' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'linkedin', label: 'LinkedIn' },
]

export default function PlatformTabs({ clip }) {
  const [active, setActive] = useState(null)
  const [results, setResults] = useState({}) // platform -> Adaptation
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If the clip changes (different clip, or saved edits), old adaptations are stale
  const sig = [clip.id, clip.startSec, clip.endSec, clip.hook, clip.caption, clip.hashtags.join(',')].join('|')
  useEffect(() => {
    setResults({})
    setActive(null)
    setError('')
  }, [sig])

  const load = async (platform, force = false) => {
    setActive(platform)
    setError('')
    if (results[platform] && !force) return
    setLoading(true)
    try {
      const a = await api.adaptClip(clip.id, platform)
      setResults((r) => ({ ...r, [platform]: a }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const current = active ? results[active] : null
  const length = clip.endSec - clip.startSec
  const tooLong = current && length > current.maxDurationSec

  return (
    <div className="platform-tabs">
      <div className="tab-row" role="tablist">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === active}
            className={`btn btn-small${p.id === active ? '' : ' btn-ghost'}`}
            disabled={loading}
            onClick={() => load(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!active && <p className="muted">Pick a platform to adapt this clip.</p>}
      {loading && <p className="muted">Adapting for {active}…</p>}
      {error && <div className="error">{error}</div>}

      {!loading && current && (
        <div className="adaptation">
          <div className="muted">
            {current.aspectRatio} · max {current.maxDurationSec}s · your clip {fmtLength(clip.startSec, clip.endSec)}
          </div>
          {tooLong && (
            <div className="error">
              Clip is over the {current.maxDurationSec}s limit for this platform. Trim it above and save.
            </div>
          )}
          <div className="field">
            <label>Hook</label>
            <p className="clip-hook">“{current.hook}”</p>
          </div>
          <div className="field">
            <label>Caption</label>
            <p>{current.caption}</p>
          </div>
          <div className="tags">
            {current.hashtags.map((h) => <span key={h} className="tag">{h}</span>)}
          </div>
          {current.notes && <p className="muted">Notes: {current.notes}</p>}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => load(active, true)}>
            ↻ Regenerate
          </button>
        </div>
      )}
    </div>
  )
}