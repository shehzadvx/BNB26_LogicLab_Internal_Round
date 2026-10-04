import { Router } from 'express'
import { getVideo, saveVideo } from '../store.js'

const router = Router()
const TYPES = ['snippet', 'link', 'note']

// ids look like <videoId>_a1, <videoId>_a2 ... (never reused after a delete)
function nextId(video) {
  const nums = (video.assets || [])
    .map((a) => Number(String(a.id).slice(String(a.id).lastIndexOf('_a') + 2)))
    .filter(Number.isFinite)
  return `${video.id}_a${(nums.length ? Math.max(...nums) : 0) + 1}`
}

// 12: list assets for a video (old videos have no `assets` field -> empty list)
router.get('/videos/:id/assets', (req, res) => {
  const video = getVideo(req.params.id)
  if (!video) return res.status(404).json({ error: 'Video not found' })
  res.json({ assets: video.assets || [] })
})

// 13: add an asset
router.post('/videos/:id/assets', (req, res) => {
  const video = getVideo(req.params.id)
  if (!video) return res.status(404).json({ error: 'Video not found' })

  const { type, title, content } = req.body || {}
  const t = typeof title === 'string' ? title.trim() : ''
  const c = typeof content === 'string' ? content.trim() : ''

  if (!TYPES.includes(type)) return res.status(400).json({ error: 'type must be snippet, link or note' })
  if (!t) return res.status(400).json({ error: 'title is required' })
  if (t.length > 80) return res.status(400).json({ error: 'title must be at most 80 characters' })
  if (!c) return res.status(400).json({ error: 'content is required' })
  if (c.length > 2000) return res.status(400).json({ error: 'content must be at most 2000 characters' })
  if (type === 'link' && !/^https?:\/\/\S+$/i.test(c)) {
    return res.status(400).json({ error: 'link must start with http:// or https://' })
  }

  const asset = {
    id: nextId(video),
    videoId: video.id,
    type,
    title: t,
    content: c,
    createdAt: new Date().toISOString(),
  }
  video.assets = [...(video.assets || []), asset]
  saveVideo(video)
  res.status(201).json(asset)
})

// 14: delete an asset
router.delete('/videos/:id/assets/:assetId', (req, res) => {
  const video = getVideo(req.params.id)
  if (!video) return res.status(404).json({ error: 'Video not found' })
  const assets = video.assets || []
  if (!assets.some((a) => a.id === req.params.assetId)) {
    return res.status(404).json({ error: 'Asset not found' })
  }
  video.assets = assets.filter((a) => a.id !== req.params.assetId)
  saveVideo(video)
  res.json({ ok: true })
})

export default router
