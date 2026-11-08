const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db, initDb, dbPath, isPersisted } = require('./db')

initDb()

const SECRET = 'hct-forum-secret'
const AI_KEY = process.env.AI_API_KEY || ''
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const AI_PROVIDER = process.env.AI_PROVIDER || (DEEPSEEK_KEY ? 'deepseek' : 'zhipu')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(path.dirname(process.env.DB_PATH || path.join(__dirname, 'forum.db')), 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key)
  return row && row.value ? row.value : fallback
}
function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value)
}

const app = express()
app.use(express.json({ limit: '20mb' }))
app.use('/uploads', express.static(UPLOAD_DIR))

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
    uid: u.uid || '',
    bio: u.bio,
    avatar: u.avatar,
    role: u.role,
    muted: !!u.muted,
    created_at: u.created_at,
  }
}

// 用户列表附带「当前登录用户是否已关注 TA」
function listWithFollow(req, rows) {
  const me = req.user?.id
  return rows.map((x) => ({
    ...publicUser(x),
    post_count: db.prepare('SELECT COUNT(*) c FROM posts WHERE author_id = ?').get(x.id).c,
    is_following: me ? !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(me, x.id) : false,
  }))
}

// ===== 通知：@提醒 + 回复提醒 =====
function notifyMentions(content, actorId, postId, replyId) {
  if (!content || !content.includes('@')) return
  const users = db.prepare('SELECT id, username FROM users WHERE id <> ?').all(actorId)
  const ins = db.prepare('INSERT INTO notifications (user_id, actor_id, type, post_id, reply_id, snippet) VALUES (?,?,?,?,?,?)')
  const snippet = content.slice(0, 100)
  for (const u of users) {
    if (u.username && content.includes('@' + u.username)) {
      ins.run(u.id, actorId, 'mention', postId || null, replyId || null, snippet)
    }
  }
}

function notifyReply(postAuthorId, actorId, postId, replyId, content) {
  if (!postAuthorId || postAuthorId === actorId) return
  db.prepare('INSERT INTO notifications (user_id, actor_id, type, post_id, reply_id, snippet) VALUES (?,?,?,?,?,?)')
    .run(postAuthorId, actorId, 'reply', postId, replyId || null, (content || '').slice(0, 100))
}

