import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api } from '../utils/api.js'
import Hero from '../components/Hero.jsx'
import ForumSections from '../components/ForumSections.jsx'
import PostRow from '../components/PostRow.jsx'
import SkeletonRows from '../components/Skeleton.jsx'

const CAT_LABEL = { news: '新闻', sports: '赛事', anime: '动漫', game: '游戏' }

export default function Home() {
  const { data: sections, loading } = useApi('/sections')
  const { data: recentData, loading: recentLoading } = useApi('/posts?pageSize=6')
  const { data: hotData } = useApi('/hot')
  const [announcements, setAnnouncements] = useState([])
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/announcements').then(setAnnouncements).catch(() => setAnnouncements([]))
  }, [])

  const secs = sections || []
  const recent = recentData?.posts || []
  const hotItems = (hotData?.items || []).slice(0, 5)
  const stats = [
    { value: secs.length, label: '论坛板块' },
    { value: secs.reduce((a, s) => a + (s.topic_count || 0), 0), label: '主题帖' },
    { value: secs.reduce((a, s) => a + (s.post_count || 0), 0), label: '回帖' },
  ]

  function doSearch(e) {
    e.preventDefault()
    const query = q.trim()
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <>
      {announcements.length > 0 && (
        <div className="container">
          <div className="announce-bar">
            <span className="announce-icon">📢</span>
            <div className="announce-list">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="announce-item">
                  <strong>{a.title}</strong>
                  {a.content && <span> · {a.content}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Hero stats={stats} />

      <div className="container">
        <form className="search-bar" onSubmit={doSearch}>
          <input
            className="input"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索帖子标题或内容…"
          />
          <button type="submit" className="btn btn-primary">搜索</button>
        </form>
      </div>

      <ForumSections sections={secs} loading={loading} />

      <div className="container home-content">
        <div className="home-main">
          <section className="home-recent">
            <div className="sections-head">
              <h2 className="section-title">最新帖子</h2>
              <p className="section-sub">看看大家最近在聊什么</p>
              <div className="accent-bar" />
            </div>
            {recentLoading ? (
              <SkeletonRows count={4} />
            ) : recent.length === 0 ? (
              <div className="post-empty">
                还没有帖子，<Link to="/new" className="empty-link">发布第一帖 →</Link>
              </div>
            ) : (
              <div className="post-list">
                {recent.map((p, i) => (
                  <PostRow key={p.id} p={p} delay={i * 40} showSection />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="home-side">
          <div className="side-card">
            <div className="side-head">
              <span>🔥 热点速览</span>
              <Link to="/hot" className="home-more">更多 →</Link>
            </div>
            {hotItems.length === 0 ? (
              <p className="side-empty">暂无热点</p>
            ) : (
              hotItems.map((h) => (
                <Link key={h.id} to={`/hot/${h.id}`} className="side-hot">
                  <span className="hot-cat">{CAT_LABEL[h.category] || h.category}</span>
                  <span className="side-hot-title">{h.title}</span>
                  <span className="side-hot-meta">{h.source || '来源'}</span>
                </Link>
              ))
            )}
          </div>

          <div className="side-card">
            <div className="side-head">
              <span>快速入口</span>
            </div>
            <Link to="/new" className="side-link">✍ 发布帖子</Link>
            <Link to="/messages" className="side-link">✉ 我的私信</Link>
            <Link to="/search" className="side-link">🔍 搜索帖子 / 用户</Link>
            <Link to="/hot" className="side-link">📰 热点资讯</Link>
          </div>
        </aside>
      </div>
    </>
  )
}
