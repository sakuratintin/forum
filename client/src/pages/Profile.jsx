import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api, getAuthUser } from '../utils/api.js'
import EditProfileModal from '../components/EditProfileModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import UserListModal from '../components/UserListModal.jsx'

export default function Profile() {
  const { username } = useParams()
  const { data: user, loading, error, setData, reload } = useApi(`/users/${username}`)
  const [editing, setEditing] = useState(false)
  const [confirmPost, setConfirmPost] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [listType, setListType] = useState(null)
  const me = getAuthUser()
  const isSelf = me?.username === username

  if (loading && !user) {
    return <div className="page"><div className="container post-empty">加载中…</div></div>
  }
  if (error && !user) {
    return <div className="page"><div className="container page-card"><h2>加载失败</h2><p>{error}</p></div></div>
  }
  if (!user) {
    return <div className="page"><div className="container page-card"><h2>用户不存在</h2><p>未找到该用户。</p></div></div>
  }

  async function handleFollow() {
    try {
      const r = await api.post(`/users/${user.username}/follow`)
      setData({ ...user, is_following: r.following, followers: (user.followers || 0) + (r.following ? 1 : -1) })
    } catch { /* ignore */ }
  }

  async function handleDeletePost() {
    if (!confirmPost || deleting) return
    setDeleting(true)
    try {
      await api.del(`/posts/${confirmPost.id}`)
      setConfirmPost(null)
      reload()
    } catch {
      /* ignore */
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <div className="container detail-wrap">
        <div className="profile-card">
          <div className="profile-top">
            {user.avatar ? (
              <img src={user.avatar} className="avatar avatar-lg avatar-img" alt="头像" />
            ) : (
              <span className="avatar avatar-lg">{user.username[0]}</span>
            )}
            <div className="profile-info">
              <h1 className="profile-name">
                {user.username}
                {user.muted && <span className="muted-badge">已禁言</span>}
              </h1>
              <p className="profile-bio">{user.bio || '这个人很懒，还没有填写简介。'}</p>
              <p className="profile-join">加入于 {user.created_at?.slice(0, 10)}</p>
            </div>
            <div className="profile-actions">
              {isSelf ? (
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>编辑资料</button>
              ) : (
                <>
                  <button type="button" className={`btn ${user.is_following ? 'btn-ghost' : 'btn-primary'}`} onClick={handleFollow}>
                    {user.is_following ? '已关注 ✓' : '＋ 关注'}
                  </button>
                  {user.is_mutual ? (
                    <Link to={`/messages/${encodeURIComponent(user.username)}`} className="btn btn-ghost">私信</Link>
                  ) : (
                    <button type="button" className="btn btn-ghost" disabled title="互相关注后才能私信">🔒 私信</button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat"><b>{user.post_count}</b><span>帖子</span></div>
            <button type="button" className="profile-stat clickable" onClick={() => setListType('followers')}><b>{user.followers}</b><span>关注者</span></button>
            <button type="button" className="profile-stat clickable" onClick={() => setListType('following')}><b>{user.following}</b><span>关注中</span></button>
          </div>
        </div>

        <section className="profile-posts">
          <h2 className="replies-title">{isSelf ? '我发布的帖子' : 'TA 发布的帖子'}（{user.post_count}）</h2>
          {user.posts?.length === 0 ? (
            <div className="post-empty">{isSelf ? '你还没有发布过帖子' : 'TA 还没有发布过帖子'}</div>
          ) : (
            <div className="post-list">
              {user.posts.map((p, i) => (
                <Link to={`/post/${p.id}`} className="post-item fade-up" style={{ animationDelay: `${i * 40}ms` }} key={p.id}>
                  <div className="post-main">
                    <h3 className="post-title">
                      {p.pinned && <span className="post-tag pinned">置顶</span>}
                      {p.media?.length > 0 && <span className="post-media" title="含附件">🖼</span>}
                      {p.title}
                    </h3>
                    <div className="post-meta"><span className="avatar avatar-xs">{p.author?.avatar ? <img src={p.author.avatar} alt="" className="avatar-img" /> : p.author?.username?.[0]}</span><span className="post-author">{p.author?.username}</span><span>·</span><span>{p.created_at}</span></div>
                  </div>
                  <div className="post-stats">
                    <span className="post-stat">💬 {p.reply_count}</span>
                    <span className="post-stat">{p.liked ? '❤️' : '👍'} {p.like_count}</span>
                    {isSelf && (
                      <button
                        type="button"
                        className="post-del-btn"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmPost(p) }}
                        title="删除帖子"
                      >🗑</button>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {isSelf && editing && <EditProfileModal onClose={() => { setEditing(false); reload() }} />}

        <UserListModal
          open={!!listType}
          title={listType === 'followers' ? `关注 ${user.username} 的用户` : `${user.username} 关注的用户`}
          path={listType ? `/users/${encodeURIComponent(user.username)}/${listType}` : ''}
          onClose={() => setListType(null)}
        />

        <ConfirmDialog
          open={!!confirmPost}
          title="删除帖子"
          message={confirmPost ? `确定要删除帖子「${confirmPost.title}」吗？删除后无法恢复。` : ''}
          confirmText={deleting ? '删除中…' : '删除'}
          danger
          onConfirm={handleDeletePost}
          onCancel={() => setConfirmPost(null)}
        />
      </div>
    </div>
  )
}
