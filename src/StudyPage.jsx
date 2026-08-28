import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import StudyScreen from './components/StudyScreen'
import ResultScreen from './components/ResultScreen'

export default function StudyPage() {
  const [stage, setStage] = useState('setup') // setup | study | result
  const [filters, setFilters] = useState(null)
  const [result, setResult] = useState(null)

  function handleStart(f) {
    setFilters(f)
    setStage('study')
  }

  function handleFinish(r) {
    setResult(r)
    setStage('result')
  }

  function handleRestart() {
    setFilters(null)
    setResult(null)
    setStage('setup')
  }

  if (stage === 'setup') return <SetupScreen onStart={handleStart} />
  if (stage === 'study') return <StudyScreen filters={filters} onFinish={handleFinish} />
  if (stage === 'result') return <ResultScreen result={result} onRestart={handleRestart} />
  return null
}
