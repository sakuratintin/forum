import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api } from '../utils/api.js'
import Hero from '../components/Hero.jsx'
import ForumSections from '../components/ForumSections.jsx'
import PostRow from '../components/PostRow.jsx'

export default function Home() {
  const { data: sections, loading } = useApi('/sections')
  const { data: recentData, loading: recentLoading } = useApi('/posts?pageSize=6')
  const [announcements, setAnnouncements] = useState([])
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/announcements').then(setAnnouncements).catch(() => setAnnouncements([]))
  }, [])

  const secs = sections || []
  const recent = recentData?.posts || []
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

      <section className="home-recent">
        <div className="container">
          <div className="sections-head">
            <h2 className="section-title">最新帖子</h2>
            <p className="section-sub">看看大家最近在聊什么</p>
            <div className="accent-bar" />
          </div>
          {recentLoading ? (
            <div className="post-empty">加载中…</div>
          ) : recent.length === 0 ? (
            <div className="post-empty">还没有帖子，快来发第一帖吧！</div>
          ) : (
            <div className="post-list">
              {recent.map((p, i) => (
                <PostRow key={p.id} p={p} delay={i * 40} showSection />
              ))}
            </div>
          )}
        </div>
      </section>

      <ForumSections sections={secs} loading={loading} />
    </>
  )
}
