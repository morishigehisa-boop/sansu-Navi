import { useEffect, useState } from 'react'
import { supabase } from '../sb'

const DIFFICULTIES = [
  { value: 'easy', label: '易しい' },
  { value: 'normal', label: 'ふつう' },
  { value: 'hard', label: '難しい' },
]

export default function AdminPanel() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [unit, setUnit] = useState('')
  const [difficulty, setDifficulty] = useState('normal')
  const [questionText, setQuestionText] = useState('')
  const [answer, setAnswer] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [answerImageFiles, setAnswerImageFiles] = useState([])
  const [sourceName, setSourceName] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sansu_questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) setQuestions(data || [])
    setLoading(false)
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // 簡易リサイズ・圧縮（幅1000pxまで、JPEG品質0.8）
    const compressed = await compressImage(file)

    const { error } = await supabase.storage
      .from('sansu-images')
      .upload(fileName, compressed, { contentType: 'image/jpeg' })
    if (error) throw error

    const { data } = supabase.storage.from('sansu-images').getPublicUrl(fileName)
    return data.publicUrl
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const maxWidth = 1000
          const scale = Math.min(1, maxWidth / img.width)
          const canvas = document.createElement('canvas')
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.8
          )
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!unit.trim() || !answer.trim()) {
      setMessage('単元と答えは必須です')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const imageUrls = []
      for (const file of imageFiles) {
        const url = await uploadImage(file)
        imageUrls.push(url)
      }

      const answerImageUrls = []
      for (const file of answerImageFiles) {
        const url = await uploadImage(file)
        answerImageUrls.push(url)
      }

      const { error } = await supabase.from('sansu_questions').insert({
        unit: unit.trim(),
        difficulty,
        question_text: questionText.trim(),
        answer: answer.trim(),
        image_urls: imageUrls,
        answer_image_urls: answerImageUrls,
        source_name: sourceName.trim() || null,
        page_number: pageNumber.trim() || null,
      })
      if (error) throw error

      setMessage('登録しました')
      setQuestionText('')
      setAnswer('')
      setImageFiles([])
      setAnswerImageFiles([])
      e.target.reset?.()
      loadQuestions()
    } catch (err) {
      setMessage('エラー: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('この問題を削除しますか？')) return
    await supabase.from('sansu_questions').delete().eq('id', id)
    loadQuestions()
  }

  return (
    <div className="admin-panel">
      <h1>管理パネル</h1>

      <form onSubmit={handleSubmit} className="admin-form">
        <label>
          テスト／教材名
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="例: 5年生算数ドリル上巻"
          />
        </label>

        <label>
          ページ数
          <input
            type="text"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="例: 12"
          />
        </label>

        <label>
          単元
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="例: 分数、割合、図形"
          />
        </label>

        <label>
          難易度
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          問題文
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="問題文（図形問題は補足のみでも可）"
            rows={6}
          />
        </label>

        <label>
          画像（図形問題など、複数登録可）
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
          />
        </label>
        {imageFiles.length > 0 && (
          <div className="image-file-list">
            {imageFiles.map((f, i) => (
              <span key={i} className="image-file-chip">
                {f.name}
                <button
                  type="button"
                  onClick={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <label>
          答え
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="答え"
          />
        </label>

        <label>
          答えの画像（図形の解説など、複数登録可）
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setAnswerImageFiles((prev) => [...prev, ...Array.from(e.target.files || [])])
            }
          />
        </label>
        {answerImageFiles.length > 0 && (
          <div className="image-file-list">
            {answerImageFiles.map((f, i) => (
              <span key={i} className="image-file-chip">
                {f.name}
                <button
                  type="button"
                  onClick={() => setAnswerImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <button type="submit" className="primary-button" disabled={uploading}>
          {uploading ? 'アップロード中...' : '登録する'}
        </button>

        {message && <p className="admin-message">{message}</p>}
      </form>

      <h2>登録済み問題（最新200件）</h2>
      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>教材名</th>
              <th>ページ</th>
              <th>単元</th>
              <th>難易度</th>
              <th>問題文</th>
              <th>答え</th>
              <th>画像</th>
              <th>答え画像</th>
              <th>連続正解</th>
              <th>習得</th>
              <th>最終回答</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id}>
                <td>{q.source_name}</td>
                <td>{q.page_number}</td>
                <td>{q.unit}</td>
                <td>{q.difficulty}</td>
                <td>{q.question_text}</td>
                <td>{q.answer}</td>
                <td>{q.image_urls?.length > 0 ? `${q.image_urls.length}枚` : ''}</td>
                <td>{q.answer_image_urls?.length > 0 ? `${q.answer_image_urls.length}枚` : ''}</td>
                <td>{q.consecutive_correct}</td>
                <td>{q.is_mastered ? '✓' : ''}</td>
                <td>
                  {q.last_answered_at
                    ? new Date(q.last_answered_at).toLocaleDateString('ja-JP')
                    : ''}
                </td>
                <td>
                  <button onClick={() => handleDelete(q.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
