import { useEffect, useRef, useState } from 'react'

const ACCEPT = ['image/', 'video/']
const MAX_FILES = 9

// 媒体上传：支持拖拽/点击选择，图片与视频预览，可删除
export default function MediaUploader({ files, onChange }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [urls, setUrls] = useState([])

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f))
    setUrls(next)
    return () => next.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function addFiles(list) {
    const incoming = Array.from(list)
    const valid = []
    let msg = ''
    for (const f of incoming) {
      if (!ACCEPT.some((t) => f.type.startsWith(t))) {
        msg = '仅支持图片和视频文件'
        continue
      }
      if (files.length + valid.length >= MAX_FILES) {
        msg = `最多上传 ${MAX_FILES} 个文件`
        break
      }
      valid.push(f)
    }
    setError(msg)
    if (valid.length) onChange([...files, ...valid])
  }

  function removeAt(i) {
    onChange(files.filter((_, idx) => idx !== i))
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  return (
    <div className="uploader">
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="dropzone-icon">⬆</span>
        <p className="dropzone-title">点击或拖拽上传图片 / 视频</p>
        <p className="dropzone-hint">支持 JPG / PNG / GIF / WebP / MP4 / WebM，最多 {MAX_FILES} 个</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        hidden
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
      />

      {error && <p key={error} className="form-error shake">{error}</p>}

      {files.length > 0 && (
        <div className="upload-grid">
          {files.map((f, i) => (
            <div className="upload-item" key={`${f.name}-${i}`}>
              {f.type.startsWith('video/') ? (
                <video src={urls[i]} controls muted playsInline preload="metadata" />
              ) : (
                <img src={urls[i]} alt={f.name} />
              )}
              <span className="upload-tag">{f.type.startsWith('video/') ? '视频' : '图片'}</span>
              <button type="button" className="upload-remove" onClick={() => removeAt(i)} aria-label="移除">×</button>
              <span className="upload-name">{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
