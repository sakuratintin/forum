import { useEffect, useRef, useState } from 'react'

export default function SectionPicker({ value, onChange, sections = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = sections.find((s) => s.slug === value)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <div className="picker" ref={ref}>
      <button type="button" className={`picker-trigger${open ? ' open' : ''}`} onClick={() => setOpen((v) => !v)}>
        <span className="picker-icon">{selected?.icon || selected?.name?.[0] || '?'}</span>
        <span className="picker-value">{selected?.name || '选择板块'}</span>
        <span className={`picker-caret${open ? ' open' : ''}`}>▾</span>
      </button>

      <div className={`picker-menu${open ? ' open' : ''}`}>
        {sections.map((s) => (
          <button
            type="button"
            key={s.slug}
            className={`picker-option${s.slug === value ? ' selected' : ''}`}
            onClick={() => { onChange(s.slug); setOpen(false) }}
          >
            <span className="picker-icon">{s.icon || s.name[0]}</span>
            <span className="picker-name">{s.name}</span>
            <span className="picker-desc">{s.description}</span>
            {s.slug === value && <span className="picker-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
