import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../sb'

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function StudyScreen({ filters, onFinish }) {
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState({ correct: 0, incorrect: 0 })

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    const { data, error } = await supabase
      .from('sansu_questions')
      .select('*')
      .in('unit', filters.units)
      .in('difficulty', filters.difficulties)
    if (!error && data) {
      setQuestions(shuffle(data))
    }
    setLoading(false)
  }

  const recordAnswer = useCallback(
    async (isCorrect) => {
      const current = questions[index]
      if (!current) return

      await supabase.from('sansu_answer_logs').insert({
        question_id: current.id,
        is_correct: isCorrect,
      })

      setResults((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      }))

      if (index + 1 >= questions.length) {
        onFinish({
          correct: results.correct + (isCorrect ? 1 : 0),
          incorrect: results.incorrect + (isCorrect ? 0 : 1),
          total: questions.length,
        })
      } else {
        setIndex((i) => i + 1)
        setShowAnswer(false)
      }
    },
    [questions, index, results, onFinish]
  )

  if (loading) return <div className="loading">読み込み中...</div>
  if (questions.length === 0) return <div className="loading">問題がありません</div>

  const current = questions[index]

  return (
    <div className="study-screen">
      <div className="progress">
        {index + 1} / {questions.length}
      </div>

      <div className="question-card">
        <div className="unit-badge">{current.unit}</div>
        <p className="question-text">{current.question_text}</p>
        {current.image_url && (
          <img src={current.image_url} alt="問題の図" className="question-image" />
        )}

        {showAnswer ? (
          <div className="answer-box">
            <p className="answer-label">こたえ</p>
            <p className="answer-text">{current.answer}</p>
          </div>
        ) : (
          <button className="secondary-button" onClick={() => setShowAnswer(true)}>
            答えを見る
          </button>
        )}
      </div>

      {showAnswer && (
        <div className="judge-buttons">
          <button className="correct-button" onClick={() => recordAnswer(true)}>
            ⭕ 正解
          </button>
          <button className="incorrect-button" onClick={() => recordAnswer(false)}>
            ❌ 不正解
          </button>
        </div>
      )}
    </div>
  )
}
