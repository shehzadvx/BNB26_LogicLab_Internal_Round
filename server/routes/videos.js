import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getVideo, listVideos, saveVideo } from '../store.js'
import { analyzeVideo } from '../services/gemini.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
const SAMPLE_PATH = path.join(__dirname, '..', 'data', 'sample-analysis.json')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// give each upload an id BEFORE multer runs, so the file is saved as <id>.<ext>
const assignId = (req, res, next) => {
  req.videoId = 'v' + Date.now()
  next()
}

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, req.videoId + (path.extname(file.originalname) || '.mp4')),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
})

// mock/cached result: sample data with the real video's id, url and (scaled) times
function fromSample(video) {
  const sample = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'))
  const scale = video.durationSec > 0 ? video.durationSec / sample.durationSec : 1
  const t = (n) => Math.round(n * scale * 10) / 10
  return {
    durationSec: video.durationSec > 0 ? video.durationSec : sample.durationSec,
    sections: sample.sections.map((s) => ({ ...s, startSec: t(s.startSec), endSec: t(s.endSec) })),
    clips: sample.clips.map((c, i) => ({
      ...c,
      id: `${video.id}_c${i + 1}`,
      videoId: video.id,
      startSec: t(c.startSec),
      endSec: t(c.endSec),
      edited: false,
    })),
  }
}

const router = Router()

// POST /api/videos  (multipart: video, script, optional durationSec)
router.post('/', assignId, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing video file (field "video")' })
  const script = (req.body.script || '').trim()
  if (!script) return res.status(400).json({ error: 'Missing script' })

  const video = {
    id: req.videoId,
    filename: req.file.originalname,
    videoUrl: `/uploads/${req.file.filename}`,
    script,
    durationSec: Number(req.body.durationSec) || 0,
    status: 'uploaded',
    sections: [],
    clips: [],
  }
  saveVideo(video)
  res.json(video)
})

// POST /api/videos/:id/analyze
router.post('/:id/analyze', async (req, res) => {
  const video = getVideo(req.params.id)
  if (!video) return res.status(404).json({ error: 'Video not found' })

  try {
    saveVideo({ ...video, status: 'analyzing' })
    let result
    if (process.env.MOCK === 'true' || process.env.USE_CACHE === 'true') {
      await delay(1500)
      result = fromSample(video)
    } else {
      result = await analyzeVideo(video, path.join(UPLOAD_DIR, path.basename(video.videoUrl)))
    }
    const done = { ...video, ...result, status: 'done' }
    saveVideo(done)
    res.json(done)
  } catch (e) {
    saveVideo({ ...video, status: 'error' })
    res.status(500).json({ error: e.message || 'Analysis failed' })
  }
})

// GET /api/videos/:id
router.get('/:id', (req, res) => {
  const video = getVideo(req.params.id)
  if (!video) return res.status(404).json({ error: 'Video not found' })
  res.json(video)
})

// GET /api/videos
router.get('/', (req, res) => {
  res.json({ videos: listVideos() })
})

export default router