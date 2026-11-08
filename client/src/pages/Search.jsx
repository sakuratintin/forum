import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'

export default function Search() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [input, setInput] = useState(q)
  const navigate = useNavigate()

  const { data, loading } = useApi(`/posts?q=${encodeURIComponent(q)}&pageSize=50`)
  const posts = data?.posts || []
  const total = data?.total || 0

  function onSubmit(e) {
    e.preventDefault()
    const v = input.trim()
    if (v) navigate(`/search?q=${encodeURIComponent(v)}`)
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <h1 className="page-title">搜索</h1>
          <p className="page-sub">搜索帖子标题和内容</p>
        </div>

        <form className="search-bar" onSubmit={onSubmit}>
          <input className="input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入关键词…" />
          <button type="submit" className="btn btn-primary">搜索</button>
        </form>

        {q ? (
          <>
            <p className="search-count">找到 {total} 条与「{q}」相关的帖子</p>
            {loading ? (
              <div className="post-empty">搜索中…</div>
            ) : posts.length === 0 ? (
              <div className="post-empty">没有找到相关帖子</div>
            ) : (
              <div className="post-list">
                {posts.map((p, i) => (
                  <Link to={`/post/${p.id}`} className="post-item fade-up" style={{ animationDelay: `${i * 30}ms` }} key={p.id}>
                    <div className="post-main">
                      <h3 className="post-title">
                        {p.pinned && <span className="post-tag pinned">置顶</span>}
                        {p.title}
                      </h3>
                      <div className="post-meta">
                        <span className="post-author">{p.author?.username}</span>
                        <span>·</span>
                        <span>{p.created_at}</span>
                        <span>·</span>
                        <span>{p.section}</span>
                      </div>
                    </div>
                    <div className="post-stats">
                      <span className="post-stat">💬 {p.reply_count}</span>
                      <span className="post-stat">{p.liked ? '❤️' : '👍'} {p.like_count}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="post-empty">输入关键词开始搜索</div>
        )}
      </div>
    </div>
  )
}
