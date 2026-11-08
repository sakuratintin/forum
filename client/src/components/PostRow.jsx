import { Link, useNavigate } from 'react-router-dom'

function excerpt(text, n = 100) {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

export default function PostRow({ p, delay = 0, showSection = false }) {
  const navigate = useNavigate()
  return (
    <Link to={`/post/${p.id}`} className="post-item fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="post-main">
        <h3 className="post-title">
          {p.pinned && <span className="post-tag pinned">置顶</span>}
          {p.hot && <span className="post-tag hot">热门</span>}
          {p.media?.length > 0 && <span className="post-media" title="含附件">🖼</span>}
          {p.title}
        </h3>
        {p.content && <p className="post-excerpt">{excerpt(p.content)}</p>}
        <div className="post-meta">
          <span className="avatar avatar-xs">{p.author?.avatar ? <img src={p.author.avatar} alt="" className="avatar-img" /> : p.author?.username?.[0]}</span>
          <span
            className="post-author author-link"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/user/${encodeURIComponent(p.author?.username)}`) }}
          >
            {p.author?.username}
          </span>
          <span>·</span>
          <span>{p.last_reply_at ? `最后回复 ${p.last_reply_at}` : p.created_at}</span>
          {showSection && p.section && (
            <>
              <span>·</span>
              <span className="post-section">{p.section}</span>
            </>
          )}
        </div>
      </div>
      <div className="post-stats">
        <span className="post-stat">💬 {p.reply_count}</span>
        <span className="post-stat">{p.liked ? '❤️' : '👍'} {p.like_count}</span>
      </div>
    </Link>
  )
}
