import { useEffect, useState } from 'react'
import { supabase } from '../sb'
import CropModal from './CropModal'
import OptionsManager from './OptionsManager'

const DIFFICULTIES = [
  { value: 'easy', label: '易しい' },
  { value: 'normal', label: 'ふつう' },
  { value: 'hard', label: '難しい' },
]

const NEW_OPTION_VALUE = '__new__'
const LAST_UNIT_KEY = 'sansu_last_unit'
const LAST_SOURCE_KEY = 'sansu_last_source'

export default function AdminPanel() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [units, setUnits] = useState([])
  const [sources, setSources] = useState([])

  const [unit, setUnit] = useState('')
  const [newUnitInput, setNewUnitInput] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [newSourceInput, setNewSourceInput] = useState('')

  const [difficulty, setDifficulty] = useState('normal')
  const [questionText, setQuestionText] = useState('')
  const [answer, setAnswer] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [answerImageFiles, setAnswerImageFiles] = useState([])
  const [cropQueue, setCropQueue] = useState([]) // [{file, target: 'question'|'answer'}]
  const [croppingItem, setCroppingItem] = useState(null)
  const [pageNumber, setPageNumber] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadQuestions()
    loadOptions()
  }, [])

  async function loadOptions() {
    const { data } = await supabase
      .from('sansu_meta_options')
      .select('*')
      .order('name')
    const unitList = (data || []).filter((o) => o.option_type === 'unit')
    const sourceList = (data || []).filter((o) => o.option_type === 'source')
    setUnits(unitList)
    setSources(sourceList)

    // 前回選択したものを初期値に（まだ選ばれていない場合のみ）
    const lastUnit = localStorage.getItem(LAST_UNIT_KEY)
    if (lastUnit && unitList.some((u) => u.name === lastUnit)) {
      setUnit((prev) => prev || lastUnit)
    }
    const lastSource = localStorage.getItem(LAST_SOURCE_KEY)
    if (lastSource && sourceList.some((s) => s.name === lastSource)) {
      setSourceName((prev) => prev || lastSource)
    }
  }

  async function registerOptionIfNew(type, name) {
    const trimmed = name.trim()
    if (!trimmed) return
    await supabase
      .from('sansu_meta_options')
      .insert({ option_type: type, name: trimmed })
      .select()
    loadOptions()
  }

  function handleUnitSelect(value) {
    if (value === NEW_OPTION_VALUE) {
      setUnit('')
      setNewUnitInput('')
    } else {
      setUnit(value)
      setNewUnitInput('')
    }
  }

  function handleSourceSelect(value) {
    if (value === NEW_OPTION_VALUE) {
      setSourceName('')
      setNewSourceInput('')
    } else {
      setSourceName(value)
      setNewSourceInput('')
    }
  }

  useEffect(() => {
    if (!croppingItem && cropQueue.length > 0) {
      setCroppingItem(cropQueue[0])
      setCropQueue((prev) => prev.slice(1))
    }
  }, [cropQueue, croppingItem])

  function queueFilesForCrop(fileList, target) {
    const files = Array.from(fileList || [])
    setCropQueue((prev) => [...prev, ...files.map((file) => ({ file, target }))])
  }

  function handleCropConfirm(croppedFile) {
    if (croppingItem.target === 'question') {
      setImageFiles((prev) => [...prev, croppedFile])
    } else {
      setAnswerImageFiles((prev) => [...prev, croppedFile])
    }
    setCroppingItem(null)
  }

  function handleCropCancel() {
    setCroppingItem(null)
  }

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
    const finalUnit = (unit || newUnitInput).trim()
    const finalSource = (sourceName || newSourceInput).trim()

    if (!finalUnit || !answer.trim()) {
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
        unit: finalUnit,
        difficulty,
        question_text: questionText.trim(),
        answer: answer.trim(),
        image_urls: imageUrls,
        answer_image_urls: answerImageUrls,
        source_name: finalSource || null,
        page_number: pageNumber.trim() || null,
      })
      if (error) throw error

      // 新規入力があればオプションリストに登録
      if (newUnitInput.trim()) await registerOptionIfNew('unit', newUnitInput)
      if (newSourceInput.trim()) await registerOptionIfNew('source', newSourceInput)

      // 前回選択値として記憶
      localStorage.setItem(LAST_UNIT_KEY, finalUnit)
      if (finalSource) localStorage.setItem(LAST_SOURCE_KEY, finalSource)

      setUnit(finalUnit)
      setSourceName(finalSource)
      setNewUnitInput('')
      setNewSourceInput('')

      setMessage('登録しました')
      setQuestionText('')
      setAnswer('')
      setImageFiles([])
      setAnswerImageFiles([])
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
          <select
            value={sources.some((s) => s.name === sourceName) ? sourceName : sourceName ? NEW_OPTION_VALUE : ''}
            onChange={(e) => handleSourceSelect(e.target.value)}
          >
            <option value="">選択してください</option>
            {sources.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
            <option value={NEW_OPTION_VALUE}>＋ 新しく追加</option>
          </select>
          {(sourceName === '' || !sources.some((s) => s.name === sourceName)) && (
            <input
              type="text"
              value={newSourceInput}
              onChange={(e) => setNewSourceInput(e.target.value)}
              placeholder="新しい教材名を入力"
              className="new-option-input"
            />
          )}
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
          <select
            value={units.some((u) => u.name === unit) ? unit : unit ? NEW_OPTION_VALUE : ''}
            onChange={(e) => handleUnitSelect(e.target.value)}
          >
            <option value="">選択してください</option>
            {units.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
            <option value={NEW_OPTION_VALUE}>＋ 新しく追加</option>
          </select>
          {(unit === '' || !units.some((u) => u.name === unit)) && (
            <input
              type="text"
              value={newUnitInput}
              onChange={(e) => setNewUnitInput(e.target.value)}
              placeholder="新しい単元名を入力"
              className="new-option-input"
            />
          )}
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
            onChange={(e) => {
              queueFilesForCrop(e.target.files, 'question')
              e.target.value = ''
            }}
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
            onChange={(e) => {
              queueFilesForCrop(e.target.files, 'answer')
              e.target.value = ''
            }}
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

      <OptionsManager units={units} sources={sources} onChange={loadOptions} />

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

      {croppingItem && (
        <CropModal
          file={croppingItem.file}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
