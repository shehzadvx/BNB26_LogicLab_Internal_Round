import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import ClipCard from '../components/ClipCard'

export default function ResultsPage() {
  const { id } = useParams()
  const [video, setVideo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const videoRef = useRef(null)
  const stopAtRef = useRef(null) // when set, pause the video once currentTime reaches it

  // Load the video + clips
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api.getVideo(id)
      .then((v) => { if (!cancelled) setVideo(v) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Precise "pause at endSec" (timeupdate only fires ~4x/second, rAF is accurate)
  useEffect(() => {
    let raf
    const tick = () => {
      const v = videoRef.current
      const stopAt = stopAtRef.current
      if (v && stopAt != null && !v.paused && v.currentTime >= stopAt) {
        v.pause()
        v.currentTime = stopAt
        stopAtRef.current = null
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const playClip = (clip) => {
    const v = videoRef.current
    if (!v) return
    setSelectedId(clip.id)

    const start = () => {
      stopAtRef.current = clip.endSec
      v.currentTime = clip.startSec
      v.play().catch(() => { /* autoplay blocked or interrupted, user can press play */ })
    }

    // Seeking before metadata has loaded is unreliable, so wait if needed
    if (v.readyState < 1) {
      v.addEventListener('loadedmetadata', start, { once: true })
      v.load()
    } else {
      start()
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading your clips…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="error">{error}</div>
        <p><Link to="/">← Back to upload</Link></p>
      </div>
    )
  }

  const clips = video?.clips ?? []

  if (!video || video.status !== 'done' || clips.length === 0) {
    return (
      <div className="page">
        <div className="card">
          <h2>No clips yet</h2>
          <p className="muted">This video has not been analyzed (status: {video?.status ?? 'unknown'}).</p>
          <Link to="/">← Back to upload</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page results">
      <div className="results-head">
        <Link to="/">← New upload</Link>
        <h2>{video.filename}</h2>
        <span className="muted">{clips.length} clip suggestions</span>
      </div>

      <div className="results-grid">
        <div className="player-col">
          <video
            ref={videoRef}
            className="player"
            src={video.videoUrl}
            controls
            playsInline
            preload="metadata"
          />
          <p className="muted player-hint">Click a clip to play just that section.</p>
        </div>

        <div className="clips-col">
          {clips.map((clip, i) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              index={i}
              selected={clip.id === selectedId}
              onSelect={playClip}
            />
          ))}
        </div>
      </div>
    </div>
  )
}