import { useState } from 'react'
import { api } from '../api'

export default function ExportButton({ clip, platform }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setMsg('')
    try {
      const out = await api.exportPost(clip.id, platform)
      let copied = true
      try { await navigator.clipboard.writeText(out.text) } catch { copied = false }
      const file = `${out.text}\n\n---\nVideo file: ${out.videoFile}\nTrim: ${out.trim.startSec}s to ${out.trim.endSec}s\n`
      const url = URL.createObjectURL(new Blob([file], { type: 'text/plain' }))
      const a = document.createElement('a')
      a.href = url
      a.download = out.filename || `${clip.id}.txt`
      a.click()
      URL.revokeObjectURL(url)
      setMsg(copied ? 'Copied and downloaded' : 'Downloaded (clipboard blocked by browser)')
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="export-row">
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={run}>
        {busy ? 'Exporting…' : 'Export post'}
      </button>
      {msg && <span className="muted"> {msg}</span>}
    </div>
  )
}
