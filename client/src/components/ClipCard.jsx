import { fmtRange, fmtLength } from '../utils'
import StatusBadge from './StatusBadge'

export default function ClipCard({ clip, index, selected, onSelect }) {
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(clip)
    }
  }

  return (
    <div
      className={`card clip-card${selected ? ' selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(clip)}
      onKeyDown={handleKey}
    >
      <div className="clip-card-head">
        <span className="clip-index">#{index + 1}</span>
        <h3 className="clip-title">{clip.title}</h3>
        {clip.edited && <span className="badge">edited</span>}
        <StatusBadge status={clip.status} />
      </div>

      <div className="clip-time muted">
        {fmtRange(clip.startSec, clip.endSec)} · {fmtLength(clip.startSec, clip.endSec)}
      </div>

      <p className="clip-hook">“{clip.hook}”</p>
      <p className="clip-caption muted">{clip.caption}</p>

      <div className="tags">
        {clip.hashtags.map((h) => (
          <span key={h} className="tag">{h}</span>
        ))}
      </div>
    </div>
  )
}
