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
  uploadVideo: (file, script) => {
    const form = new FormData()
    form.append('video', file)
    form.append('script', script)
    return request('/videos', { method: 'POST', body: form })
  },
  analyzeVideo: (id) => request(`/videos/${id}/analyze`, { method: 'POST' }),
  getVideo: (id) => request(`/videos/${id}`),
  listVideos: () => request('/videos'),
  patchClip: (id, changes) => request(`/clips/${id}`, json('PATCH', changes)),
  hookVariants: (id, tone) => request(`/clips/${id}/hook-variants`, json('POST', tone ? { tone } : {})),
  adaptClip: (id, platform) => request(`/clips/${id}/adapt`, json('POST', { platform })),
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
}

export const api = USE_MOCK ? mock : real