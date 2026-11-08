import { useParams, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'

const CAT_LABEL = { news: '新闻', sports: '赛事', anime: '动漫' }

export default function HotDetail() {
  const { id } = useParams()
  const { data: item, loading, error } = useApi(`/hot/${id}`)

  if (loading && !item) {
    return <div className="page"><div className="container post-empty">加载中…</div></div>
  }
  if (error && !item) {
    return <div className="page"><div className="container page-card"><h2>加载失败</h2><p>{error}</p></div></div>
  }
  if (!item) {
    return <div className="page"><div className="container page-card"><h2>热点不存在</h2><p>该热点可能已被清理，请返回热点列表。</p></div></div>
  }

  const safe = /^https?:\/\//i.test(item.link || '')

  return (
    <div className="page">
      <div className="container detail-wrap">
        <nav className="breadcrumb">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/hot">热点资讯</Link>
          <span>/</span>
          <span>详情</span>
        </nav>

        <article className="detail-card hot-detail">
          <header className="detail-head">
            <span className="hot-cat">{CAT_LABEL[item.category] || item.category}</span>
            <h1 className="detail-title">{item.title}</h1>
            <div className="detail-meta">
              {item.source && <span>{item.source}</span>}
              {item.published_at && <><span>·</span><span>{item.published_at}</span></>}
              {item.fetched_at && <><span>·</span><span>抓取于 {item.fetched_at}</span></>}
            </div>
          </header>

          <div className="detail-body">
            {item.summary ? <p>{item.summary}</p> : <p className="post-empty">该热点暂无摘要内容。</p>}
          </div>

          <footer className="detail-actions">
            {safe ? (
              <a href={item.link} target="_blank" rel="noreferrer noopener" className="btn btn-primary hot-source-btn">
                查看原文 ↗
              </a>
            ) : (
              <span className="hot-no-source">暂无原文链接</span>
            )}
            <Link to="/hot" className="btn btn-ghost">← 返回热点</Link>
          </footer>
        </article>
      </div>
    </div>
  )
}
