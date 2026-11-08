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

const CHUNK_SIZE = 1.5 * 1024 * 1024

function authHeaders() {
  const headers = {}
  const t = getToken()
  if (t) headers['Authorization'] = 'Bearer ' + t
  return headers
}

export async function uploadFile(file) {
  // 小文件直接传；大文件分片传（绕过网关请求体大小限制）
  if (!file || file.size <= 2 * 1024 * 1024) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(BASE + '/upload', { method: 'POST', headers: authHeaders(), body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '上传失败')
    return data.url
  }

  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const total = Math.ceil(file.size / CHUNK_SIZE)
  for (let i = 0; i < total; i++) {
    const blob = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const fd = new FormData()
    fd.append('file', blob, 'chunk')
    fd.append('uploadId', uploadId)
    fd.append('index', String(i))
    const res = await fetch(BASE + '/upload-chunk', { method: 'POST', headers: authHeaders(), body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '上传失败')
  }
  const res = await fetch(BASE + '/upload-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ uploadId, filename: file.name, total }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data.url
}
