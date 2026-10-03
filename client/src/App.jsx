import { Routes, Route, Link } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">CreatorAi</Link>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/videos/:id" element={<ResultsPage />} />
        </Routes>
      </main>
    </div>
  )
}