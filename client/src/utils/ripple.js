// 全局点击涟漪反馈：在按钮/卡片/导航项等可点击元素上按下时生成涟漪
const RIPPLE_SELECTOR = [
  '.btn',
  '.section-card',
  '.nav-link',
  '.nav-dropdown-item',
  '.form-tab',
  '.board-tab',
  '.board-switch',
  '.picker-trigger',
  '.picker-option',
  '.action-btn',
  '.msg-item',
  '.post-item',
  '.user-card',
  '.userlist-item',
  '.ai-suggest-btn',
  '.ai-mic',
  '.reply-eva-btn',
  '.pagination button',
].join(', ')

export function initRipple() {
  function onPointerDown(e) {
    const el = e.target.closest(RIPPLE_SELECTOR)
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
