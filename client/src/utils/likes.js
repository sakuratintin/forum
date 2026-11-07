// 点赞数据（localStorage 模拟，后端接入后替换为真实接口）
const KEY = 'forum_liked_posts'

function load() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function save(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

export function isLiked(postId) {
  return load().includes(postId)
}

export function toggleLike(postId) {
  const arr = load()
  const liked = arr.includes(postId)
  const next = liked ? arr.filter((id) => id !== postId) : [...arr, postId]
  save(next)
  window.dispatchEvent(new CustomEvent('likes-updated'))
  return !liked
}

export function getLikeCount(post) {
  const base = Math.round((post.views || 0) / 8)
  return base + (isLiked(post.id) ? 1 : 0)
}
