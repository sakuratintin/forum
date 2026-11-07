// 全局点击涟漪反馈：在按钮/卡片/导航项上按下时生成涟漪
export function initRipple() {
  function onPointerDown(e) {
    const el = e.target.closest('.btn, .section-card, .nav-link, .form-tab, .board-tab, .picker-trigger, .picker-option, .action-btn, .msg-item')
    if (!el) return
    const rect = el.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const span = document.createElement('span')
    span.className = 'ripple'
    span.style.width = `${size}px`
    span.style.height = `${size}px`
    span.style.left = `${e.clientX - rect.left - size / 2}px`
    span.style.top = `${e.clientY - rect.top - size / 2}px`
    el.appendChild(span)
    span.addEventListener('animationend', () => span.remove(), { once: true })
  }

  document.addEventListener('pointerdown', onPointerDown)
  return () => document.removeEventListener('pointerdown', onPointerDown)
}