function serializePost(p, userId) {
  const author = db.prepare('SELECT id, username, avatar, uid FROM users WHERE id = ?').get(p.author_id)
  const authorFollowing = userId && author ? !!db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(userId, author.id) : false
  const section = db.prepare('SELECT slug, name FROM sections WHERE id = ?').get(p.section_id)
  const likeCount = db.prepare('SELECT COUNT(*) c FROM likes WHERE post_id = ?').get(p.id).c
  const replyCount = db.prepare('SELECT COUNT(*) c FROM replies WHERE post_id = ?').get(p.id).c
  const lastReply = db.prepare('SELECT MAX(created_at) AS t FROM replies WHERE post_id = ?').get(p.id)
  const liked = userId ? !!db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(p.id, userId) : false
  const bookmarked = userId ? !!db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, p.id) : false
  let media = []
  try { media = JSON.parse(p.media || '[]') } catch { media = [] }
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    media,
    pinned: !!p.pinned,
    hot: !!p.hot,
    views: p.views || 0,
    created_at: p.created_at,
    last_reply_at: lastReply ? lastReply.t : null,
    author: author ? { ...author, is_following: authorFollowing } : null,
    section: section ? section.name : '',
    section_slug: section ? section.slug : '',
    like_count: likeCount,
    reply_count: replyCount,
    liked,
    bookmarked,
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
  const newId = Number(info.lastInsertRowid)
  db.prepare('UPDATE users SET uid = ? WHERE id = ?').run(String(100000 + newId), newId)
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(newId)
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
  const { section, sort = 'latest', page = 1, pageSize = 5, q } = req.query
  const pageN = Math.max(1, parseInt(page) || 1)
  const size = Math.max(1, Math.min(50, parseInt(pageSize) || 5))

  const conds = []
  const params = []
  if (section) {
    conds.push('s.slug = ?')
    params.push(section)
  }
  if (q && q.trim()) {
    conds.push('(p.title LIKE ? OR p.content LIKE ?)')
    params.push(`%${q.trim()}%`, `%${q.trim()}%`)
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  let order = 'ORDER BY p.pinned DESC, p.id DESC'
  if (sort === 'hot') {
    order = 'ORDER BY p.pinned DESC, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) DESC, p.id DESC'
  }

  const total = db.prepare(`SELECT COUNT(*) c FROM posts p LEFT JOIN sections s ON s.id = p.section_id ${where}`).get(...params).c
  const rows = db.prepare(`SELECT p.* FROM posts p LEFT JOIN sections s ON s.id = p.section_id ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...params, size, (pageN - 1) * size)

  res.json({ total, page: pageN, pageSize: size, posts: rows.map((p) => serializePost(p, req.user?.id)) })
})

app.get('/api/posts/:id', optionalAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(p.id)
  p.views = (p.views || 0) + 1
  const replies = db.prepare('SELECT * FROM replies WHERE post_id = ? ORDER BY floor ASC').all(p.id).map((r) => {
    const author = db.prepare('SELECT id, username, avatar, role FROM users WHERE id = ?').get(r.author_id)
    return {
      id: r.id,
      floor: r.floor,
      content: r.content,
      created_at: r.created_at,
      author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null,
      is_ai: author?.role === 'ai',
    }
  })
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
  const newPostId = Number(info.lastInsertRowid)
  notifyMentions(content.trim(), req.user.id, newPostId)
  res.json(serializePost(db.prepare('SELECT * FROM posts WHERE id = ?').get(newPostId), req.user.id))
})

// 编辑帖子（作者本人或管理员）
app.put('/api/posts/:id', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const me = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id)
  if (!me || (p.author_id !== req.user.id && me.role !== 'admin')) return res.status(403).json({ error: '无权编辑此帖' })
  const { title, section, content = '' } = req.body || {}
  if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' })
  let sectionId = p.section_id
  if (section) {
    const sec = db.prepare('SELECT id FROM sections WHERE slug = ?').get(section)
    if (!sec) return res.status(400).json({ error: '板块不存在' })
    sectionId = sec.id
  }
  db.prepare('UPDATE posts SET title = ?, section_id = ?, content = ? WHERE id = ?').run(title.trim(), sectionId, content.trim(), p.id)
  res.json(serializePost(db.prepare('SELECT * FROM posts WHERE id = ?').get(p.id), req.user.id))
})

app.delete('/api/posts/:id', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  if (p.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权限' })
  db.prepare('DELETE FROM posts WHERE id = ?').run(p.id)
  db.prepare('DELETE FROM replies WHERE post_id = ?').run(p.id)
  db.prepare('DELETE FROM likes WHERE post_id = ?').run(p.id)
  db.prepare('DELETE FROM bookmarks WHERE post_id = ?').run(p.id)
  res.json({ ok: true })
})

app.post('/api/posts/:id/like', auth, (req, res) => {
  const p = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(p.id, req.user.id)
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id)
    res.json({ liked: false })
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?,?)').run(p.id, req.user.id)
    if (p.author_id && p.author_id !== req.user.id) {
      db.prepare('INSERT INTO notifications (user_id, actor_id, type, post_id, snippet) VALUES (?,?,?,?,?)')
        .run(p.author_id, req.user.id, 'like', p.id, '')
    }
    res.json({ liked: true })
  }
})

app.post('/api/posts/:id/bookmark', auth, (req, res) => {
  const p = db.prepare('SELECT id FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const existing = db.prepare('SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?').get(p.id, req.user.id)
  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id)
    res.json({ bookmarked: false })
  } else {
    db.prepare('INSERT INTO bookmarks (post_id, user_id) VALUES (?,?)').run(p.id, req.user.id)
    res.json({ bookmarked: true })
  }
})

app.get('/api/bookmarks', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.* FROM bookmarks b JOIN posts p ON p.id = b.post_id
    WHERE b.user_id = ? ORDER BY b.id DESC LIMIT 100
  `).all(req.user.id)
  res.json(rows.map((p) => serializePost(p, req.user.id)))
})

