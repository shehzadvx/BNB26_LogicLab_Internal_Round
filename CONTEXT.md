# CONTEXT.md - Logic Lab, Bit N Build 2026 (Internal Round)

Handoff file. Every teammate's Claude reads this first. Keep it updated in the "Progress log" at the bottom.

## Team
| Person | Role | Owns |
|---|---|---|
| Shehzad Baig (leader) | Frontend + integration | `client/`, merges to `main` |
| Ridhima Pandey | Backend A | `server/store.js`, `server/routes/videos.js`, `server/services/gemini.js` |
| Samiya Naaz Sayyed | Backend B | `server/routes/clips.js`, `server/services/adapt.js` |

All three are Vishwakarma University students. Only these three may commit. Do not add anyone else.

## Problem statement: CreatorAi - AI-Powered Creator Operating Platform
Unify the creator workflow (idea, script, footage, editing, repurposing, publishing). The platform must take a script plus raw footage, find the relevant sections, generate short-form clips, create hooks and supporting content, adapt content per platform, and keep every AI edit editable by the creator.

Judging criteria: not announced. Deliverable format: none specified by organizers. Deadline: prototype due morning of 2026-10-04.

## Scope (approved)
**Core flow (the demo):** upload script + one long video -> Gemini matches script sections to timestamps -> 3 to 5 clip suggestions with hook, caption, hashtags -> creator edits trim points / hook / caption -> pick platform and the content adapts -> preview the clip.

**Covers:** script-to-video understanding, automated clip generation, AI hook/script generation, editable AI edits, multi-platform adaptation.

**Cut (list as "future scope" in README):** real publishing/scheduling, full asset library (audio/images), Creator Intelligence analytics, auth/multi-user, server-side ffmpeg rendering (stretch goal only).

## Stack
- Client: React + Vite (port 5173), Vite proxy `/api` -> `http://localhost:4000`
- Server: Node + Express (port 4000), CORS on, multer for uploads
- AI: Gemini via the same SDK used in `test-gemini.mjs`, model from `process.env.GEMINI_MODEL || 'gemini-3.8-flash'`
- Storage: in-memory + JSON file at `server/data/db.json`; uploaded videos in `server/uploads/` (gitignored)
- Clips are NOT rendered. A clip is `startSec`/`endSec` on the original video; the browser plays it by seeking.

## Folder layout
```
/client                 React + Vite app (Shehzad)
/server
  index.js              Express app, mounts routes (Ridhima creates, everyone adds one line)
  store.js              data access (Ridhima)
  routes/videos.js      upload, analyze, get (Ridhima)
  routes/clips.js       edit, hook variants, adapt (Samiya)
  services/gemini.js    Gemini calls (Ridhima)
  services/adapt.js     platform adaptation logic (Samiya)
  data/sample-analysis.json   cached demo result (Ridhima)
CONTEXT.md  README.md  .env.example
### store.js interface (Ridhima implements, Samiya consumes)
All synchronous, in-memory, persisted to server/data/db.json:
  getVideo(id) -> Video | undefined
  listVideos() -> Video[]
  saveVideo(video) -> Video                          // insert or replace
  getClip(clipId) -> Clip | undefined
  updateClip(clipId, changes) -> Clip | undefined    // merges changes, sets edited: true
```

## Mock-first rule
Backend must return the exact JSON shapes below from day one, using mock data when `MOCK=true` in `.env`. Frontend builds against the mocks and is never blocked. Real Gemini replaces the mock behind the same shape. **Never change a shape without telling everyone and editing this file.**

## API contract
Base URL: `http://localhost:4000/api`. All responses are JSON. Errors: `{ "error": "message" }` with a 4xx/5xx status.

### Types
```json
Section = { "id": "s1", "text": "script paragraph text", "startSec": 0, "endSec": 42.5 }

Clip = {
  "id": "c1",
  "videoId": "v1",
  "title": "Why most creators burn out",
  "startSec": 12.0,
  "endSec": 41.5,
  "hook": "You're not lazy. Your workflow is broken.",
  "caption": "Burnout is a systems problem...",
  "hashtags": ["#creator", "#workflow"],
  "sectionId": "s1",
  "reason": "Strongest emotional moment, matches script paragraph 1",
  "edited": false
}

Video = {
  "id": "v1",
  "filename": "demo.mp4",
  "videoUrl": "/uploads/v1.mp4",
  "script": "full script text",
  "durationSec": 187.4,
  "status": "uploaded | analyzing | done | error",
  "sections": [Section],
  "clips": [Clip]
}
```

