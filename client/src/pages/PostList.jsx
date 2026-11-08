import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import PostRow from '../components/PostRow.jsx'

const SORTS = [
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '热门' },
]
const PAGE_SIZE = 10

export default function PostList() {
  const { slug } = useParams()
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)

  const { data: sections, loading: sLoading } = useApi('/sections')
  const secs = sections || []
  const isAll = slug === 'all'
  const section = isAll
    ? { slug: 'all', name: '全部帖子', description: '所有板块的最新讨论，一页看全站', icon: '综' }
    : secs.find((s) => s.slug === slug)

  const path = isAll
    ? `/posts?sort=${sort}&page=${page}&pageSize=${PAGE_SIZE}`
    : `/posts?section=${encodeURIComponent(slug)}&sort=${sort}&page=${page}&pageSize=${PAGE_SIZE}`
  const { data: listData, loading: pLoading } = useApi(path)

  if (!isAll && sLoading) {
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
        <div className="board-switcher">
          <Link to="/section/all" className={`board-switch${isAll ? ' active' : ''}`}>全部</Link>
          {secs.map((s) => (
            <Link key={s.slug} to={`/section/${s.slug}`} className={`board-switch${s.slug === slug ? ' active' : ''}`}>{s.name}</Link>
          ))}
        </div>

        <div className="board-head">
          <div className="board-head-main">
            <span className="section-card-icon board-icon">{section.icon || section.name[0]}</span>
            <div>
              <h1 className="board-title">{section.name}</h1>
              <p className="board-desc">{section.description}</p>
            </div>
          </div>
          <Link to={`/new${isAll ? '' : `?section=${slug}`}`} className="btn btn-primary">＋ 发帖</Link>
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
          <div className="post-empty">该板块下暂无帖子</div>
        ) : (
          <div className="post-list">
            {posts.map((p, i) => (
              <PostRow key={p.id} p={p} delay={i * 40} showSection={isAll} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={n === page ? ' active' : ''} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
          </div>
        )}
      </div>
    </div>
  )
}
