// 模拟用户资料（后端接入后替换为真实接口）
const BIOS = {
  管理员: '论坛管理员，负责站务与维护。',
  阿泽: 'ACG 爱好者，日常追番。',
  学霸君: '分享学习资料，共同进步。',
  动漫社社长: '动漫社招新中，欢迎加入！',
  卖家老王: '诚信交易，童叟无欺。',
  我: '这是你的个人主页，快去发布你的第一篇帖子吧！',
}

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function getUser(username) {
  const h = hash(username || '')
  return {
    username: username || '用户',
    avatar: (username || '用')[0],
    bio: BIOS[username] || '这个人很懒，还没有填写简介。',
    followers: 10 + (h % 300),
    following: 5 + (h % 80),
    joinDate: `2025-${String(1 + (h % 12)).padStart(2, '0')}-${String(1 + (h % 28)).padStart(2, '0')}`,
  }
}
