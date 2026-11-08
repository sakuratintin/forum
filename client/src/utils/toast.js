let container = null

function ensureContainer() {
  if (container && document.body.contains(container)) return container
  container = document.createElement('div')
  container.className = 'toast-container'
  document.body.appendChild(container)
  return container
}

export function toast(message, type = 'info') {
  if (!message) return
  const c = ensureContainer()
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = message
  c.appendChild(el)
  while (c.children.length > 5) c.removeChild(c.firstChild)
  setTimeout(() => {
    el.classList.add('toast-out')
    setTimeout(() => el.remove(), 320)
  }, 2600)
}

export const toastOk = (m) => toast(m, 'success')
export const toastErr = (m) => toast(m, 'error')
export const toastInfo = (m) => toast(m, 'info')
