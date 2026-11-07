import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import useApi from '../hooks/useApi.js'

const SORTS = [
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '热门' },
]
const PAGE_SIZE = 5

export default function PostList() {
  const { slug } = useParams()
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const { data: sections, loading: sLoading } = useApi('/sections')
  const section = (sections || []).find((s) => s.slug === slug)

  const path = `/posts?section=${slug}&sort=${sort}&page=${page}&pageSize=${PAGE_SIZE}`
  const { data: listData, loading: pLoading } = useApi(path)

  if (sLoading) {
    return <div className="page"><div className="container post-empty">加载中…</div></div>
  }
  if (!section) {
    return <div className="page"><div className="container page-card"><h2>板块不存在</h2><p>未找到该板块，请返回首页。</p></div></div>
  }

  const posts = listData?.posts || []
  const total = listData?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page">
      <div className="container">
        <div className="board-head">
          <div>
            <h1 className="board-title">{section.name}</h1>
            <p className="board-desc">{section.description}</p>
          </div>
          <Link to={`/new?section=${slug}`} className="btn btn-primary">＋ 发帖</Link>
        </div>

        <div className="board-toolbar">
          <div className="board-tabs">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`board-tab${sort === s.key ? ' active' : ''}`}
                onClick={() => { setSort(s.key); setPage(1) }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="board-count">共 {total} 篇帖子</span>
        </div>

        {pLoading ? (
          <div className="post-empty">加载中…</div>
        ) : posts.length === 0 ? (
          <div className="post-empty">该分类下暂无帖子</div>
        ) : (
          <div className="post-list">
            {posts.map((p, i) => (
              <Link to={`/post/${p.id}`} className="post-item fade-up" style={{ animationDelay: `${i * 40}ms` }} key={p.id}>
                <div className="post-main">
                  <h3 className="post-title">
                    {p.pinned && <span className="post-tag pinned">置顶</span>}
                    {p.hot && <span className="post-tag hot">热门</span>}
                    {p.media?.length > 0 && <span className="post-media" title="含附件">🖼</span>}
                    {p.title}
                  </h3>
                  <div className="post-meta">
                    <span
                      className="post-author author-link"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/user/${encodeURIComponent(p.author?.username)}`) }}
                    >
                      {p.author?.username}
                    </span>
                    <span>·</span>
                    <span>{p.created_at}</span>
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

        {totalPages > 1 && (
          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={n === page ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
          </div>
        )}
      </div>
    </div>
  )
}