// ===== 置顶（仅管理员） =====
app.post('/api/posts/:id/pin', auth, (req, res) => {
  const me = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id)
  if (!me || me.role !== 'admin') return res.status(403).json({ error: '只有管理员可以置顶帖子' })
  const p = db.prepare('SELECT id, pinned FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const next = p.pinned ? 0 : 1
  db.prepare('UPDATE posts SET pinned = ? WHERE id = ?').run(next, p.id)
  res.json({ pinned: !!next })
})

// ===== 标记热门（仅管理员） =====
app.post('/api/posts/:id/hot', auth, (req, res) => {
  const me = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id)
  if (!me || me.role !== 'admin') return res.status(403).json({ error: '只有管理员可以标记热门' })
  const p = db.prepare('SELECT id, hot FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const next = p.hot ? 0 : 1
  db.prepare('UPDATE posts SET hot = ? WHERE id = ?').run(next, p.id)
  res.json({ hot: !!next })
})

// ===== 回复 =====
app.post('/api/posts/:id/replies', auth, async (req, res) => {
  const p = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(Number(req.params.id))
  if (!p) return res.status(404).json({ error: '帖子不存在' })
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (me.muted) return res.status(403).json({ error: '你已被禁言，暂时无法回复' })
  const { content } = req.body || {}
  if (!content || !content.trim()) return res.status(400).json({ error: '回复内容不能为空' })
  const floor = db.prepare('SELECT COUNT(*) c FROM replies WHERE post_id = ?').get(p.id).c + 1
  const info = db.prepare('INSERT INTO replies (post_id, author_id, content, floor) VALUES (?,?,?,?)').run(p.id, req.user.id, content.trim(), floor)
  const r = db.prepare('SELECT * FROM replies WHERE id = ?').get(Number(info.lastInsertRowid))
  const myReply = {
    id: r.id,
    floor: r.floor,
    content: r.content,
    created_at: r.created_at,
    author: db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(req.user.id),
  }

  // 回复里 @EVA 时，让 AI 读取帖子与评论后作答
  notifyMentions(content.trim(), req.user.id, p.id, r.id)
  notifyReply(p.author_id, req.user.id, p.id, r.id, content.trim())
  const aiReply = await maybeEvaReply(p.id, content.trim())
  res.json({ ...myReply, aiReply })
})

async function maybeEvaReply(postId, content) {
  if (!/@EVA/i.test(content)) return null
  const eva = db.prepare("SELECT id FROM users WHERE username = 'EVA'").get()
  if (!eva) return null
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId)
  if (!post) return null
  const recent = db.prepare('SELECT content FROM replies WHERE post_id = ? ORDER BY id ASC').all(postId).slice(-15)
  const question = content.replace(/@EVA/gi, '').trim() || '请阅读这个帖子和大家的讨论，给出你的看法。'
  const messages = [
    { role: 'system', content: '你是论坛 H.C.T. Forum 的 AI 助手 EVA。请阅读帖子正文和已有回复，用简洁、友好的中文回答用户的提问（200 字以内），直接给出答案，不要多余解释。' },
    {
      role: 'user',
      content: `帖子标题：${post.title}\n帖子正文：${post.content || '（无正文）'}\n\n已有回复：\n${recent.map((x) => '- ' + x.content).join('\n') || '（暂无）'}\n\n用户提问：${question}`,
    },
  ]
  try {
    const answer = (await callAI(messages)).trim()
    if (!answer) return null
    const floor = db.prepare('SELECT COUNT(*) c FROM replies WHERE post_id = ?').get(postId).c + 1
    const info = db.prepare('INSERT INTO replies (post_id, author_id, content, floor) VALUES (?,?,?,?)').run(postId, eva.id, answer, floor)
    const rr = db.prepare('SELECT * FROM replies WHERE id = ?').get(Number(info.lastInsertRowid))
    return {
      id: rr.id,
      floor: rr.floor,
      content: rr.content,
      created_at: rr.created_at,
      author: db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(eva.id),
      is_ai: true,
    }
  } catch (e) {
    return { error: 'AI 回复失败：' + e.message }
  }
}

