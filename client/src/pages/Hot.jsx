import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getAuthUser } from '../utils/api.js'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'news', label: '新闻' },
  { key: 'sports', label: '赛事' },
  { key: 'anime', label: '动漫' },
]
const CAT_LABEL = { news: '新闻', sports: '赛事', anime: '动漫' }

function HotCard({ h }) {
  return (
    <Link to={`/hot/${h.id}`} className="hot-card fade-up">
      <span className="hot-cat">{CAT_LABEL[h.category] || h.category}</span>
      <h3 className="hot-title">{h.title}</h3>
      {h.summary && <p className="hot-excerpt">{h.summary}</p>}
      <div className="hot-meta">
        <span>{h.source || '未知来源'}</span>
        {h.published_at && <span>{h.published_at}</span>}
      </div>
    </Link>
  )
}

export default function Hot() {
  const [data, setData] = useState({ summaries: {}, items: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [fetching, setFetching] = useState(false)
  const [msg, setMsg] = useState('')
  const user = getAuthUser()
  const isAdmin = user?.role === 'admin'

  async function load() {
    setLoading(true)
    try {
      const d = await api.get('/hot')
      setData(d)
    } catch (ex) {
      setMsg(ex.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleFetch() {
    if (fetching) return
    setFetching(true)
    setMsg('')
    try {
      const r = await api.post('/hot/fetch')
      const parts = Object.entries(r.counts || {}).map(([k, v]) => `${CAT_LABEL[k] || k} ${v} 条`)
      let text = '✅ 抓取完成：' + (parts.join('，') || '无新增')
      if (r.errors && r.errors.length) text += '（部分失败：' + r.errors.join('；') + '）'
      setMsg(text)
      await load()
    } catch (ex) {
      setMsg('抓取失败：' + ex.message)
    } finally {
      setFetching(false)
    }
  }

  const items = tab === 'all' ? data.items : data.items.filter((i) => i.category === tab)
  const summary = tab === 'all' ? null : data.summaries[tab]

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <h1 className="page-title">热点资讯</h1>
          <p className="page-sub">由 AI 搜索并整理的实时热点（新闻 / 赛事 / 动漫）</p>
        </div>

        <div className="board-tabs hot-tabs">
          {TABS.map((t) => (
            <button type="button" key={t.key} className={`board-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
          {isAdmin && (
            <button type="button" className="btn btn-primary btn-xs hot-fetch-btn" onClick={handleFetch} disabled={fetching}>
              {fetching ? '抓取中…' : '🔄 抓取热点'}
            </button>
          )}
        </div>

        {msg && <p className="hot-msg">{msg}</p>}
        {fetching && <p className="hot-msg">正在联网搜索 + AI 整理，请稍候（约 10~20 秒）…</p>}

        {summary && summary.content && (
          <div className="hot-summary">
            <div className="hot-summary-title">🤖 AI 今日速览</div>
            <p>{summary.content}</p>
          </div>
        )}

        {loading ? (
          <div className="post-empty">加载中…</div>
        ) : items.length === 0 ? (
          <div className="post-empty">{isAdmin ? '还没有热点，点右上角「🔄 抓取热点」试试' : '还没有热点，请管理员抓取'}</div>
        ) : (
          <div className="hot-grid">
            {items.map((h) => (
              <HotCard key={h.id} h={h} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
