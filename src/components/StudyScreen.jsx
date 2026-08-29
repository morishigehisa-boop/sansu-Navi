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

export default function StudyScreen({ filters, onFinish, onQuit }) {
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState({ correct: 0, incorrect: 0 })

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    let query = supabase
      .from('sansu_questions')
      .select('*')
      .in('unit', filters.units)
      .in('difficulty', filters.difficulties)
    if (filters.excludeMastered) {
      query = query.eq('is_mastered', false)
    }
    const { data, error } = await query
    if (!error && data) {
      setQuestions(shuffle(data))
    }
    setLoading(false)
  }

  const recordAnswer = useCallback(
    async (isCorrect) => {
      const current = questions[index]
      if (!current) return

      const now = new Date().toISOString()

      await supabase.from('sansu_answer_logs').insert({
        question_id: current.id,
        is_correct: isCorrect,
      })

      const newConsecutive = isCorrect ? (current.consecutive_correct || 0) + 1 : 0
      const newMastered = newConsecutive >= 3

      await supabase
        .from('sansu_questions')
        .update({
          consecutive_correct: newConsecutive,
          is_mastered: newMastered,
          last_answered_at: now,
        })
        .eq('id', current.id)

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

  function handleQuit() {
    if (!confirm('とちゅうでやめますか？ここまでの記録は保存されます。')) return
    onQuit({ ...results, total: results.correct + results.incorrect })
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (questions.length === 0) return <div className="loading">問題がありません</div>

  const current = questions[index]

  return (
    <div className="study-screen">
      <div className="study-header">
        <div className="progress">
          {index + 1} / {questions.length}
        </div>
        <button className="quit-button" onClick={handleQuit}>
          とちゅうでやめる
        </button>
      </div>

      <div className="question-card">
        <div className="unit-badge">{current.unit}</div>
        <p className="question-text">{current.question_text}</p>
        {current.image_urls?.length > 0 && (
          <div className="question-images">
            {current.image_urls.map((url, i) => (
              <img key={i} src={url} alt="問題の図" className="question-image" />
            ))}
          </div>
        )}

        {showAnswer ? (
          <div className="answer-box">
            <p className="answer-label">こたえ</p>
            {current.answer && <p className="answer-text">{current.answer}</p>}
            {current.answer_image_urls?.length > 0 && (
              <div className="question-images">
                {current.answer_image_urls.map((url, i) => (
                  <img key={i} src={url} alt="答えの図" className="question-image" />
                ))}
              </div>
            )}
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
