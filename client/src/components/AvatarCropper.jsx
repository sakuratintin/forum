import { useEffect, useState } from 'react'

const MIN_SIZE = 48

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// 头像裁剪：拖动选框移动，拖右下角调整大小，确定后裁出正方形
export default function AvatarCropper({ file, onCancel, onDone }) {
  const [src, setSrc] = useState('')
  const [img, setImg] = useState(null)
  const [disp, setDisp] = useState({ w: 0, h: 0, scale: 1 })
  const [box, setBox] = useState({ x: 0, y: 0, size: 0 })
  const [drag, setDrag] = useState(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    const image = new Image()
    image.onload = () => {
      setImg(image)
      const MAX = 320
      const r = Math.min(MAX / image.naturalWidth, MAX / image.naturalHeight)
      const w = Math.round(image.naturalWidth * r)
      const h = Math.round(image.naturalHeight * r)
      const size = Math.round(Math.min(w, h) * 0.7)
      setDisp({ w, h, scale: r })
      setBox({ x: Math.round((w - size) / 2), y: Math.round((h - size) / 2), size })
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onPointerDown(e, type) {
    e.preventDefault()
    e.stopPropagation()
    setDrag({ type, startX: e.clientX, startY: e.clientY, startBox: { ...box } })
  }

  useEffect(() => {
    if (!drag) return
    function onMove(e) {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (drag.type === 'move') {
        const x = clamp(drag.startBox.x + dx, 0, disp.w - drag.startBox.size)
        const y = clamp(drag.startBox.y + dy, 0, disp.h - drag.startBox.size)
        setBox({ x, y, size: drag.startBox.size })
      } else {
        const maxS = Math.min(disp.w - drag.startBox.x, disp.h - drag.startBox.y)
        const size = clamp(drag.startBox.size + Math.max(dx, dy), MIN_SIZE, maxS)
        setBox({ x: drag.startBox.x, y: drag.startBox.y, size })
      }
    }
    function onUp() { setDrag(null) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, disp])

  function handleDone() {
    if (!img) return
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const sx = box.x / disp.scale
    const sy = box.y / disp.scale
    const s = box.size / disp.scale
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size)
    onDone(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">裁剪头像</h3>

        <div className="crop-area">
          {src && (
            <div className="crop-stage" style={{ width: disp.w, height: disp.h }}>
              <img src={src} alt="待裁剪" className="crop-img" draggable={false} />
              {box.size > 0 && (
                <div
                  className="crop-box"
                  style={{ left: box.x, top: box.y, width: box.size, height: box.size }}
                  onPointerDown={(e) => onPointerDown(e, 'move')}
                >
                  <div className="crop-handle" onPointerDown={(e) => onPointerDown(e, 'resize')} />
                </div>
              )}
            </div>
          )}
        </div>
        <p className="crop-hint">拖动方框移动，拖右下角调整大小</p>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={handleDone} disabled={!img}>确定</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
