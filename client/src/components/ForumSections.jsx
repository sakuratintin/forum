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
            <Link to="/section/all" className="section-card section-card-all fade-up">
              <span className="section-card-code">∞</span>
              <div className="section-card-top">
                <span className="section-card-icon">综</span>
                <h3 className="section-card-name">全部帖子</h3>
              </div>
              <p className="section-card-desc">聚合所有板块的帖子，一页浏览全站最新讨论。</p>
              <div className="section-card-foot">
                <span>聚合浏览</span>
                <span className="section-card-link">进入 →</span>
              </div>
            </Link>
            {sections.map((s, i) => (
              <Link to={`/section/${s.slug}`} className={`section-card fade-up d${(i % 6) + 1}`} key={s.slug}>
                <span className="section-card-code">{String(sections.length - i).padStart(2, '0')}</span>
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
