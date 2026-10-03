import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import videosRouter from './routes/videos.js'
import clipsRouter from './routes/clips.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/api/health', (req, res) => res.json({ ok: true, mock: process.env.MOCK === 'true' }))

app.use('/api/videos', videosRouter)
app.use('/api/clips', clipsRouter)

// every error -> { "error": "message" }
app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  res.status(status).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT} (MOCK=${process.env.MOCK})`))