// ===== 用户 =====
app.get('/api/users', optionalAuth, (req, res) => {
  const q = (req.query.q || '').trim()
  const rows = q
    ? db.prepare("SELECT id, username, uid, bio, avatar, role, muted, created_at FROM users WHERE role <> 'ai' AND (username LIKE ? OR uid LIKE ?) ORDER BY id ASC LIMIT 50").all(`%${q}%`, `%${q}%`)
    : db.prepare("SELECT id, username, uid, bio, avatar, role, muted, created_at FROM users WHERE role <> 'ai' ORDER BY id ASC LIMIT 50").all()
  res.json(listWithFollow(req, rows))
})

app.get('/api/users/:username/followers', optionalAuth, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  const rows = db.prepare('SELECT us.id, us.username, us.uid, us.avatar, us.bio, us.role, us.muted, us.created_at FROM follows f JOIN users us ON us.id = f.follower_id WHERE f.following_id = ? ORDER BY f.id DESC LIMIT 100').all(u.id)
  res.json(listWithFollow(req, rows))
})

app.get('/api/users/:username/following', optionalAuth, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  const rows = db.prepare('SELECT us.id, us.username, us.uid, us.avatar, us.bio, us.role, us.muted, us.created_at FROM follows f JOIN users us ON us.id = f.following_id WHERE f.follower_id = ? ORDER BY f.id DESC LIMIT 100').all(u.id)
  res.json(listWithFollow(req, rows))
})

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
app.get('/api/mutual', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.uid
    FROM follows f1
    JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
    JOIN users u ON u.id = f1.following_id
    WHERE f1.follower_id = ?
    ORDER BY f1.id DESC LIMIT 100
  `).all(req.user.id)
  res.json(rows)
})

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

// ===== 通知 =====
app.get('/api/notifications', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, a.username AS actor_name, a.avatar AS actor_avatar, p.title AS post_title
    FROM notifications n
    JOIN users a ON a.id = n.actor_id
    LEFT JOIN posts p ON p.id = n.post_id
    WHERE n.user_id = ?
    ORDER BY n.id DESC LIMIT 100
  `).all(req.user.id)
  const unread = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).c
  res.json({
    unread,
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      post_id: r.post_id,
      reply_id: r.reply_id,
      post_title: r.post_title || '',
      snippet: r.snippet || '',
      read: !!r.read,
      created_at: r.created_at,
      actor: { username: r.actor_name, avatar: r.actor_avatar || '' },
    })),
  })
})

app.get('/api/notifications/unread', auth, (req, res) => {
  res.json({ unread: db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).c })
})

app.post('/api/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id)
  res.json({ ok: true })
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

// ===== 管理员：数据备份 =====
app.get('/api/admin/data-info', auth, adminOnly, (req, res) => {
  let size = 0
  try {
    size = fs.statSync(dbPath).size
  } catch {
    /* ignore */
  }
  const dir = path.join(path.dirname(dbPath), 'backups')
  let backups = []
  try {
    backups = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.db'))
      .sort()
      .reverse()
      .map((f) => {
        const st = fs.statSync(path.join(dir, f))
        return { name: f, size: st.size, time: st.mtime.toISOString() }
      })
  } catch {
    /* ignore */
  }
  res.json({
    dbPath,
    dbSize: size,
    backupDir: dir,
    backups,
    mounted: isPersisted,
    counts: {
      users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
      posts: db.prepare('SELECT COUNT(*) c FROM posts').get().c,
      replies: db.prepare('SELECT COUNT(*) c FROM replies').get().c,
    },
    orphans: {
      posts: db.prepare('SELECT COUNT(*) c FROM posts WHERE section_id NOT IN (SELECT id FROM sections)').get().c,
      replies: db.prepare('SELECT COUNT(*) c FROM replies WHERE post_id NOT IN (SELECT id FROM posts)').get().c,
    },
  })
})

// ===== 管理员：从备份恢复 =====
const restoreUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } })

app.post('/api/admin/restore', auth, adminOnly, restoreUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有上传文件' })
  const head = req.file.buffer.slice(0, 15).toString('utf8')
  if (head !== 'SQLite format 3') return res.status(400).json({ error: '不是有效的 SQLite 数据库文件' })
  try {
    fs.writeFileSync(path.join(path.dirname(dbPath), 'restore-pending.db'), req.file.buffer)
    res.json({ ok: true, message: '备份已上传，请重新部署（重启服务）以完成恢复' })
  } catch (e) {
    res.status(500).json({ error: '保存失败：' + e.message })
  }
})

app.get('/api/admin/backup', auth, adminOnly, (req, res) => {
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error: '数据库文件不存在' })
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  res.download(dbPath, `forum-backup-${stamp}.db`)
})

// ===== 管理员：选择 AI 模型 =====
app.get('/api/admin/ai-model', auth, adminOnly, (req, res) => {
  res.json({
    provider: currentAIProvider(),
    envDefault: AI_PROVIDER,
    available: { zhipu: !!AI_KEY, deepseek: !!DEEPSEEK_KEY },
  })
})

app.put('/api/admin/ai-model', auth, adminOnly, (req, res) => {
  const { provider } = req.body || {}
  if (!provider || !['zhipu', 'deepseek'].includes(provider)) return res.status(400).json({ error: '无效的模型选项' })
  if (provider === 'deepseek' && !DEEPSEEK_KEY) return res.status(400).json({ error: '未配置 DeepSeek Key（DEEPSEEK_API_KEY）' })
  if (provider === 'zhipu' && !AI_KEY) return res.status(400).json({ error: '未配置智谱 Key（AI_API_KEY）' })
  setSetting('ai_provider', provider)
  res.json({ provider })
})

// ===== AI 助手（可在智谱 / DeepSeek 之间切换） =====
function currentAIProvider() {
  return getSetting('ai_provider', AI_PROVIDER)
}

function chatConfigured() {
  return currentAIProvider() === 'deepseek' ? !!DEEPSEEK_KEY : !!AI_KEY
}

async function callZhipu(messages) {
  if (!AI_KEY) throw new Error('智谱 AI 未配置，请设置环境变量 AI_API_KEY')
  const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
    body: JSON.stringify({ model: process.env.ZHIPU_MODEL || 'glm-4-flash', messages }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error((data && data.error && data.error.message) || '智谱 AI 调用失败')
  return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
}

async function callDeepSeek(messages) {
  if (!DEEPSEEK_KEY) throw new Error('DeepSeek 未配置，请设置环境变量 DEEPSEEK_API_KEY')
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_KEY },
    body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', messages }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error((data && data.error && data.error.message) || 'DeepSeek 调用失败')
  return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
}

async function callAI(messages) {
  return currentAIProvider() === 'deepseek' ? callDeepSeek(messages) : callZhipu(messages)
}

