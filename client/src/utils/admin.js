// 管理员后台数据（localStorage 模拟，后端接入后替换为真实接口）
const KEY = 'forum_admin'

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      announcements: Array.isArray(d.announcements) ? d.announcements : [],
      deletedPosts: Array.isArray(d.deletedPosts) ? d.deletedPosts : [],
      mutedUsers: Array.isArray(d.mutedUsers) ? d.mutedUsers : [],
    }
  } catch {
    return { announcements: [], deletedPosts: [], mutedUsers: [] }
  }
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function getAdminState() {
  return load()
}

export function addAnnouncement({ title, content }) {
  const s = load()
  s.announcements.unshift({ id: `a-${Date.now()}`, title, content, time: Date.now() })
  save(s)
  window.dispatchEvent(new CustomEvent('admin-updated'))
}

export function removeAnnouncement(id) {
  const s = load()
  s.announcements = s.announcements.filter((a) => a.id !== id)
  save(s)
  window.dispatchEvent(new CustomEvent('admin-updated'))
}

export function isPostDeleted(id) {
  return load().deletedPosts.includes(id)
}

export function deletePost(id) {
  const s = load()
  if (!s.deletedPosts.includes(id)) s.deletedPosts.push(id)
  save(s)
  window.dispatchEvent(new CustomEvent('admin-updated'))
}

export function restorePost(id) {
  const s = load()
  s.deletedPosts = s.deletedPosts.filter((x) => x !== id)
  save(s)
  window.dispatchEvent(new CustomEvent('admin-updated'))
}

export function isMuted(username) {
  return load().mutedUsers.includes(username)
}

export function muteUser(username) {
  const s = load()
  if (!s.mutedUsers.includes(username)) s.mutedUsers.push(username)
  save(s)
  window.dispatchEvent(new CustomEvent('admin-updated'))
}

export function unmuteUser(username) {
  const s = load()
  s.mutedUsers = s.mutedUsers.filter((u) => u !== username)
  save(s)
  window.dispatchEvent(new CustomEvent('admin-updated'))
}
