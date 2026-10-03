import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const STEPS = [
  { id: 'uploading', label: 'Uploading your video' },
  { id: 'analyzing', label: 'Matching your script to the footage' },
  { id: 'clips', label: 'Writing hooks, captions and hashtags' },
]

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [script, setScript] = useState('')
  const [stage, setStage] = useState('idle') // idle | uploading | analyzing
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const busy = stage !== 'idle'
  const canSubmit = file && script.trim() && !busy

  const pickFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('video/')) {
      setError('Please choose a video file (mp4, mov, webm).')
      return
    }
    setError('')
    setFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    pickFile(e.dataTransfer.files?.[0])
  }

  const clearFile = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      setStage('uploading')
      const video = await api.uploadVideo(file, script.trim())
      setStage('analyzing')
      await api.analyzeVideo(video.id)
      navigate(`/videos/${video.id}`)
    } catch (err) {
      setError(err.message)
      setStage('idle')
    }
  }

  const label = { idle: 'Find my clips', uploading: 'Uploading video...', analyzing: 'AI is reading your script and video...' }[stage]

  // ---------- analyzing / uploading view ----------
  if (busy) {
    const activeIndex = stage === 'uploading' ? 0 : 1
    return (
      <div className="hero">
        <div className="card analyzing">
          <div className="analyzing-head">
            <span className="spinner" aria-hidden="true" />
            <div>
              <h2 className="analyzing-title">{label}</h2>
              <p className="muted analyzing-sub">This can take a little while for longer videos.</p>
            </div>
          </div>

          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className={i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}>
                <span className="step-dot">{i < activeIndex ? '✓' : i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>

          <div className="skeleton-list" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="sk sk-title" />
                <div className="sk sk-line" />
                <div className="sk sk-line short" />
                <div className="sk-tags"><div className="sk sk-tag" /><div className="sk sk-tag" /><div className="sk sk-tag" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---------- idle view ----------
  return (
    <div className="hero">
      <div className="hero-head">
        <span className="hero-pill">AI Creator Operating Platform</span>
        <h1>Turn one video into short-form clips</h1>
        <p className="muted hero-sub">
          Upload a 2-5 minute video and its script. We find the best moments, write hooks and captions,
          adapt them for each platform, and you stay in control of every edit.
        </p>
      </div>

      <form className="card hero-form" onSubmit={handleSubmit}>
        <div className="field">
          <span>Video file</span>
          <div
            className={`dropzone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => pickFile(e.target.files[0])}
            />
            {file ? (
              <div className="file-chip">
                <span className="file-icon" aria-hidden="true">🎬</span>
                <div className="file-info">
                  <strong>{file.name}</strong>
                  <small className="muted">{(file.size / 1024 / 1024).toFixed(1)} MB · click to change</small>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={(e) => { e.stopPropagation(); clearFile() }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="drop-empty">
                <div className="drop-icon" aria-hidden="true">⬆</div>
                <strong>Drag and drop your video here</strong>
                <span className="muted">or click to browse · MP4, MOV, WebM</span>
              </div>
            )}
          </div>
        </div>

        <label className="field">
          <span>Script</span>
          <textarea
            rows={8}
            placeholder="Paste your script here..."
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="btn btn-large" type="submit" disabled={!canSubmit}>{label}</button>
      </form>
    </div>
  )
}