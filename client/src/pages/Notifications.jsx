import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getAuthUser } from '../utils/api.js'
import SkeletonRows from '../components/Skeleton.jsx'

const TYPE_LABEL = { mention: '@ 提到了你', reply: '回复了你的帖子' }

export default function Notifications() {
  const user = getAuthUser()
  const [data, setData] = useState({ items: [], unread: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    api.get('/notifications')
      .then((d) => {
        setData(d)
        api.post('/notifications/read').catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="page">
        <div className="container page-card">
          <h2>请先登录</h2>
          <p><Link to="/login" className="detail-author">登录</Link> 后即可查看提醒。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container detail-wrap">
        <div className="page-head">
          <h1 className="page-title">提醒</h1>
          <p className="page-sub">别人 @ 你或回复你的帖子时会在这里出现</p>
        </div>

        {loading ? (
          <SkeletonRows count={4} />
        ) : data.items.length === 0 ? (
          <div className="post-empty">暂无提醒</div>
        ) : (
          <div className="notify-list">
            {data.items.map((n) => (
              <Link
                key={n.id}
                to={n.post_id ? `/post/${n.post_id}` : '/'}
                className={`notify-item${n.read ? '' : ' unread'}`}
              >
                <span className="avatar">
                  {n.actor?.avatar ? <img src={n.actor.avatar} alt="" className="avatar-img" /> : n.actor?.username?.[0]}
                </span>
                <div className="notify-main">
                  <div className="notify-title">
                    <b>{n.actor?.username}</b> {TYPE_LABEL[n.type] || n.type}
                    {!n.read && <span className="notify-dot" />}
                  </div>
                  {n.post_title && <div className="notify-post">《{n.post_title}》</div>}
                  {n.snippet && <div className="notify-snippet">{n.snippet}</div>}
                  <div className="notify-time">{n.created_at}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
