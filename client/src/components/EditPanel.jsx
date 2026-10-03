import { useState } from 'react'
import { api } from '../api'
import { fmtLength } from '../utils'
import PlatformTabs from './PlatformTabs'

const TONES = [
  { value: '', label: 'Any tone' },
  { value: 'bold', label: 'Bold' },
  { value: 'curious', label: 'Curious' },
  { value: 'friendly', label: 'Friendly' },
]

const toNum = (s) => (s.trim() === '' ? NaN : Number(s))

// "#a, b  #c" -> ["#a", "#b", "#c"] (deduped, always starts with #)
function parseTags(str) {
  const seen = new Set()
  const out = []
  for (const raw of str.split(/[\s,]+/)) {
    const word = raw.replace(/^#+/, '').trim()
    if (!word) continue
    const tag = '#' + word
    if (seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    out.push(tag)
  }
  return out
}

const sameTags = (a, b) => a.length === b.length && a.every((t, i) => t === b[i])

export default function EditPanel({ clip, durationSec, getTime, onPreview, onSaved }) {
  // Drafts (strings for the number inputs so typing feels natural)
  const [startStr, setStartStr] = useState(String(clip.startSec))
  const [endStr, setEndStr] = useState(String(clip.endSec))
  const [hook, setHook] = useState(clip.hook)
  const [caption, setCaption] = useState(clip.caption)
  const [tagsStr, setTagsStr] = useState(clip.hashtags.join(' '))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [tone, setTone] = useState('')
  const [variants, setVariants] = useState([])
  const [loadingHooks, setLoadingHooks] = useState(false)

  const start = toNum(startStr)
  const end = toNum(endStr)
  const tags = parseTags(tagsStr)

  // ---- validation ----
  const problems = {}
  if (Number.isNaN(start)) problems.start = 'Enter a number'
  else if (start < 0) problems.start = 'Must be 0 or more'
  if (Number.isNaN(end)) problems.end = 'Enter a number'
  else if (end > durationSec) problems.end = `Must be at most ${durationSec}s (video length)`
  if (!problems.start && !problems.end && start >= end) problems.end = 'End must be after start'
  if (!hook.trim()) problems.hook = 'Hook cannot be empty'
  const hasProblems = Object.keys(problems).length > 0
  const timingOk = !problems.start && !problems.end

  // ---- only send what changed ----
  const changes = {}
  if (timingOk && start !== clip.startSec) changes.startSec = start
  if (timingOk && end !== clip.endSec) changes.endSec = end
  if (hook.trim() !== clip.hook) changes.hook = hook.trim()
  if (caption.trim() !== clip.caption) changes.caption = caption.trim()
  if (!sameTags(tags, clip.hashtags)) changes.hashtags = tags
  const dirty = Object.keys(changes).length > 0
  const canSave = dirty && !hasProblems && !saving

  const stamp = () => String(Math.round(getTime() * 10) / 10)

  const save = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await api.patchClip(clip.id, changes)
      onSaved(updated)
      // sync drafts with what the server returned
      setStartStr(String(updated.startSec))
      setEndStr(String(updated.endSec))
      setHook(updated.hook)
      setCaption(updated.caption)
      setTagsStr(updated.hashtags.join(' '))
      setNotice('Saved')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const regenerate = async () => {
    setLoadingHooks(true)
    setError('')
    try {
      const res = await api.hookVariants(clip.id, tone || undefined)
      setVariants(res.hooks || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingHooks(false)
    }
  }

  const reset = () => {
    setStartStr(String(clip.startSec))
    setEndStr(String(clip.endSec))
    setHook(clip.hook)
    setCaption(clip.caption)
    setTagsStr(clip.hashtags.join(' '))
    setError('')
    setNotice('')
  }

  return (
    <div className="card edit-panel">
      <h4 className="edit-title">Edit clip</h4>

      {/* ---- trim ---- */}
      <div className="edit-section">
        <div className="edit-row">
          <div className="field">
            <label htmlFor={`${clip.id}-start`}>Start (s)</label>
            <input
              id={`${clip.id}-start`}
              type="number" step="0.1" min="0" max={durationSec}
              value={startStr}
              onChange={(e) => { setStartStr(e.target.value); setNotice('') }}
            />
            {problems.start && <div className="field-error">{problems.start}</div>}
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setStartStr(stamp())}>
              Use player time
            </button>
          </div>

          <div className="field">
            <label htmlFor={`${clip.id}-end`}>End (s)</label>
            <input
              id={`${clip.id}-end`}
              type="number" step="0.1" min="0" max={durationSec}
              value={endStr}
              onChange={(e) => { setEndStr(e.target.value); setNotice('') }}
            />
            {problems.end && <div className="field-error">{problems.end}</div>}
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setEndStr(stamp())}>
              Use player time
            </button>
          </div>
        </div>

        <div className="edit-meta muted">
          Video length {durationSec}s
          {timingOk && <> · clip length {fmtLength(start, end)}</>}
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={!timingOk}
            onClick={() => onPreview(start, end)}
          >
            ▶ Preview trim
          </button>
        </div>
      </div>

      {/* ---- hook ---- */}
      <div className="edit-section">
        <div className="field">
          <label htmlFor={`${clip.id}-hook`}>Hook</label>
          <input
            id={`${clip.id}-hook`}
            type="text"
            value={hook}
            onChange={(e) => { setHook(e.target.value); setNotice('') }}
          />
          {problems.hook && <div className="field-error">{problems.hook}</div>}
        </div>

        <div className="hook-tools">
          <select value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Hook tone">
            {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button type="button" className="btn btn-ghost btn-small" disabled={loadingHooks} onClick={regenerate}>
            {loadingHooks ? 'Generating…' : '✨ Regenerate hook'}
          </button>
        </div>

        {variants.length > 0 && (
          <div className="hook-options">
            <div className="muted">Pick one (applies to the field above, then Save):</div>
            {variants.map((h) => (
              <button
                type="button"
                key={h}
                className={`hook-option${hook === h ? ' picked' : ''}`}
                onClick={() => { setHook(h); setNotice('') }}
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- caption + hashtags ---- */}
      <div className="edit-section">
        <div className="field">
          <label htmlFor={`${clip.id}-caption`}>Caption</label>
          <textarea
            id={`${clip.id}-caption`}
            rows={3}
            value={caption}
            onChange={(e) => { setCaption(e.target.value); setNotice('') }}
          />
        </div>

        <div className="field">
          <label htmlFor={`${clip.id}-tags`}>Hashtags (space or comma separated)</label>
          <input
            id={`${clip.id}-tags`}
            type="text"
            value={tagsStr}
            onChange={(e) => { setTagsStr(e.target.value); setNotice('') }}
          />
          <div className="tags">
            {tags.map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="edit-actions">
        <button type="button" className="btn" disabled={!canSave} onClick={save}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={!dirty || saving} onClick={reset}>
          Discard
        </button>
        {notice && <span className="saved-note">✓ {notice}</span>}
        {!dirty && !notice && <span className="muted">No changes</span>}
      </div>
      <div className="edit-section">
        <h4 className="edit-title">Adapt for platform</h4>
        <PlatformTabs clip={clip} />
      </div>
    </div>
    
  )
}