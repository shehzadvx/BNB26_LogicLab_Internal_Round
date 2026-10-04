import { MOCK_DURATION, buildMockAnalysis, mockHookVariants, mockAdapt } from './mocks'

// Mock mode is ON unless VITE_USE_MOCK=false (put it in client/.env.local to switch to the real API)
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const BASE = '/api'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------- real API ---------- */
async function request(path, options) {
  let res
  try {
    res = await fetch(BASE + path, options)
  } catch {
    throw new Error('Cannot reach the server. Is it running on port 4000?')
  }
  let data = null
  try { data = await res.json() } catch { /* non-JSON body */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
})

const real = {
  health: () => request('/health'),
  uploadVideo: async (file, script) => {
    const durationSec = Math.round((await readDuration(file)) * 10) / 10
    const form = new FormData()
    form.append('video', file)
    form.append('script', script)
    form.append('durationSec', String(durationSec))
    return request('/videos', { method: 'POST', body: form })
  },
  analyzeVideo: (id) => request(`/videos/${id}/analyze`, { method: 'POST' }),
  getVideo: (id) => request(`/videos/${id}`),
  listVideos: () => request('/videos'),
  patchClip: (id, changes) => request(`/clips/${id}`, json('PATCH', changes)),
  hookVariants: (id, tone) => request(`/clips/${id}/hook-variants`, json('POST', tone ? { tone } : {})),
  adaptClip: (id, platform) => request(`/clips/${id}/adapt`, json('POST', { platform })),

  // ---- content workflow (endpoints 9-11) ----
  setClipStatus: (id, { status, scheduledAt, platform }) =>
    request(`/clips/${id}/status`, json('PATCH', { status, scheduledAt, platform })),
  getSchedule: () => request('/schedule'),
  exportPost: (id, platform) =>
    request(`/clips/${id}/export`, json('POST', platform ? { platform } : {})),

  // ---- asset library (endpoints 12-14) ----
  listAssets: (videoId) => request(`/videos/${videoId}/assets`),
  addAsset: (videoId, asset) => request(`/videos/${videoId}/assets`, json('POST', asset)),
  deleteAsset: (videoId, assetId) =>
    request(`/videos/${videoId}/assets/${assetId}`, { method: 'DELETE' }),
}

/* ---------- mock API (same shapes, in-memory) ---------- */
const mockDb = { videos: {} }

function findClip(clipId) {
  for (const v of Object.values(mockDb.videos)) {
    const clip = v.clips.find((c) => c.id === clipId)
    if (clip) return clip
  }
  throw new Error('Clip not found (mock data resets when you refresh the page)')
}

// Same as findClip but also returns the parent video (used by the workflow mocks)
function findClipWithVideo(clipId) {
  for (const v of Object.values(mockDb.videos)) {
    const clip = v.clips.find((c) => c.id === clipId)
    if (clip) return { clip, video: v }
  }
  throw new Error('Clip not found (mock data resets when you refresh the page)')
}

function findVideo(videoId) {
  const v = mockDb.videos[videoId]
  if (!v) throw new Error('Video not found (mock data resets when you refresh the page)')
  return v
}

const WF_STATUSES = ['idea', 'scripted', 'edited', 'ready', 'scheduled']
const WF_PLATFORMS = ['reels', 'shorts', 'linkedin']
const ASSET_TYPES = ['snippet', 'link', 'note']

function readDuration(file) {
  return new Promise((resolve) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.onloadedmetadata = () => resolve(el.duration || MOCK_DURATION)
    el.onerror = () => resolve(MOCK_DURATION)
    el.src = URL.createObjectURL(file)
  })
}

