import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api } from '../utils/api.js'
import Hero from '../components/Hero.jsx'
import ForumSections from '../components/ForumSections.jsx'

export default function Home() {
  const { data: sections, loading } = useApi('/sections')
  const [announcements, setAnnouncements] = useState([])
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/announcements').then(setAnnouncements).catch(() => setAnnouncements([]))
  }, [])

  const secs = sections || []
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
    </>
  )
}