### Endpoints
| # | Method + path | Owner | Request | Response |
|---|---|---|---|---|
| 1 | `GET /health` | Ridhima | - | `{ "ok": true, "mock": true }` |
| 2 | `POST /videos` | Ridhima | multipart: `video` (file), `script` (text) | `Video` with `status: "uploaded"`, empty `sections` and `clips` |
| 3 | `POST /videos/:id/analyze` | Ridhima | - | `Video` with `status: "done"`, `sections` and `clips` filled |
| 4 | `GET /videos/:id` | Ridhima | - | `Video` |
| 5 | `GET /videos` | Ridhima | - | `{ "videos": [Video] }` |
| 6 | `PATCH /clips/:id` | Samiya | any of `{ startSec, endSec, hook, caption, hashtags }` | updated `Clip` with `edited: true` |
| 7 | `POST /clips/:id/hook-variants` | Samiya | `{ "tone": "bold" }` (optional; bold, curious, friendly) | `{ "hooks": ["...", "...", "..."] }` |
| 8 | `POST /clips/:id/adapt` | Samiya | `{ "platform": "reels" }` (reels, shorts, linkedin) | `Adaptation` (below) |

Static: `GET /uploads/<file>` serves the video (Ridhima mounts `express.static`).

```json
Adaptation = {
  "clipId": "c1",
  "platform": "reels",
  "aspectRatio": "9:16",
  "maxDurationSec": 90,
  "hook": "adapted hook",
  "caption": "adapted caption",
  "hashtags": ["#reels", "#creator"],
  "notes": "Keep text short, add captions on screen"
}
```
Platform rules for adapt: reels 9:16 max 90s, shorts 9:16 max 60s, linkedin 1:1 or 4:5 max 180s with a more professional tone. Samiya's code enforces `maxDurationSec` (flag in `notes` if the clip is too long); Gemini only rewrites text.

### Mock data (use as-is when `MOCK=true`)
Ridhima puts a realistic `Video` object with 3 sections and 3 clips in `server/data/sample-analysis.json`. `POST /videos/:id/analyze` returns it (with the real video's id and url swapped in) after a fake 1.5s delay so the UI loading state can be tested.
Clip ids are globally unique strings of the form `<videoId>_c1`, `<videoId>_c2`, ... (routes like /clips/:id have no video id). sample-analysis.json must be rewritten with the real videoId prefix on every clip id and on each clip's `videoId` field. All errors are `{ "error": "message" }` with a 4xx/5xx status.

## Gemini notes (Ridhima)
- Videos over ~20 MB need the Files API upload; wait until the file state is ACTIVE before calling generate.
- Ask for JSON only (`responseMimeType: application/json`) and validate/parse in try/catch; on a bad parse, retry once.
- Prompt gets: the script split into sections + the video; asks for each section's startSec/endSec, then 3 to 5 clip picks with hook, caption, hashtags, reason. Timestamps must be inside `durationSec`.
- Fallback for the live demo: `USE_CACHE=true` returns `sample-analysis.json` without calling Gemini.

## Git rules
- One branch per person: `feat/<name>-<feature>` (e.g. `feat/ridhima-analyze`, `feat/samiya-adapt`, `feat/shehzad-ui`).
- `git pull` before every push. Small commits. No direct push to `main`; open a PR, Shehzad merges.
- After each merge: `git pull origin main` on your branch.
- Never commit `.env`, keys, or `server/uploads/`. Never screenshot `.env`.
- `server/index.js`: only add your own `app.use(...)` line, nothing else, to avoid merge conflicts.

## Milestones (rough)
1. **First hour:** server runs with all 8 endpoints returning mocks; client skeleton with upload page, clip list, video player.
2. **~40% of time:** first end-to-end integration with mocks, then switch one endpoint at a time to real Gemini.
3. **Then:** error handling, loading states, demo video + script ready, README with future scope, demo run-through.

## Progress log
- 2026-10-03: PS allotted (CreatorAi), scope approved, CONTEXT.md filled in.
- 2026-10-03: client scaffolded (Vite+React, proxy), mocks.js, api.js (mock mode unless VITE_USE_MOCK=false), upload page working against mocks, on feat/shehzad-ui
- 2026-10-03: results page done (player + clip cards, click seeks and pauses at endSec) on feat/shehzad-ui. store.js interface added to this file; backend starter prompts sent to Ridhima and Samiya.

