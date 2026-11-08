import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api } from '../utils/api.js'

const CAT_LABEL = { news: '新闻', sports: '赛事', anime: '动漫' }

export default function HotDetail() {
  const { id } = useParams()
  const { data: item, loading, error } = useApi(`/hot/${id}`)
  const [aiSummary, setAiSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [aiErr, setAiErr] = useState('')

  useEffect(() => {
    if (!item) return
    if (item.ai_summary) {
      setAiSummary(item.ai_summary)
      return
    }
    let cancelled = false
    setSummarizing(true)
    setAiErr('')
    api.post(`/hot/${item.id}/summarize`)
      .then((r) => {
        if (!cancelled) setAiSummary(r.ai_summary || '')
      })
      .catch((ex) => {
        if (!cancelled) setAiErr(ex.message)
      })
      .finally(() => {
        if (!cancelled) setSummarizing(false)
      })
    return () => {
      cancelled = true
    }
  }, [item])

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
            </div>
          </header>

          <div className="detail-body">
            <div className="ai-summary-block">
              <div className="ai-summary-title">🤖 AI 归纳总结</div>
              {summarizing ? (
                <p className="ai-summary-loading">AI 正在阅读并归纳这条资讯，请稍候…</p>
              ) : aiErr ? (
                <p className="ai-summary-error">AI 总结失败：{aiErr}</p>
              ) : aiSummary ? (
                <p>{aiSummary}</p>
              ) : (
                <p className="ai-summary-loading">暂无 AI 总结</p>
              )}
              {aiSummary && <div className="ai-summary-tip">以上内容由 AI 根据原文归纳，仅供参考</div>}
            </div>

            {item.summary && (
              <details className="hot-raw">
                <summary>查看原始摘要</summary>
                <p>{item.summary}</p>
              </details>
            )}
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
