import { useEffect, useRef, useState } from 'react'

const DISPLAY_MAX = 340
const HANDLE_SIZE = 22

export default function CropModal({ file, onConfirm, onCancel }) {
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const [imgUrl, setImgUrl] = useState(null)
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [rect, setRect] = useState(null) // {x, y, w, h} in displayed px
  const dragState = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleImageLoad() {
    const img = imgRef.current
    const scale = Math.min(DISPLAY_MAX / img.naturalWidth, DISPLAY_MAX / img.naturalHeight, 1)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    setDisplaySize({ w, h })
    // 初期選択範囲：中央80%
    const rw = w * 0.8
    const rh = h * 0.8
    setRect({ x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh })
  }

  function clampRect(r, bounds) {
    let { x, y, w, h } = r
    w = Math.max(30, Math.min(w, bounds.w))
    h = Math.max(30, Math.min(h, bounds.h))
    x = Math.max(0, Math.min(x, bounds.w - w))
    y = Math.max(0, Math.min(y, bounds.h - h))
    return { x, y, w, h }
  }

  function getPoint(e) {
    const container = containerRef.current.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return { x: point.clientX - container.left, y: point.clientY - container.top }
  }

  function startDrag(mode) {
    return (e) => {
      e.preventDefault()
      const p = getPoint(e)
      dragState.current = { mode, startX: p.x, startY: p.y, startRect: { ...rect } }
    }
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragState.current) return
      const p = getPoint(e)
      const dx = p.x - dragState.current.startX
      const dy = p.y - dragState.current.startY
      const sr = dragState.current.startRect
      const bounds = displaySize
      let next = { ...sr }

      switch (dragState.current.mode) {
        case 'move':
          next.x = sr.x + dx
          next.y = sr.y + dy
          break
        case 'nw':
          next.x = sr.x + dx
          next.y = sr.y + dy
          next.w = sr.w - dx
          next.h = sr.h - dy
          break
        case 'ne':
          next.y = sr.y + dy
          next.w = sr.w + dx
          next.h = sr.h - dy
          break
        case 'sw':
          next.x = sr.x + dx
          next.w = sr.w - dx
          next.h = sr.h + dy
          break
        case 'se':
          next.w = sr.w + dx
          next.h = sr.h + dy
          break
        default:
          break
      }
      setRect(clampRect(next, bounds))
    }
    function onUp() {
      dragState.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [displaySize])

  function handleConfirm() {
    const img = imgRef.current
    const scale = img.naturalWidth / displaySize.w
    const sx = rect.x * scale
    const sy = rect.y * scale
    const sw = rect.w * scale
    const sh = rect.h * scale

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    canvas.toBlob(
      (blob) => {
        const croppedFile = new File([blob], file.name, { type: 'image/jpeg' })
        onConfirm(croppedFile)
      },
      'image/jpeg',
      0.9
    )
  }

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal">
        <p className="crop-modal-title">必要な部分だけ選んでください</p>
        <div
          className="crop-modal-image-wrap"
          ref={containerRef}
          style={{ width: displaySize.w || DISPLAY_MAX, height: displaySize.h || DISPLAY_MAX }}
        >
          <img
            ref={imgRef}
            src={imgUrl}
            alt="トリミング対象"
            onLoad={handleImageLoad}
            className="crop-modal-image"
            draggable={false}
          />
          {rect && (
            <>
              <div
                className="crop-mask"
                style={{ clipPath: `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${rect.x}px ${rect.y}px,
                  ${rect.x}px ${rect.y + rect.h}px,
                  ${rect.x + rect.w}px ${rect.y + rect.h}px,
                  ${rect.x + rect.w}px ${rect.y}px,
                  ${rect.x}px ${rect.y}px
                )` }}
              />
              <div
                className="crop-rect"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                onMouseDown={startDrag('move')}
                onTouchStart={startDrag('move')}
              >
                <div
                  className="crop-handle crop-handle-nw"
                  onMouseDown={startDrag('nw')}
                  onTouchStart={startDrag('nw')}
                />
                <div
                  className="crop-handle crop-handle-ne"
                  onMouseDown={startDrag('ne')}
                  onTouchStart={startDrag('ne')}
                />
                <div
                  className="crop-handle crop-handle-sw"
                  onMouseDown={startDrag('sw')}
                  onTouchStart={startDrag('sw')}
                />
                <div
                  className="crop-handle crop-handle-se"
                  onMouseDown={startDrag('se')}
                  onTouchStart={startDrag('se')}
                />
              </div>
            </>
          )}
        </div>
        <div className="crop-modal-buttons">
          <button type="button" className="secondary-button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="primary-button" onClick={handleConfirm}>
            この範囲で使う
          </button>
        </div>
      </div>
    </div>
  )
}
