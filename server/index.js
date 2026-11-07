const fs = require('fs')
const path = require('path')
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db, initDb } = require('./db')

initDb()

const app = express()
app.use(express.json({ limit: '20mb' }))

const SECRET = 'hct-forum-secret'
const AI_KEY = process.env.AI_API_KEY || ''

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '7d' })
}

function auth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

function optionalAuth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (token) {
    try { req.user = jwt.verify(token, SECRET) } catch { /* ignore */ }
  }
  next()
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '无权限' })
  next()
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    bio: u.bio,
    avatar: u.avatar,
    role: u.role,
    muted: !!u.muted,
    created_at: u.created_at,
  }
}

function serializePost(p, userId) {
  const author = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(p.author_id)
  const section = db.prepare('SELECT slug, name FROM sections WHERE id = ?').get(p.section_id)
  const likeCount = db.prepare('SELECT COUNT(*) c FROM likes WHERE post_id = ?').get(p.id).c
  const replyCount = db.prepare('SELECT COUNT(*) c FROM replies WHERE post_id = ?').get(p.id).c
  const liked = userId ? !!db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(p.id, userId) : false
  let media = []
  try { media = JSON.parse(p.media || '[]') } catch { media = [] }
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    media,
    pinned: !!p.pinned,
    hot: !!p.hot,
    created_at: p.created_at,
    author,
    section: section ? section.name : '',
    like_count: likeCount,
    reply_count: replyCount,
    liked,
  }
}

// ===== 健康检查 =====
app.get('/api/health', (req, res) => res.json({ ok: true }))

// ===== 认证 =====
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !username.trim() || !password) return res.status(400).json({ error: '用户名和密码不能为空' })
  if (username.trim().length < 2 || username.trim().length > 20) return res.status(400).json({ error: '用户名长度需为 2-20 个字符' })
  if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' })
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())) return res.status(409).json({ error: '用户名已存在' })
  const info = db.prepare('INSERT INTO users (username, password) VALUES (?,?)').run(username.trim(), bcrypt.hashSync(password, 10))
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid))
  res.json({ token: signToken(u), user: publicUser(u) })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get((username || '').trim())
  if (!u || !bcrypt.compareSync(password || '', u.password)) return res.status(401).json({ error: '用户名或密码错误' })
  res.json({ token: signToken(u), user: publicUser(u) })
})

app.get('/api/auth/me', auth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!u) return res.status(401).json({ error: '用户不存在' })
  res.json(publicUser(u))
})

// ===== 板块 =====
app.get('/api/sections', (req, res) => {
  const rows = db.prepare('SELECT * FROM sections ORDER BY id ASC').all()
  res.json(rows.map((s) => ({
    slug: s.slug,
    name: s.name,
    icon: s.icon,
    description: s.description,
    topic_count: db.prepare('SELECT COUNT(*) c FROM posts WHERE section_id = ?').get(s.id).c,
    post_count: db.prepare('SELECT COUNT(*) c FROM replies WHERE post_id IN (SELECT id FROM posts WHERE section_id = ?)').get(s.id).c,
  })))
})