app.post('/api/ai/chat', async (req, res) => {
  const { messages, system } = req.body || {}
  if (!chatConfigured()) return res.status(503).json({ error: 'AI 未配置，请设置环境变量 AI_API_KEY 或 DEEPSEEK_API_KEY' })
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: '消息不能为空' })
  try {
    const content = await callAI(system ? [{ role: 'system', content: system }, ...messages] : messages)
    res.json({ content })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ===== AI 语音识别（智谱 ASR） =====
const asrUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

app.post('/api/ai/transcribe', auth, asrUpload.single('file'), async (req, res) => {
  if (!AI_KEY) return res.status(503).json({ error: 'AI 未配置，请设置环境变量 AI_API_KEY' })
  if (!req.file) return res.status(400).json({ error: '没有音频文件' })
  try {
    const fd = new FormData()
    fd.append('model', 'glm-asr-2512')
    fd.append('stream', 'false')
    fd.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' }), req.file.originalname || 'voice.webm')
    const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + AI_KEY },
      body: fd,
    })
    const data = await resp.json()
    if (!resp.ok) return res.status(resp.status).json({ error: (data && data.error && data.error.message) || '语音识别失败' })
    res.json({ text: data.text || '' })
  } catch (e) {
    res.status(500).json({ error: '语音识别失败：' + e.message })
  }
})

// ===== 热点资讯（AI 搜索 + 摘要） =====
const HOT_CATEGORIES = {
  news: { label: '新闻', query: '今日热点新闻', engine: 'search_pro', recency: 'oneDay' },
  sports: { label: '赛事', query: '体育赛事 最新战况', engine: 'search_pro', recency: 'oneDay' },
  anime: { label: '动漫', query: '动漫资讯 新番', engine: 'search_pro', recency: 'oneWeek' },
  game: { label: '游戏', query: '游戏新闻 新游发售', engine: 'search_pro', recency: 'oneWeek' },
}

async function webSearch(query, engine, recency) {
  if (!AI_KEY) throw new Error('AI 未配置')
  const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/web_search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
    body: JSON.stringify({ search_query: query, search_engine: engine, search_intent: false, count: 8, search_recency_filter: recency, content_size: 'high' }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error((data && data.error && data.error.message) || '搜索失败')
  return data.search_result || []
}

app.post('/api/hot/fetch', auth, async (req, res) => {
  const me = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id)
  if (!me || me.role !== 'admin') return res.status(403).json({ error: '只有管理员可以抓取热点' })
  const counts = {}
  const errors = []
  for (const [cat, cfg] of Object.entries(HOT_CATEGORIES)) {
    try {
      const results = await webSearch(cfg.query, cfg.engine, cfg.recency)
      const ins = db.prepare('INSERT INTO hot_topics (category, title, summary, source, link, published_at) VALUES (?,?,?,?,?,?)')
      const exists = db.prepare('SELECT id FROM hot_topics WHERE link = ?')
      let added = 0
      for (const r of results) {
        if (!r.title) continue
        const link = r.link || ''
        if (link && exists.get(link)) continue
        ins.run(cat, String(r.title).slice(0, 200), r.content || '', r.media || '', link, r.publish_date || '')
        added++
      }
      db.prepare('DELETE FROM hot_topics WHERE category = ? AND id NOT IN (SELECT id FROM hot_topics WHERE category = ? ORDER BY id DESC LIMIT 50)').run(cat, cat)
      counts[cat] = added
      try {
        const text = results.slice(0, 8).map((r, i) => `${i + 1}. ${r.title}：${(r.content || '').slice(0, 80)}`).join('\n')
        const summary = await callAI([
          { role: 'system', content: '你是资讯编辑。根据下面的资讯标题和摘要，用 120~160 字写一段「今日速览」，概括主要看点。只依据给定内容，不要编造，直接输出一段话。' },
          { role: 'user', content: text },
        ])
        if (summary) {
          db.prepare("INSERT OR REPLACE INTO hot_summaries (category, content, fetched_at) VALUES (?,?,datetime('now','localtime'))").run(cat, summary.trim())
        }
      } catch {
        /* 摘要失败不影响主流程 */
      }
    } catch (e) {
      counts[cat] = 0
      errors.push(cfg.label + '：' + e.message)
    }
  }
  res.json({ ok: true, counts, errors })
})

