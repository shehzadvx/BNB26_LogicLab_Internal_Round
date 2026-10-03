import { Router } from 'express'
import { getVideo, getClip, updateClip } from '../store.js'
import { adaptClip } from '../services/adapt.js'
import { generateText } from '../services/gemini.js'

const router = Router()
const isMock = () => process.env.MOCK === 'true'
const ALLOWED = ['startSec', 'endSec', 'hook', 'caption', 'hashtags']
const TONES = ['bold', 'curious', 'friendly']

const MOCK_HOOKS = {
  bold: ['Your workflow is the problem, not you.', 'Quit blaming yourself. Fix the system.', 'Burnout is a bug. Here is the patch.'],
  curious: ['What if burnout is not about effort at all?', 'The real reason creators quit (it is not what you think).', 'Why do the best creators still burn out?'],
  friendly: ["Hey, it's not your fault. Let's fix your workflow.", "If you're tired, you're not alone. Try this.", 'A gentle reminder: the system is the problem.'],
}

const bad = (res, msg, status = 400) => res.status(status).json({ error: msg })

// PATCH /api/clips/:id
router.patch('/:id', (req, res) => {
  const clip = getClip(req.params.id)
  if (!clip) return bad(res, 'Clip not found', 404)

  const changes = {}
  for (const key of ALLOWED) if (key in (req.body || {})) changes[key] = req.body[key]
  if (Object.keys(changes).length === 0) return bad(res, 'No editable fields provided')

  for (const key of ['startSec', 'endSec']) {
    if (key in changes && !(typeof changes[key] === 'number' && Number.isFinite(changes[key]))) {
      return bad(res, `${key} must be a number`)
    }
  }
  for (const key of ['hook', 'caption']) {
    if (key in changes && typeof changes[key] !== 'string') return bad(res, `${key} must be text`)
  }
  if ('hook' in changes && !changes.hook.trim()) return bad(res, 'Hook cannot be empty')
  if ('hashtags' in changes && !(Array.isArray(changes.hashtags) && changes.hashtags.every((h) => typeof h === 'string'))) {
    return bad(res, 'hashtags must be an array of text')
  }

  const start = changes.startSec ?? clip.startSec
  const end = changes.endSec ?? clip.endSec
  const duration = getVideo(clip.videoId)?.durationSec || 0
  if (start < 0) return bad(res, 'startSec must be 0 or more')
  if (start >= end) return bad(res, 'endSec must be after startSec')
  if (duration > 0 && end > duration) return bad(res, `endSec must be at most ${duration}s (video length)`)

  res.json(updateClip(clip.id, changes))
})

// POST /api/clips/:id/hook-variants   body: { tone? }
router.post('/:id/hook-variants', async (req, res) => {
  const clip = getClip(req.params.id)
  if (!clip) return bad(res, 'Clip not found', 404)

  const tone = req.body?.tone
  if (tone && !TONES.includes(tone)) return bad(res, `tone must be one of: ${TONES.join(', ')}`)

  if (isMock()) return res.json({ hooks: MOCK_HOOKS[tone || 'bold'] })

  try {
    const prompt =
      `Write 3 different scroll-stopping hooks (max 12 words each)${tone ? ` in a ${tone} tone` : ''} for this short video clip.\n` +
      `Title: ${clip.title}\nCurrent hook: ${clip.hook}\nCaption: ${clip.caption}\n` +
      `Return JSON only: {"hooks":["...","...","..."]}`
    const raw = await generateText(prompt, { json: true })
    const out = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(out.hooks) || out.hooks.length === 0) throw new Error('Bad Gemini output')
    res.json({ hooks: out.hooks.slice(0, 3) })
  } catch (e) {
    bad(res, e.message || 'Could not generate hooks', 500)
  }
})

// POST /api/clips/:id/adapt   body: { platform }
router.post('/:id/adapt', async (req, res) => {
  const clip = getClip(req.params.id)
  if (!clip) return bad(res, 'Clip not found', 404)
  try {
    res.json(await adaptClip(clip, req.body?.platform, { mock: isMock() }))
  } catch (e) {
    bad(res, e.message || 'Could not adapt clip', e.status || 500)
  }
})

export default router