// ===== 帖子 =====
app.get('/api/posts', optionalAuth, (req, res) => {
  const { section, sort = 'latest', page = 1, pageSize = 5 } = req.query
  const pageN = Math.max(1, parseInt(page) || 1)
  const size = Math.max(1, Math.min(50, parseInt(pageSize) || 5))

  let where = ''
  const params = []
  if (section) {
    where = 'WHERE s.slug = ?'
    params.push(section)
  }
  let order = 'ORDER BY p.pinned DESC, p.id DESC'
  if (sort === 'hot') {
    order = 'ORDER BY p.pinned DESC, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) DESC, p.id DESC'
  }

  const total = db.prepare(`SELECT COUNT(*) c FROM posts p JOIN sections s ON s.id = p.section_id ${where}`).get(...params).c
  const rows = db.prepare(`SELECT p.* FROM posts p JOIN sections s ON s.id = p.section_id ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...params, size, (pageN - 1) * size)

  res.json({ total, page: pageN, pageSize: size, posts: rows.map((p) => serializePost(p, req.user?.id)) })
})

app.get('/api/posts/:id', optionalAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const replies = db.prepare('SELECT * FROM replies WHERE post_id = ? ORDER BY floor ASC').all(p.id).map((r) => ({
    id: r.id,
    floor: r.floor,
    content: r.content,
    created_at: r.created_at,
    author: db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(r.author_id),
  }))
  res.json({ ...serializePost(p, req.user?.id), replies })
})

app.post('/api/posts', auth, (req, res) => {
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (me.muted) return res.status(403).json({ error: '你已被禁言，暂时无法发帖' })
  const { title, section, content = '', media = [] } = req.body || {}
  if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' })
  if (!content.trim() && (!media || media.length === 0)) return res.status(400).json({ error: '正文或附件不能为空' })
  const sec = db.prepare('SELECT id FROM sections WHERE slug = ?').get(section)
  if (!sec) return res.status(400).json({ error: '板块不存在' })
  const info = db.prepare('INSERT INTO posts (section_id, author_id, title, content, media) VALUES (?,?,?,?,?)')
    .run(sec.id, req.user.id, title.trim(), content.trim(), JSON.stringify(Array.isArray(media) ? media : []))
  res.json(serializePost(db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(info.lastInsertRowid)), req.user.id))
})

app.delete('/api/posts/:id', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  if (p.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权限' })
  db.prepare('DELETE FROM posts WHERE id = ?').run(p.id)
  db.prepare('DELETE FROM replies WHERE post_id = ?').run(p.id)
  db.prepare('DELETE FROM likes WHERE post_id = ?').run(p.id)
  res.json({ ok: true })
})

app.post('/api/posts/:id/like', auth, (req, res) => {
  const p = db.prepare('SELECT id FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(p.id, req.user.id)
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id)
    res.json({ liked: false })
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?,?)').run(p.id, req.user.id)
    res.json({ liked: true })
  }
})

// ===== 回复 =====
app.post('/api/posts/:id/replies', auth, (req, res) => {
  const p = db.prepare('SELECT id FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (me.muted) return res.status(403).json({ error: '你已被禁言，暂时无法回复' })
  const { content } = req.body || {}
  if (!content || !content.trim()) return res.status(400).json({ error: '回复内容不能为空' })
  const floor = db.prepare('SELECT COUNT(*) c FROM replies WHERE post_id = ?').get(p.id).c + 1
  const info = db.prepare('INSERT INTO replies (post_id, author_id, content, floor) VALUES (?,?,?,?)').run(p.id, req.user.id, content.trim(), floor)
  const r = db.prepare('SELECT * FROM replies WHERE id = ?').get(Number(info.lastInsertRowid))
  res.json({
    id: r.id,
    floor: r.floor,
    content: r.content,
    created_at: r.created_at,
    author: db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(req.user.id),
  })
})

// ===== 用户 =====
app.get('/api/users/:username', optionalAuth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  const posts = db.prepare('SELECT * FROM posts WHERE author_id = ? ORDER BY id DESC').all(u.id)
  const followers = db.prepare('SELECT COUNT(*) c FROM follows WHERE following_id = ?').get(u.id).c
  const following = db.prepare('SELECT COUNT(*) c FROM follows WHERE follower_id = ?').get(u.id).c
  const me = req.user?.id
  let is_following = false
  let is_mutual = false
  if (me) {
    is_following = !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(me, u.id)
    is_mutual = is_following && !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(u.id, me)
  }
  res.json({
    ...publicUser(u),
    post_count: posts.length,
    followers,
    following,
    is_following,
    is_mutual,
    posts: posts.map((p) => serializePost(p, me)),
  })
})

app.put('/api/users/me', auth, (req, res) => {
  const { avatar, bio } = req.body || {}
  if (avatar !== undefined) db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id)
  if (bio !== undefined) db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, req.user.id)
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)))
})

app.post('/api/users/:username/follow', auth, (req, res) => {
  const other = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username)
  if (!other) return res.status(404).json({ error: '用户不存在' })
  if (other.id === req.user.id) return res.status(400).json({ error: '不能关注自己' })
  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, other.id)
  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id)
    res.json({ following: false })
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?,?)').run(req.user.id, other.id)
    res.json({ following: true })
  }
})

// ===== 私信 =====
app.get('/api/messages', auth, (req, res) => {
  const me = req.user.id
  const rows = db.prepare(`
    SELECT m.*, CASE WHEN m.from_id = ? THEN m.to_id ELSE m.from_id END AS other_id
    FROM messages m
    WHERE m.from_id = ? OR m.to_id = ?
    ORDER BY m.id DESC
  `).all(me, me, me)
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.other_id)) {
      const other = db.prepare('SELECT username, avatar FROM users WHERE id = ?').get(r.other_id)
      map.set(r.other_id, {
        username: other.username,
        avatar: other.avatar,
        last: { content: r.content, image: r.image, created_at: r.created_at },
      })
    }
  }
  res.json([...map.values()])
})

app.get('/api/messages/:username', auth, (req, res) => {
  const other = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username)
  if (!other) return res.status(404).json({ error: '用户不存在' })
  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
    ORDER BY id ASC
  `).all(req.user.id, other.id, other.id, req.user.id)
  res.json(rows.map((r) => ({
    id: r.id,
    from_me: r.from_id === req.user.id,
    content: r.content,
    image: r.image,
    created_at: r.created_at,
  })))
})

