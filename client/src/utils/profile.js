// 当前用户（"我"）的可编辑资料：头像 + 简介，localStorage 存储
const AVATAR_KEY = 'forum_my_avatar'
const BIO_KEY = 'forum_my_bio'

export function getMyAvatar() {
  try { return localStorage.getItem(AVATAR_KEY) || null } catch { return null }
}
export function getMyBio() {
  try { return localStorage.getItem(BIO_KEY) || null } catch { return null }
}
export function saveProfile({ avatar, bio }) {
  try {
    if (avatar) localStorage.setItem(AVATAR_KEY, avatar)
    else localStorage.removeItem(AVATAR_KEY)
    if (bio) localStorage.setItem(BIO_KEY, bio)
    else localStorage.removeItem(BIO_KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('profile-updated'))
}

// 读取图片文件，居中裁剪并压缩为 256x256 的 data URL
export function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const s = Math.min(img.width, img.height)
        const sx = (img.width - s) / 2
        const sy = (img.height - s) / 2
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}
