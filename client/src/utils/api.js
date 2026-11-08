// 统一 API 请求封装
const BASE = '/api'

export function getToken() {
  try { return localStorage.getItem('token') || '' } catch { return '' }
}
export function setToken(t) {
  try { t ? localStorage.setItem('token', t) : localStorage.removeItem('token') } catch { /* ignore */ }
}
export function getAuthUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}
export function setAuthUser(u) {
  try { u ? localStorage.setItem('user', JSON.stringify(u)) : localStorage.removeItem('user') } catch { /* ignore */ }
}
export function notifyAuthChanged() {
  window.dispatchEvent(new CustomEvent('auth-changed'))
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const t = token !== undefined ? token : getToken()
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || '请求失败')
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}

export async function uploadFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const headers = {}
  const t = getToken()
  if (t) headers['Authorization'] = 'Bearer ' + t
  const res = await fetch(BASE + '/upload', { method: 'POST', headers, body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data.url
}