app.get('/api/hot', (req, res) => {
  const summaries = {}
  for (const s of db.prepare('SELECT * FROM hot_summaries').all()) {
    summaries[s.category] = { content: s.content, fetched_at: s.fetched_at }
  }
  const category = req.query.category
  const items = category
    ? db.prepare('SELECT * FROM hot_topics WHERE category = ? ORDER BY id DESC LIMIT 60').all(category)
    : db.prepare('SELECT * FROM hot_topics ORDER BY id DESC LIMIT 120').all()
  res.json({ summaries, items })
})

app.get('/api/hot/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM hot_topics WHERE id = ?').get(Number(req.params.id))
  if (!item) return res.status(404).json({ error: '热点不存在' })
  res.json(item)
})

// 用 AI 把单条资讯归纳总结成一段话（首次生成后缓存）
app.post('/api/hot/:id/summarize', async (req, res) => {
  const item = db.prepare('SELECT * FROM hot_topics WHERE id = ?').get(Number(req.params.id))
  if (!item) return res.status(404).json({ error: '热点不存在' })
  if (item.ai_summary) return res.json({ ai_summary: item.ai_summary })
  const text = `标题：${item.title}\n来源：${item.source || '未知'}\n原始内容：${item.summary || '（无）'}`
  try {
    const s = await callAI([
      {
        role: 'system',
        content: '你是论坛资讯编辑。请把下面这条资讯用 200~350 字归纳总结成一段通顺的话，写清楚：①发生了什么 ②关键信息（人物、时间、地点、数据等）③背景或影响。只依据给定内容，不要编造；不要列点、不要小标题，直接输出一段完整的话。',
      },
      { role: 'user', content: text },
    ])
    const ai_summary = (s || '').trim()
    if (ai_summary) db.prepare('UPDATE hot_topics SET ai_summary = ? WHERE id = ?').run(ai_summary, item.id)
    res.json({ ai_summary })
  } catch (e) {
    res.status(500).json({ error: 'AI 总结失败：' + e.message })
  }
})

// ===== 文件上传（图片 / 视频 / 头像） =====
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
})

app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有文件' })
  res.json({ url: '/uploads/' + req.file.filename })
})

// ===== 分片上传（大文件绕过网关请求体限制） =====
app.post('/api/upload-chunk', auth, upload.single('file'), (req, res) => {
  const uploadId = String((req.body && req.body.uploadId) || '')
  if (!uploadId) return res.status(400).json({ error: '缺少 uploadId' })
  const tmpDir = path.join(UPLOAD_DIR, 'tmp', uploadId)
  try {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.renameSync(req.file.path, path.join(tmpDir, String(parseInt(req.body.index) || 0)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: '分片保存失败：' + e.message })
  }
})

app.post('/api/upload-complete', auth, (req, res) => {
  const uploadId = String((req.body && req.body.uploadId) || '')
  const filename = String((req.body && req.body.filename) || 'file')
  const total = parseInt(req.body && req.body.total) || 1
  if (!uploadId) return res.status(400).json({ error: '缺少 uploadId' })
  const tmpDir = path.join(UPLOAD_DIR, 'tmp', uploadId)
  if (!fs.existsSync(tmpDir)) return res.status(400).json({ error: '分片不存在或已过期' })
  const safe = (path.basename(filename) || 'file').replace(/[^a-zA-Z0-9._-]/g, '') || 'file'
  const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
  const out = path.join(UPLOAD_DIR, finalName)
  try {
    const parts = []
    for (let i = 0; i < total; i++) {
      const p = path.join(tmpDir, String(i))
      if (!fs.existsSync(p)) break
      parts.push(fs.readFileSync(p))
    }
    fs.writeFileSync(out, Buffer.concat(parts))
    fs.rmSync(tmpDir, { recursive: true, force: true })
    res.json({ url: '/uploads/' + finalName })
  } catch (e) {
    res.status(500).json({ error: '合并分片失败：' + e.message })
  }
})

// 生产环境：托管前端构建产物（若存在）
const clientDist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Forum running on http://localhost:${PORT}`)
})
