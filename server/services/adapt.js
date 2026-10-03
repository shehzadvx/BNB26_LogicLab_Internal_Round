import { generateText } from './gemini.js'

export const PLATFORM_RULES = {
  reels:    { aspectRatio: '9:16', maxDurationSec: 90,  tag: '#reels',    tone: 'punchy and casual',            notes: 'Keep text short, add captions on screen' },
  shorts:   { aspectRatio: '9:16', maxDurationSec: 60,  tag: '#shorts',   tone: 'fast, curiosity-driven',       notes: 'Hook in the first 2 seconds, loop-friendly ending' },
  linkedin: { aspectRatio: '4:5',  maxDurationSec: 180, tag: '#linkedin', tone: 'professional, insight-first',  notes: 'More professional tone, lead with the insight' },
}

function baseText(clip, platform, rule) {
  return {
    hook: platform === 'linkedin' ? `Insight: ${clip.hook}` : clip.hook,
    caption: platform === 'linkedin' ? `${clip.caption} What is your take?` : clip.caption,
    hashtags: [...clip.hashtags.slice(0, 2), rule.tag],
  }
}

async function rewriteWithGemini(clip, platform, rule) {
  const prompt =
    `Rewrite this short-form video's hook, caption and hashtags for ${platform}. Tone: ${rule.tone}.\n` +
    `Title: ${clip.title}\nHook: ${clip.hook}\nCaption: ${clip.caption}\nHashtags: ${clip.hashtags.join(' ')}\n` +
    `Return JSON only: {"hook":"...","caption":"...","hashtags":["#a","#b","#c"]}`
  const raw = await generateText(prompt, { json: true })
  const out = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!out.hook || !out.caption || !Array.isArray(out.hashtags)) throw new Error('Bad Gemini output')
  return { hook: out.hook, caption: out.caption, hashtags: out.hashtags }
}

export async function adaptClip(clip, platform, { mock = false } = {}) {
  const rule = PLATFORM_RULES[platform]
  if (!rule) {
    const err = new Error(`Unknown platform: ${platform}. Use reels, shorts or linkedin.`)
    err.status = 400
    throw err
  }

  // duration is enforced here in code, Gemini only rewrites text
  const duration = clip.endSec - clip.startSec
  const tooLong = duration > rule.maxDurationSec

  let text = baseText(clip, platform, rule)
  if (!mock) {
    try {
      text = await rewriteWithGemini(clip, platform, rule)
    } catch {
      /* fall back to the base text so the demo never breaks */
    }
  }

  return {
    clipId: clip.id,
    platform,
    aspectRatio: rule.aspectRatio,
    maxDurationSec: rule.maxDurationSec,
    ...text,
    notes: tooLong
      ? `Clip is ${duration.toFixed(0)}s, over the ${rule.maxDurationSec}s limit. ${rule.notes}`
      : rule.notes,
  }
}