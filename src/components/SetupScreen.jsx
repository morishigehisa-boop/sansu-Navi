import { useEffect, useState } from 'react'
import { supabase } from '../sb'

const DIFFICULTIES = [
  { value: 'easy', label: '易しい' },
  { value: 'normal', label: 'ふつう' },
  { value: 'hard', label: '難しい' },
]

export default function SetupScreen({ onStart }) {
  const [units, setUnits] = useState([])
  const [selectedUnits, setSelectedUnits] = useState([])
  const [selectedDifficulties, setSelectedDifficulties] = useState(['easy', 'normal', 'hard'])
  const [excludeMastered, setExcludeMastered] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUnits()
  }, [])

  useEffect(() => {
    updateCount()
  }, [selectedUnits, selectedDifficulties, excludeMastered])

  async function loadUnits() {
    const { data, error } = await supabase
      .from('sansu_questions')
      .select('unit')
    if (!error && data) {
      const uniqueUnits = [...new Set(data.map((d) => d.unit))].sort()
      setUnits(uniqueUnits)
      setSelectedUnits(uniqueUnits)
    }
    setLoading(false)
  }

  async function updateCount() {
    if (selectedUnits.length === 0 || selectedDifficulties.length === 0) {
      setQuestionCount(0)
      return
    }
    let query = supabase
      .from('sansu_questions')
      .select('id', { count: 'exact', head: true })
      .in('unit', selectedUnits)
      .in('difficulty', selectedDifficulties)
    if (excludeMastered) {
      query = query.eq('is_mastered', false)
    }
    const { count, error } = await query
    if (!error) setQuestionCount(count || 0)
  }

  function toggleUnit(unit) {
    setSelectedUnits((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]
    )
  }

  function toggleDifficulty(diff) {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    )
  }

  if (loading) return <div className="loading">読み込み中...</div>

  if (units.length === 0) {
    return (
      <div className="setup-screen">
        <h2>問題がまだ登録されていません</h2>
        <p>管理画面から問題を登録してください。</p>
      </div>
    )
  }

  return (
    <div className="setup-screen">
      <h1>さんすうナビ</h1>
      <h2>単元を選ぶ</h2>
      <div className="chip-group">
        {units.map((unit) => (
          <button
            key={unit}
            className={`chip ${selectedUnits.includes(unit) ? 'chip-active' : ''}`}
            onClick={() => toggleUnit(unit)}
          >
            {unit}
          </button>
        ))}
      </div>

      <h2>難易度を選ぶ</h2>
      <div className="chip-group">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            className={`chip ${selectedDifficulties.includes(d.value) ? 'chip-active' : ''}`}
            onClick={() => toggleDifficulty(d.value)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <label className="mastered-filter">
        <input
          type="checkbox"
          checked={excludeMastered}
          onChange={(e) => setExcludeMastered(e.target.checked)}
        />
        できるようになった問題（3回連続正解）を除く
      </label>

      <p className="question-count">対象問題数: {questionCount}問</p>

      <button
        className="primary-button"
        disabled={questionCount === 0}
        onClick={() =>
          onStart({
            units: selectedUnits,
            difficulties: selectedDifficulties,
            excludeMastered,
          })
        }
      >
        はじめる
      </button>
    </div>
  )
}
