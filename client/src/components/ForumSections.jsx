import { Link } from 'react-router-dom'

export default function ForumSections({ sections = [], loading = false }) {
  return (
    <section className="sections" id="sections">
      <div className="container">
        <div className="sections-head">
          <h2 className="section-title">论坛板块</h2>
          <p className="section-sub">选择你感兴趣的板块，加入讨论</p>
          <div className="accent-bar" />
        </div>
        {loading ? (
          <div className="post-empty">加载中…</div>
        ) : (
          <div className="sections-grid">
            {sections.map((s, i) => (
              <Link to={`/section/${s.slug}`} className={`section-card fade-up d${(i % 6) + 1}`} key={s.slug}>
                <span className="section-card-code">{String(i + 1).padStart(2, '0')}</span>
                <div className="section-card-top">
                  <span className="section-card-icon">{s.icon || s.name[0]}</span>
                  <h3 className="section-card-name">{s.name}</h3>
                </div>
                <p className="section-card-desc">{s.description}</p>
                <div className="section-card-foot">
                  <span>主题 {s.topic_count || 0} · 帖子 {s.post_count || 0}</span>
                  <span className="section-card-link">进入 →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
