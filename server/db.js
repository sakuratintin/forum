const path = require('path')
const { DatabaseSync } = require('node:sqlite')
const bcrypt = require('bcryptjs')

const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'forum.db'))

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
  `)

  seed()
}

function seed() {
  const uid = (name) => db.prepare('SELECT id FROM users WHERE username = ?').get(name).id
  const sid = (slug) => db.prepare('SELECT id FROM sections WHERE slug = ?').get(slug).id

  if (db.prepare('SELECT COUNT(*) c FROM sections').get().c === 0) {
    const ins = db.prepare('INSERT INTO sections (slug, name, icon, description) VALUES (?,?,?,?)')
    for (const s of SECTIONS) ins.run(s.slug, s.name, s.icon, s.description)
  }

  if (db.prepare('SELECT COUNT(*) c FROM users').get().c === 0) {
    const ins = db.prepare('INSERT INTO users (username, password, bio, role) VALUES (?,?,?,?)')
    ins.run('管理员', bcrypt.hashSync('admin123', 10), '论坛管理员，负责站务与维护。', 'admin')
    ins.run('阿泽', bcrypt.hashSync('123456', 10), 'ACG 爱好者，日常追番。', 'user')
    ins.run('学霸君', bcrypt.hashSync('123456', 10), '分享学习资料，共同进步。', 'user')
    ins.run('动漫社社长', bcrypt.hashSync('123456', 10), '动漫社招新中，欢迎加入！', 'user')
    ins.run('小满', bcrypt.hashSync('123456', 10), '', 'user')
    ins.run('Kira', bcrypt.hashSync('123456', 10), '', 'user')
  }

  if (db.prepare('SELECT COUNT(*) c FROM posts').get().c === 0) {
    const ins = db.prepare('INSERT INTO posts (section_id, author_id, title, content, pinned, hot) VALUES (?,?,?,?,?,?)')
    const data = [
      ['acg', '管理员', '【版规】二次元板块发帖规范', '请遵守版规，文明发言，共建和谐社区。', 1, 0],
      ['acg', '阿泽', '最近有什么好看的番推荐吗？', '如题，最近剧荒了，求大家推荐几部好看的番。', 0, 1],
      ['acg', '小满', '这部漫画的结局大家怎么看？', '刚看完，结局有点意难平，想听听大家的看法。', 0, 0],
      ['study', '学霸君', '【分享】高数期中复习资料合集', '整理了一份复习资料，需要的自取。', 1, 0],
      ['study', '阿泽', '英语四级备考经验分享', '分享一些备考经验，希望对大家有帮助。', 0, 1],
      ['life', '小满', '食堂新窗口测评', '新窗口的菜还不错，安利一下。', 0, 0],
      ['club', '动漫社社长', '【招新】动漫社纳新啦！', '欢迎加入动漫社，一起玩耍！', 1, 0],
      ['market', '阿泽', '出九成新自行车', '毕业了，出一辆自行车，可小刀。', 0, 1],
      ['acg', '学霸君', '求推荐几部治愈系动画', '最近压力大，想看治愈系。', 0, 0],
      ['study', '小满', '有没有一起组队参加编程比赛的？', '想组队参加比赛，有人吗？', 0, 0],
    ]
    for (const [sec, author, title, content, pinned, hot] of data) {
      ins.run(sid(sec), uid(author), title, content, pinned, hot)
    }

    const replies = [
      ['阿泽', '说得有道理，学到了。'],
      ['小满', '顶一下，这个问题我也想知道。'],
      ['学霸君', '感谢分享，收藏了！'],
      ['Kira', '哈哈哈哈哈，看到这个我笑了。'],
      ['阿泽', '同问，蹲一个靠谱的答案。'],
    ]
    const rp = db.prepare('INSERT INTO replies (post_id, author_id, content, floor) VALUES (?,?,?,1)')
    const firstPosts = db.prepare('SELECT id FROM posts LIMIT 5').all()
    firstPosts.forEach((p, i) => {
      const [author, content] = replies[i % replies.length]
      rp.run(p.id, uid(author), content)
    })
  }

  if (db.prepare('SELECT COUNT(*) c FROM follows').get().c === 0) {
    const ins = db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?,?)')
    ins.run(uid('管理员'), uid('阿泽'))
    ins.run(uid('阿泽'), uid('管理员'))
    ins.run(uid('学霸君'), uid('管理员'))
    ins.run(uid('动漫社社长'), uid('管理员'))
  }

  if (db.prepare('SELECT COUNT(*) c FROM announcements').get().c === 0) {
    db.prepare('INSERT INTO announcements (title, content) VALUES (?,?)').run('欢迎来到 H.C.T. Forum', '这里是全新的讨论社区，祝大家玩得开心！')
  }
}

module.exports = { db, initDb }
