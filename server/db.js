const fs = require('fs')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')
const bcrypt = require('bcryptjs')

function resolveDbPath() {
  const p = process.env.DB_PATH || path.join(__dirname, 'forum.db')
  const dir = path.dirname(p)
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (e) {
    console.error('[db] 无法创建目录', dir, e.message, '→ 回退到', __dirname)
    return path.join(__dirname, 'forum.db')
  }
  return p
}

const dbPath = resolveDbPath()
console.log('[db] 数据库路径:', dbPath)
const db = new DatabaseSync(dbPath)

const SECTIONS = [
  { slug: 'acg', name: '二次元', icon: '漫', description: '动漫、漫画、游戏等 ACG 内容讨论。' },
  { slug: 'study', name: '学习交流', icon: '学', description: '课程、考试、学习经验分享与答疑。' },
  { slug: 'life', name: '学习生活', icon: '活', description: '校园日常、宿舍、食堂等生活话题。' },
  { slug: 'club', name: '社团活动', icon: '社', description: '社团招新、活动组织与报名。' },
  { slug: 'market', name: '二手集市', icon: '集', description: '闲置物品转让、求购与交换。' },
]

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      muted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      description TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      media TEXT DEFAULT '[]',
      pinned INTEGER DEFAULT 0,
      hot INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      floor INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      UNIQUE(follower_id, following_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER NOT NULL,
      to_id INTEGER NOT NULL,
      content TEXT DEFAULT '',
      image TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );
  `)

  seed()
  cleanDemoData()
}

function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM sections').get().c === 0) {
    const ins = db.prepare('INSERT INTO sections (slug, name, icon, description) VALUES (?,?,?,?)')
    for (const s of SECTIONS) ins.run(s.slug, s.name, s.icon, s.description)
  }

  if (db.prepare('SELECT COUNT(*) c FROM users').get().c === 0) {
    db.prepare('INSERT INTO users (username, password, bio, role) VALUES (?,?,?,?)')
      .run('管理员', bcrypt.hashSync('admin123', 10), '论坛管理员，负责站务与维护。', 'admin')
  }

  // AI 助手账号 EVA（用于帖子里 @EVA 调用 AI）
  if (!db.prepare('SELECT id FROM users WHERE username = ?').get('EVA')) {
    db.prepare('INSERT INTO users (username, password, bio, role) VALUES (?,?,?,?)')
      .run('EVA', bcrypt.hashSync(`__eva_${Math.random()}_${Date.now()}__`, 10), 'AI 助手，在帖子里 @EVA 就能向我提问', 'ai')
  }
}

// 一次性清理旧的演示数据：清空所有帖子/回复/点赞/关注/私信，只保留管理员账号
function cleanDemoData() {
  if (db.prepare("SELECT value FROM meta WHERE key = 'demo_cleaned'").get()) return

  const postCount = db.prepare('SELECT COUNT(*) c FROM posts').get().c
  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c

  db.prepare('DELETE FROM likes').run()
  db.prepare('DELETE FROM replies').run()
  db.prepare('DELETE FROM posts').run()
  db.prepare('DELETE FROM follows').run()
  db.prepare('DELETE FROM messages').run()
  db.prepare("DELETE FROM users WHERE role <> 'admin' AND role <> 'ai'").run()

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('demo_cleaned', '1')").run()
  if (postCount || userCount > 1) {
    console.log(`[db] 已清理演示数据：清空帖子 ${postCount} 篇，仅保留管理员账号`)
  }
}

module.exports = { db, initDb }
