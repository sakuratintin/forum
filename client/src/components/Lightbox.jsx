import { useEffect } from 'react'

export default function Lightbox({ images = [], index = 0, onClose, onPrev, onNext }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowLeft') onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  if (!images.length) return null
  const src = images[index]
  if (!src) return null

  return (
    <div className="lightbox" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="关闭">×</button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox-nav prev"
            onClick={(e) => { e.stopPropagation(); onPrev?.() }}
            aria-label="上一张"
          >‹</button>
          <button
            type="button"
            className="lightbox-nav next"
            onClick={(e) => { e.stopPropagation(); onNext?.() }}
            aria-label="下一张"
          >›</button>
          <span className="lightbox-count">{index + 1} / {images.length}</span>
        </>
      )}
      <img className="lightbox-img" src={src} alt="预览" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
