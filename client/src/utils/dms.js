// 私信数据存储（localStorage 模拟，后端接入后替换为真实接口）
const KEY = 'forum_dms'

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

// 首次进入时播种一条欢迎私信，让界面不空
function ensureSeed() {
  const data = load()
  if (!data['管理员']) {
    data['管理员'] = [
      { id: 'seed-1', from: '管理员', text: '欢迎来到论坛！有什么问题随时私信我。', time: Date.now() - 86400000 },
    ]
    save(data)
  }
}

export function getConversations() {
  ensureSeed()
  const data = load()
  return Object.entries(data)
    .map(([username, messages]) => ({ username, last: messages[messages.length - 1] }))
    .sort((a, b) => (b.last?.time || 0) - (a.last?.time || 0))
}

export function getMessages(username) {
  ensureSeed()
  return load()[username] || []
}

export function sendMessage(username, text, image) {
  const data = load()
  const list = data[username] || []
  list.push({
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from: '我',
    text,
    image: image || null,
    time: Date.now(),
  })
  data[username] = list
  save(data)
  return [...list]
}
