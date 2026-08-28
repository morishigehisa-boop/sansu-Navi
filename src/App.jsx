import { Routes, Route } from 'react-router-dom'
import StudyPage from './StudyPage'
import AdminPanel from './components/AdminPanel'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StudyPage />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  )
}

export default App
