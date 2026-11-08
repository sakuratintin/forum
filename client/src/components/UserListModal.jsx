import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api.js'
import FollowButton from './FollowButton.jsx'

export default function UserListModal({ open, title, path, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !path) return
    setLoading(true)
    api.get(path)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [open, path])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel confirm-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <div className="userlist">
          {loading ? (
            <div className="post-empty">加载中…</div>
          ) : users.length === 0 ? (
            <div className="post-empty">暂无</div>
          ) : (
            users.map((u) => (
              <Link key={u.id} to={`/user/${encodeURIComponent(u.username)}`} className="userlist-item" onClick={onClose}>
                <span className="avatar">{u.avatar ? <img src={u.avatar} alt="" className="avatar-img" /> : u.username[0]}</span>
                <div className="userlist-main">
                  <span className="userlist-name">{u.username}{u.muted ? <span className="muted-badge">已禁言</span> : null}</span>
                  <span className="userlist-sub">UID {u.uid || '—'} · {u.bio || '这个人很懒，还没有填写简介。'} · 帖子 {u.post_count || 0}</span>
                </div>
                <FollowButton username={u.username} initialFollowing={u.is_following} />
              </Link>
            ))
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
