// 关注关系（localStorage 模拟，后端接入后替换为真实接口）
const KEY = 'follows'
const SEED = ['管理员', '阿泽']

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) {
      localStorage.setItem(KEY, JSON.stringify(SEED))
      return [...SEED]
    }
    const arr = JSON.parse(raw)
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

export function getFollowing() {
  return load()
}

export function isFollowing(username) {
  return load().includes(username)
}

export function toggleFollow(username) {
  const arr = load()
  const following = arr.includes(username)
  const next = following ? arr.filter((u) => u !== username) : [...arr, username]
  save(next)
  window.dispatchEvent(new CustomEvent('follows-updated'))
  return !following
}

// 模拟：已经关注我的用户（用于判断互相关注）
const MY_FOLLOWERS = ['管理员', '阿泽', '学霸君', '动漫社社长']

export function isMutual(username) {
  return isFollowing(username) && MY_FOLLOWERS.includes(username)
}

export function isMutualWith(username, following) {
  return following && MY_FOLLOWERS.includes(username)
}