const mock = {
  health: async () => ({ ok: true, mock: true }),

  uploadVideo: async (file, script) => {
    await delay(500)
    const id = 'v' + Date.now()
    const durationSec = Math.round((await readDuration(file)) * 10) / 10
    const video = {
      id, filename: file.name, videoUrl: URL.createObjectURL(file), script,
      durationSec, status: 'uploaded', sections: [], clips: [],
    }
    mockDb.videos[id] = video
    return structuredClone(video)
  },

  analyzeVideo: async (id) => {
    await delay(1500)
    const video = mockDb.videos[id]
    if (!video) throw new Error('Video not found (mock data resets when you refresh the page)')
    const { sections, clips } = buildMockAnalysis(id, video.durationSec / MOCK_DURATION)
    Object.assign(video, { status: 'done', sections, clips })
    return structuredClone(video)
  },

  getVideo: async (id) => {
    await delay(200)
    const video = mockDb.videos[id]
    if (!video) throw new Error('Video not found (mock data resets when you refresh the page)')
    return structuredClone(video)
  },

  listVideos: async () => ({ videos: Object.values(mockDb.videos).map((v) => structuredClone(v)) }),

  patchClip: async (id, changes) => {
    await delay(200)
    const clip = findClip(id)
    for (const key of ['startSec', 'endSec', 'hook', 'caption', 'hashtags']) {
      if (key in changes) clip[key] = changes[key]
    }
    clip.edited = true
    return structuredClone(clip)
  },

  hookVariants: async (id, tone) => {
    await delay(800)
    findClip(id)
    return mockHookVariants(tone)
  },

  adaptClip: async (id, platform) => {
    await delay(600)
    return mockAdapt(findClip(id), platform)
  },

  // ---- content workflow (endpoints 9-11) ----
  setClipStatus: async (id, { status, scheduledAt, platform }) => {
    await delay(200)
    const { clip } = findClipWithVideo(id)
    if (!WF_STATUSES.includes(status)) throw new Error('Invalid status')
    if (status === 'scheduled') {
      if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) throw new Error('Pick a valid date and time')
      if (!WF_PLATFORMS.includes(platform)) throw new Error('Pick a platform')
      clip.scheduledAt = new Date(scheduledAt).toISOString()
      clip.scheduledPlatform = platform
    } else {
      clip.scheduledAt = null
      clip.scheduledPlatform = null
    }
    clip.status = status // `edited` is deliberately untouched, like the server
    return structuredClone(clip)
  },

  getSchedule: async () => {
    await delay(200)
    const items = []
    for (const v of Object.values(mockDb.videos)) {
      for (const c of v.clips) {
        if (c.status === 'scheduled' && c.scheduledAt) {
          items.push({
            clipId: c.id, videoId: v.id, filename: v.filename, title: c.title,
            platform: c.scheduledPlatform, scheduledAt: c.scheduledAt, published: false,
          })
        }
      }
    }
    items.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    return { items, note: 'Planned queue only. Nothing is published.' }
  },

  exportPost: async (id, platform) => {
    await delay(200)
    const { clip, video } = findClipWithVideo(id)
    if (platform && !WF_PLATFORMS.includes(platform)) throw new Error('Unknown platform')
    const src = platform ? mockAdapt(clip, platform) : clip
    return {
      clipId: id,
      platform: platform || null,
      text: [src.hook, src.caption, (src.hashtags || []).join(' ')].filter(Boolean).join('\n\n'),
      videoFile: video.filename,
      trim: { startSec: clip.startSec, endSec: clip.endSec },
      filename: `${id}${platform ? '_' + platform : ''}.txt`,
    }
  },

  // ---- asset library (endpoints 12-14) ----
  listAssets: async (videoId) => {
    await delay(150)
    const v = findVideo(videoId)
    return { assets: structuredClone(v.assets || []) }
  },

  addAsset: async (videoId, { type, title, content }) => {
    await delay(150)
    const v = findVideo(videoId)
    const t = (title || '').trim()
    const c = (content || '').trim()
    if (!ASSET_TYPES.includes(type)) throw new Error('type must be snippet, link or note')
    if (!t) throw new Error('title is required')
    if (t.length > 80) throw new Error('title must be at most 80 characters')
    if (!c) throw new Error('content is required')
    if (c.length > 2000) throw new Error('content must be at most 2000 characters')
    if (type === 'link' && !/^https?:\/\/\S+$/i.test(c)) throw new Error('link must start with http:// or https://')
    v.assets = v.assets || []
    const nums = v.assets.map((a) => Number(a.id.slice(a.id.lastIndexOf('_a') + 2)))
    const asset = {
      id: `${v.id}_a${(nums.length ? Math.max(...nums) : 0) + 1}`,
      videoId: v.id, type, title: t, content: c, createdAt: new Date().toISOString(),
    }
    v.assets.push(asset)
    return structuredClone(asset)
  },

  deleteAsset: async (videoId, assetId) => {
    await delay(150)
    const v = findVideo(videoId)
    if (!(v.assets || []).some((a) => a.id === assetId)) throw new Error('Asset not found')
    v.assets = v.assets.filter((a) => a.id !== assetId)
    return { ok: true }
  },
}

export const api = USE_MOCK ? mock : real
