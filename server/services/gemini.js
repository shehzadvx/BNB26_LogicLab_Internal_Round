// server/services/gemini.js
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, createPartFromUri } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = path.join(__dirname, '..', 'data', 'sample-analysis.json');
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const INLINE_LIMIT = 20 * 1024 * 1024; // ~20 MB

let _ai;
const ai = () => (_ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

const MIME = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.m4v': 'video/mp4',
};

// ---------- helpers ----------
function stripFences(text) {
  return String(text ?? '').replace(/```json|```/gi, '').trim();
}

function parseJson(text) {
  return JSON.parse(stripFences(text));
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);

async function waitUntilActive(file, timeoutMs = 5 * 60 * 1000) {
  const start = Date.now();
  let f = file;
  while (f.state === 'PROCESSING' || !f.state) {
    if (Date.now() - start > timeoutMs) throw new Error('Gemini file processing timed out');
    await new Promise((r) => setTimeout(r, 2000));
    f = await ai().files.get({ name: f.name });
  }
  if (f.state !== 'ACTIVE') throw new Error(`Gemini file state: ${f.state}`);
  return f;
}

async function buildVideoPart(filePath) {
  const mimeType = MIME[path.extname(filePath).toLowerCase()] || 'video/mp4';
  const size = fs.statSync(filePath).size;
  if (size <= INLINE_LIMIT) {
    return {
      inlineData: { mimeType, data: fs.readFileSync(filePath).toString('base64') },
    };
  }
  const uploaded = await ai().files.upload({ file: filePath, config: { mimeType } });
  const active = await waitUntilActive(uploaded);
  return createPartFromUri(active.uri, active.mimeType || mimeType);
}

function validateAnalysis(raw, videoId, durationSec) {
  const max = durationSec > 0 ? durationSec : Infinity;
  const clamp = (n) => Math.min(Math.max(n, 0), max);

  const sections = (Array.isArray(raw?.sections) ? raw.sections : [])
    .map((s, i) => {
      const startSec = clamp(num(s.startSec));
      const endSec = clamp(num(s.endSec));
      return {
        id: `s${i + 1}`,
        text: String(s.text ?? '').trim(),
        startSec, endSec,
      };
    })
    .filter((s) => Number.isFinite(s.startSec) && Number.isFinite(s.endSec) && s.endSec > s.startSec);

  if (!sections.length) throw new Error('No valid sections returned');

  const sectionIds = new Set(sections.map((s) => s.id));
  const clips = (Array.isArray(raw?.clips) ? raw.clips : [])
    .map((c) => {
      const startSec = clamp(num(c.startSec));
      const endSec = clamp(num(c.endSec));
      const hook = String(c.hook ?? '').trim();
      if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= startSec || !hook) return null;
      const hashtags = (Array.isArray(c.hashtags) ? c.hashtags : [])
        .filter((h) => typeof h === 'string' && h.trim())
        .map((h) => (h.startsWith('#') ? h : `#${h}`));
      const sec = typeof c.sectionId === 'string' && sectionIds.has(c.sectionId) ? c.sectionId : sections[0].id;
      return {
        title: String(c.title ?? hook).trim(),
        startSec, endSec, hook,
        caption: String(c.caption ?? '').trim(),
        hashtags, sectionId: sec,
        reason: String(c.reason ?? '').trim(),
      };
    })
    .filter(Boolean)
    .slice(0, 5)
    .map((c, i) => ({ id: `${videoId}_c${i + 1}`, videoId, ...c, edited: false }));

  if (clips.length < 3) throw new Error(`Only ${clips.length} valid clips returned (need 3 to 5)`);
  return { sections, clips };
}

function buildPrompt(video) {
  return `You are a video editor's assistant. You get a script and the video recorded from it.

1. Split the script into its paragraphs/sections. For each, find where it is spoken in the video.
2. Pick 3 to 5 of the strongest short-form clips (ideally 15-60 seconds each, never cutting mid-sentence).

All timestamps are seconds from the start of the video, as numbers, and MUST be between 0 and ${video.durationSec} (the video length).

Return ONLY JSON in exactly this shape:
{
  "sections": [{ "id": "s1", "text": "script paragraph", "startSec": 0, "endSec": 42.5 }],
  "clips": [{
    "title": "short title",
    "startSec": 12.0, "endSec": 41.5,
    "hook": "scroll-stopping opening line",
    "caption": "post caption",
    "hashtags": ["#tag1", "#tag2"],
    "sectionId": "s1",
    "reason": "why this moment works"
  }]
}

SCRIPT:
${video.script}`;
}

// ---------- public API ----------
export async function analyzeVideo(video, filePath) {
  if (process.env.USE_CACHE === 'true') {
    const sample = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
    const clips = (sample.clips || []).map((c, i) => ({
      ...c, id: `${video.id}_c${i + 1}`, videoId: video.id, edited: false,
    }));
    return { sections: sample.sections || [], clips };
  }

  let videoPart;
  try {
    videoPart = await buildVideoPart(filePath);
  } catch (err) {
    console.error('Video upload to Gemini failed:', err.message, err.cause?.code || err.cause?.message || '');
    throw new Error(`Gemini upload failed: ${err.message}`);
  }
  const prompt = buildPrompt(video);
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai().models.generateContent({
        model: MODEL(),
        contents: [{ role: 'user', parts: [videoPart, { text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });
      return validateAnalysis(parseJson(res.text), video.id, video.durationSec);
    } catch (err) {
      lastErr = err;
      console.warn(`analyzeVideo attempt ${attempt + 1} failed:`, err.message, err.cause?.code || err.cause?.message || '');
    }
  }
  throw new Error(`Gemini analysis failed: ${lastErr?.message}`);
}

export async function generateText(prompt, { json = false } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < (json ? 2 : 1); attempt++) {
    try {
      const res = await ai().models.generateContent({
        model: MODEL(),
        contents: prompt,
        ...(json ? { config: { responseMimeType: 'application/json' } } : {}),
      });
      if (!json) return res.text;
      const cleaned = stripFences(res.text);
      JSON.parse(cleaned); // validate only
      return cleaned;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Gemini request failed: ${lastErr?.message}`);
}