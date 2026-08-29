import { useState } from 'react'
import { supabase } from '../sb'

export default function OptionsManager({ units, sources, onChange }) {
  const [open, setOpen] = useState(false)
  const [newUnit, setNewUnit] = useState('')
  const [newSource, setNewSource] = useState('')

  async function addOption(type, name, resetFn) {
    const trimmed = name.trim()
    if (!trimmed) return
    await supabase
      .from('sansu_meta_options')
      .insert({ option_type: type, name: trimmed })
      .select()
    resetFn('')
    onChange()
  }

  async function deleteOption(id) {
    if (!confirm('この項目を削除しますか？（すでに登録済みの問題には影響しません）')) return
    await supabase.from('sansu_meta_options').delete().eq('id', id)
    onChange()
  }

  if (!open) {
    return (
      <button type="button" className="options-manager-toggle" onClick={() => setOpen(true)}>
        単元・教材名の一覧を管理する
      </button>
    )
  }

  return (
    <div className="options-manager">
      <div className="options-manager-header">
        <h3>単元・教材名の管理</h3>
        <button type="button" onClick={() => setOpen(false)}>
          閉じる
        </button>
      </div>

      <div className="options-manager-section">
        <h4>単元</h4>
        <ul className="options-manager-list">
          {units.map((u) => (
            <li key={u.id}>
              <span>{u.name}</span>
              <button type="button" onClick={() => deleteOption(u.id)}>
                削除
              </button>
            </li>
          ))}
        </ul>
        <div className="options-manager-add">
          <input
            type="text"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="新しい単元名"
          />
          <button type="button" onClick={() => addOption('unit', newUnit, setNewUnit)}>
            追加
          </button>
        </div>
      </div>

      <div className="options-manager-section">
        <h4>テスト／教材名</h4>
        <ul className="options-manager-list">
          {sources.map((s) => (
            <li key={s.id}>
              <span>{s.name}</span>
              <button type="button" onClick={() => deleteOption(s.id)}>
                削除
              </button>
            </li>
          ))}
        </ul>
        <div className="options-manager-add">
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="新しい教材名"
          />
          <button type="button" onClick={() => addOption('source', newSource, setNewSource)}>
            追加
          </button>
        </div>
      </div>
    </div>
  )
}
