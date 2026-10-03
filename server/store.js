import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data', 'db.json')

let db = { videos: {} }
try {
  if (fs.existsSync(DB_PATH)) db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
} catch {
  db = { videos: {} }
}
if (!db.videos) db.videos = {}

function persist() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

export function getVideo(id) {
  return db.videos[id] || null
}

export function listVideos() {
  return Object.values(db.videos)
}

// insert or replace the whole video (clips included)
export function saveVideo(video) {
  db.videos[video.id] = video
  persist()
  return video
}

export function getClip(clipId) {
  for (const v of Object.values(db.videos)) {
    const clip = (v.clips || []).find((c) => c.id === clipId)
    if (clip) return clip
  }
  return null
}

// merges changes, sets edited: true, returns the clip (or null)
export function updateClip(clipId, changes) {
  const clip = getClip(clipId)
  if (!clip) return null
  Object.assign(clip, changes, { edited: true })
  persist()
  return clip
}