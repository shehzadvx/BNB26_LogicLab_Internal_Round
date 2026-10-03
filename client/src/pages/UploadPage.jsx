import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [script, setScript] = useState('')
  const [stage, setStage] = useState('idle') // idle | uploading | analyzing
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const busy = stage !== 'idle'
  const canSubmit = file && script.trim() && !busy

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

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1>Turn one video into short-form clips</h1>
      <p className="muted">Upload a 2-5 minute video and its script. We find the best moments, write hooks and captions, and you stay in control.</p>

      <label className="field">
        <span>Video file</span>
        <input type="file" accept="video/*" disabled={busy} onChange={(e) => setFile(e.target.files[0] || null)} />
        {file && <small className="muted">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</small>}
      </label>

      <label className="field">
        <span>Script</span>
        <textarea rows={8} placeholder="Paste your script here..." value={script} disabled={busy} onChange={(e) => setScript(e.target.value)} />
      </label>

      {error && <div className="error">{error}</div>}

      <button className="btn" type="submit" disabled={!canSubmit}>{label}</button>
    </form>
  )
}