app.post('/api/messages/:username', auth, (req, res) => {
  const other = db.prepare('SELECT id, username FROM users WHERE username = ?').get(req.params.username)
  if (!other) return res.status(404).json({ error: '用户不存在' })
  const iFollow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, other.id)
  const theyFollow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(other.id, req.user.id)
  if (!iFollow || !theyFollow) return res.status(403).json({ error: '互相关注后才能私信' })
  const { text = '', image = '' } = req.body || {}
  if (!text && !image) return res.status(400).json({ error: '内容不能为空' })
  const info = db.prepare('INSERT INTO messages (from_id, to_id, content, image) VALUES (?,?,?,?)').run(req.user.id, other.id, text, image)
  res.json({ id: Number(info.lastInsertRowid), from_me: true, content: text, image, created_at: new Date().toISOString() })
})

// ===== 通告 =====
app.get('/api/announcements', (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY id DESC').all())
})

// ===== 管理员 =====
app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
  res.json({
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    posts: db.prepare('SELECT COUNT(*) c FROM posts').get().c,
    replies: db.prepare('SELECT COUNT(*) c FROM replies').get().c,
    announcements: db.prepare('SELECT COUNT(*) c FROM announcements').get().c,
  })
})

app.post('/api/admin/announcements', auth, adminOnly, (req, res) => {
  const { title, content = '' } = req.body || {}
  if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' })
  const info = db.prepare('INSERT INTO announcements (title, content) VALUES (?,?)').run(title.trim(), content.trim())
  res.json(db.prepare('SELECT * FROM announcements WHERE id = ?').get(Number(info.lastInsertRowid)))
})

app.delete('/api/admin/announcements/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(Number(req.params.id))
  res.json({ ok: true })
})

app.post('/api/admin/users/:username/mute', auth, adminOnly, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  db.prepare('UPDATE users SET muted = 1 WHERE id = ?').run(u.id)
  res.json({ muted: true })
})

app.post('/api/admin/users/:username/unmute', auth, adminOnly, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  db.prepare('UPDATE users SET muted = 0 WHERE id = ?').run(u.id)
  res.json({ muted: false })
})

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id, username, bio, avatar, role, muted, created_at FROM users ORDER BY id ASC').all())
})

// ===== AI 助手（智谱 GLM） =====
app.post('/api/ai/chat', async (req, res) => {
  const { messages, system } = req.body || {}
  if (!AI_KEY) return res.status(503).json({ error: 'AI 未配置，请设置环境变量 AI_API_KEY' })
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: '消息不能为空' })
  const payload = {
    model: 'glm-4-flash',
    messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
  }
  try {
    const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify(payload),
    })
    const data = await resp.json()
    if (!resp.ok) return res.status(resp.status).json({ error: data?.error?.message || 'AI 调用失败' })
    res.json({ content: data?.choices?.[0]?.message?.content || '' })
  } catch (e) {
    res.status(500).json({ error: 'AI 请求失败：' + e.message })
  }
})

// 生产环境：托管前端构建产物（若存在）
const clientDist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Forum running on http://localhost:${PORT}`)
})
