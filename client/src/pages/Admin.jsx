import { useState } from 'react'
import useApi from '../hooks/useApi.js'
import { api, getAuthUser } from '../utils/api.js'

export default function Admin() {
  const user = getAuthUser()
  if (user?.role !== 'admin') {
    return (
      <div className="page">
        <div className="container page-card">
          <h2>无权限</h2>
          <p>仅管理员可访问此页面，请用管理员账号登录。</p>
        </div>
      </div>
    )
  }
  return <AdminPanel />
}

function AdminPanel() {
  const [tab, setTab] = useState('announce')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [err, setErr] = useState('')
  const [postQuery, setPostQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')

  const { data: stats, reload: reloadStats } = useApi('/admin/stats')
  const { data: announcements, reload: reloadAnn } = useApi('/announcements')
  const { data: postData, reload: reloadPosts } = useApi('/posts?pageSize=100')
  const { data: userList, reload: reloadUsers } = useApi('/admin/users')

  const allPosts = postData?.posts || []
  const pq = postQuery.trim().toLowerCase()
  const filteredPosts = allPosts.filter((p) => (!pq ? true : p.title.toLowerCase().includes(pq) || (p.author?.username || '').toLowerCase().includes(pq)))
  const uq = userQuery.trim().toLowerCase()
  const filteredUsers = (userList || []).filter((u) => (!uq ? true : u.username.toLowerCase().includes(uq)))

  async function handlePublish(e) {
    e.preventDefault()
    if (!title.trim()) { setErr('请填写通告标题'); return }
    setErr('')
    try {
      await api.post('/admin/announcements', { title: title.trim(), content: content.trim() })
      setTitle(''); setContent('')
      reloadAnn(); reloadStats()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  async function handleDeleteAnn(id) {
    await api.del(`/admin/announcements/${id}`)
    reloadAnn(); reloadStats()
  }

  async function handleDeletePost(id) {
    await api.del(`/posts/${id}`)
    reloadPosts(); reloadStats()
  }

  async function handleMute(u, muted) {
    await api.post(`/admin/users/${encodeURIComponent(u.username)}/${muted ? 'unmute' : 'mute'}`)
    reloadUsers()
  }

  const TABS = [
    { key: 'announce', label: '发布通告' },
    { key: 'posts', label: '帖子管理' },
    { key: 'users', label: '用户管理' },
  ]

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <h1 className="page-title">管理员后台</h1>
          <p className="page-sub">发布通告 · 管理帖子 · 管理用户</p>
        </div>

        <div className="admin-stats">
          <div className="admin-stat"><b>{stats?.posts ?? '—'}</b><span>总帖子</span></div>
          <div className="admin-stat"><b>{stats?.replies ?? '—'}</b><span>回复</span></div>
          <div className="admin-stat"><b>{stats?.users ?? '—'}</b><span>用户</span></div>
          <div className="admin-stat"><b>{stats?.announcements ?? '—'}</b><span>通告</span></div>
        </div>

        <div className="board-tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`board-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {tab === 'announce' && (
          <div className="form-card admin-card">
            <h3 className="admin-section-title">发布全站通告</h3>
            <form onSubmit={handlePublish}>
              <label className="field">
                <span className="field-label">标题</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="通告标题" />
              </label>
              <label className="field">
                <span className="field-label">内容</span>
                <textarea className="input textarea" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="通告内容…" />
              </label>
              {err && <p className="form-error">{err}</p>}
              <button type="submit" className="btn btn-primary">发布通告</button>
            </form>

            <div className="admin-list">
              {!announcements || announcements.length === 0 ? (
                <div className="post-empty">暂无通告</div>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="admin-row">
                    <div className="admin-row-main">
                      <div className="admin-row-title">📢 {a.title}</div>
                      {a.content && <div className="admin-row-sub">{a.content}</div>}
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => handleDeleteAnn(a.id)}>删除</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'posts' && (
          <div className="form-card admin-card">
            <h3 className="admin-section-title">帖子管理</h3>
            <input className="input admin-search" type="text" placeholder="搜索帖子标题或作者…" value={postQuery} onChange={(e) => setPostQuery(e.target.value)} />
            <div className="admin-list">
              {filteredPosts.length === 0 ? (
                <div className="post-empty">没有匹配的帖子</div>
              ) : (
                filteredPosts.map((p) => (
                  <div key={p.id} className="admin-row">
                    <div className="admin-row-main">
                      <div className="admin-row-title">{p.title}</div>
                      <div className="admin-row-sub">{p.author?.username} · {p.section}</div>
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => handleDeletePost(p.id)}>删除</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="form-card admin-card">
            <h3 className="admin-section-title">用户管理</h3>
            <input className="input admin-search" type="text" placeholder="搜索用户名…" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
            <div className="admin-list">
              {filteredUsers.length === 0 ? (
                <div className="post-empty">没有匹配的用户</div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className="admin-row">
                    <div className="admin-row-main">
                      <div className="admin-row-title">
                        {u.username}
                        {u.muted ? <span className="muted-badge">已禁言</span> : null}
                        {u.role === 'admin' ? <span className="muted-badge">管理员</span> : null}
                      </div>
                    </div>
                    <button type="button" className={`btn ${u.muted ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleMute(u, !!u.muted)}>
                      {u.muted ? '解禁' : '禁言'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
