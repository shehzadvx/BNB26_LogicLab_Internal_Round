# Starter prompts (paste into your own Claude chat, one prompt per person)

Before pasting: open `CONTEXT.md` from the repo and paste its full text as the first message, or attach the file. Then send your prompt.

---

## Shehzad - Frontend + integration

```
I'm Shehzad, team leader of Logic Lab. I own the frontend and integration. CONTEXT.md (pasted/attached) is the source of truth: scope, API contract, folder layout, git rules. Follow it exactly, and don't change any API shape.

Task: build the React + Vite client in /client, working in small steps, one step at a time, explaining what to run after each.

1. Scaffold Vite + React, set up a proxy for /api and /uploads to http://localhost:4000.
2. Upload page: video file input + script textarea, "Analyze" button, loading state. Calls POST /videos then POST /videos/:id/analyze.
3. Results page: video player + list of clip cards (title, time range, hook, caption, hashtags). Clicking a card plays that clip by seeking to startSec and pausing at endSec.
4. Edit panel per clip: trim start/end (number inputs or sliders), edit hook/caption/hashtags, Save calls PATCH /clips/:id. "Regenerate hook" calls POST /clips/:id/hook-variants and lets me pick one.
5. Platform tabs (Reels / Shorts / LinkedIn) calling POST /clips/:id/adapt and showing aspect ratio, max duration, adapted text.
6. Error toasts, empty states, clean simple styling.

Build against mock data first (a local mocks.js with the exact JSON shapes from CONTEXT.md) so I'm not blocked by the backend, then switch to the real API behind a single api.js file. Use branch feat/shehzad-ui. Start with step 1.
```

---

## Ridhima - Backend A (upload + Gemini analysis)

```
I'm Ridhima, on team Logic Lab. I'm one of two backend people. CONTEXT.md (pasted/attached) is the source of truth: scope, API contract, folder layout, git rules. Follow it exactly, and don't change any API shape without telling Shehzad.

I own: server/index.js (create it), server/store.js, server/routes/videos.js, server/services/gemini.js, server/data/sample-analysis.json. Endpoints I build: GET /health, POST /videos, POST /videos/:id/analyze, GET /videos/:id, GET /videos, plus serving /uploads statically.

Work one step at a time, telling me what to run after each step:

1. Express app in /server with CORS, JSON body, multer upload to server/uploads/, dotenv. Port 4000. Add a one-line mount point per route file so Samiya can add routes/clips.js without conflicts.
2. server/store.js FIRST, and I push it within the first hour: simple in-memory store persisted to server/data/db.json with getVideo, saveVideo, listVideos, getClip, updateClip, saveClips. Samiya depends on it.
3. All my endpoints returning the exact mock shapes when MOCK=true (use sample-analysis.json with the real id/url swapped in, plus a 1.5s fake delay on analyze). Push this early so Shehzad can integrate.
4. Real analysis in services/gemini.js, using the same SDK as test-gemini.mjs and model process.env.GEMINI_MODEL || 'gemini-3.8-flash': upload the video via the Files API, wait until ACTIVE, send the script + video, request JSON only, parse safely with one retry, validate timestamps are within durationSec.
5. USE_CACHE=true fallback that returns the cached sample result without calling Gemini.

Use branch feat/ridhima-analyze. Never commit .env or server/uploads/. Start with step 1.
```

---

## Samiya - Backend B (edits, hooks, platform adaptation)

```
I'm Samiya, on team Logic Lab. I'm one of two backend people. CONTEXT.md (pasted/attached) is the source of truth: scope, API contract, folder layout, git rules. Follow it exactly, and don't change any API shape without telling Shehzad.

I own: server/routes/clips.js and server/services/adapt.js. Endpoints I build: PATCH /clips/:id, POST /clips/:id/hook-variants, POST /clips/:id/adapt. Ridhima creates server/index.js and server/store.js (getClip, updateClip); until she pushes them, I code against a tiny local stub of the same function names and swap in her store after I pull.

Work one step at a time, telling me what to run after each step:

1. routes/clips.js with PATCH /clips/:id: validate startSec < endSec and within video duration, only allow startSec, endSec, hook, caption, hashtags, set edited: true, return the updated Clip.
2. POST /clips/:id/hook-variants: returns { hooks: [3 strings] } using Gemini text generation (same SDK as test-gemini.mjs, model process.env.GEMINI_MODEL || 'gemini-3.8-flash'), optional tone (bold, curious, friendly). Return mock hooks when MOCK=true.
3. services/adapt.js and POST /clips/:id/adapt: platform rules in code (reels 9:16 max 90s, shorts 9:16 max 60s, linkedin 4:5 max 180s), flag in notes if the clip exceeds the max duration, and use Gemini only to rewrite hook/caption/hashtags for the platform's tone. Return the exact Adaptation shape from CONTEXT.md. Mock when MOCK=true.
4. Test each endpoint with curl or a small test script and send me the commands.

Use branch feat/samiya-adapt. Only add your own app.use(...) line in server/index.js. Never commit .env. Start with step 1.
```
