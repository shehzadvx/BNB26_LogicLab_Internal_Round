# CreatorAi

AI-powered creator operating platform. Upload a script and a long video, and CreatorAi finds the relevant sections, suggests short-form clips with hooks, captions and hashtags, lets you edit every AI decision, and adapts each clip for Reels, Shorts and LinkedIn.

Built by Team Logic Lab for Bit N Build 2026 (internal round).

## Demo flow

1. Upload a script and one long video.
2. Gemini matches script sections to timestamps in the video.
3. 3 to 5 clip suggestions appear, each with a hook, caption and hashtags.
4. Edit trim points, hook, caption and hashtags. Regenerate the hook in a bold, curious or friendly tone.
5. Pick a platform (Reels, Shorts, LinkedIn) and the clip content adapts, with an over-limit warning if the clip is too long.
6. Preview the clip in the player.

## How it works

- **Client:** React + Vite (port 5173), proxying `/api` to the server.
- **Server:** Node + Express (port 4000), multer for uploads.
- **AI:** Gemini through `@google/genai`. Long videos use the Files API.
- **Clips are not rendered.** A clip is a `startSec` / `endSec` range on the original video, and the browser plays it by seeking.
- **Storage:** in-memory plus `server/data/db.json`. Uploads go in `server/uploads/` (gitignored).

### Run modes

| Mode | Settings | Behaviour |
|---|---|---|
| Live | `MOCK=false`, `USE_CACHE=false` | Real Gemini analysis (about 1 to 3 minutes) |
| Cache | `MOCK=false`, `USE_CACHE=true` | Returns `server/data/sample-analysis.json` in seconds (demo fallback) |
| Mock | `MOCK=true` | Fake data with a short delay, no API key needed |

## Run locally

```bash
# server
cd server
npm install
cp .env.example .env   # then fill in the values
npm run dev

# client (second terminal)
cd client
npm install
npm run dev
```

`server/.env` keys: `GEMINI_API_KEY`, `GEMINI_MODEL`, `MOCK`, `USE_CACHE`. Restart the server after any `.env` change. To use the real backend from the client, set `VITE_USE_MOCK=false`.

Open http://localhost:5173.

## API

Base URL `http://localhost:4000/api`. The full contract with request and response shapes is in [CONTEXT.md](CONTEXT.md).

| Method + path | Purpose |
|---|---|
| `GET /health` | Health check |
| `POST /videos` | Upload video and script |
| `POST /videos/:id/analyze` | Run analysis |
| `GET /videos/:id` | Get one video |
| `GET /videos` | List videos |
| `PATCH /clips/:id` | Edit trim, hook, caption, hashtags |
| `POST /clips/:id/hook-variants` | Generate hook alternatives |
| `POST /clips/:id/adapt` | Adapt a clip for a platform |

## Future scope

- Real publishing and scheduling to social platforms
- Full asset library (audio, images)
- Creator Intelligence analytics
- Authentication and multi-user workspaces
- Server-side ffmpeg rendering of finished clips

## Team

Logic Lab, Vishwakarma University:

- Shehzad Baig (team leader, frontend and integration)
- Ridhima Pandey (backend)
- Samiya Naaz Sayyed (backend)