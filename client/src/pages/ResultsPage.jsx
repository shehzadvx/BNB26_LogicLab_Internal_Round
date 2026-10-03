import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function ResultsPage() {
  const { id } = useParams()
  const [video, setVideo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getVideo(id).then(setVideo).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="card"><div className="error">{error}</div><Link to="/">Back to upload</Link></div>
  if (!video) return <p className="muted">Loading...</p>
  return <pre className="card" style={{ overflow: 'auto' }}>{JSON.stringify(video, null, 2)}</pre>
}