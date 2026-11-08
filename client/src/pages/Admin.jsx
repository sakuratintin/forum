import { useRef, useState } from 'react'
import useApi from '../hooks/useApi.js'
import { api, getAuthUser, getToken } from '../utils/api.js'
import { toastOk, toastErr } from '../utils/toast.js'

function fmtSize(n) {
  if (!n) return '—'
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

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
  const [restoreMsg, setRestoreMsg] = useState('')
  const restoreRef = useRef(null)

  const { data: stats, reload: reloadStats } = useApi('/admin/stats')
  const { data: announcements, reload: reloadAnn } = useApi('/announcements')
  const { data: postData, reload: reloadPosts } = useApi('/posts?pageSize=100')
  const { data: userList, reload: reloadUsers } = useApi('/admin/users')
  const { data: aiModel, reload: reloadAI } = useApi('/admin/ai-model')
  const { data: dataInfo, reload: reloadData } = useApi('/admin/data-info')

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
      toastOk('通告已发布')
    } catch (ex) {
      setErr(ex.message)
      toastErr(ex.message)
    }
  }

  async function handleDeleteAnn(id) {
    await api.del(`/admin/announcements/${id}`)
    reloadAnn(); reloadStats()
    toastOk('通告已删除')
  }

  async function handleDeletePost(id) {
    await api.del(`/posts/${id}`)
    reloadPosts(); reloadStats()
    toastOk('帖子已删除')
  }

  async function handleMute(u, muted) {
    await api.post(`/admin/users/${encodeURIComponent(u.username)}/${muted ? 'unmute' : 'mute'}`)
    reloadUsers()
    toastOk(muted ? '已解禁' : '已禁言')
  }

  async function handleSetModel(provider) {
    setErr('')
    try {
      await api.put('/admin/ai-model', { provider })
      reloadAI()
      toastOk(provider === 'deepseek' ? '已切换到 DeepSeek' : '已切换到智谱 GLM-4-Flash')
    } catch (ex) {
      setErr(ex.message)
      toastErr(ex.message)
    }
  }

  async function handleDownloadBackup() {
    try {
      const res = await fetch('/api/admin/backup', { headers: { Authorization: 'Bearer ' + getToken() } })
      if (!res.ok) throw new Error('下载失败')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forum-backup-${Date.now()}.db`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toastOk('备份已下载')
    } catch (ex) {
      toastErr(ex.message)
    }
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRestoreMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: fd,
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || '上传失败')
      toastOk('备份已上传')
      setRestoreMsg('✅ 备份已上传成功。请到环界云「变更 → 保存」重新部署一次，服务重启时会自动完成恢复。')
    } catch (ex) {
      toastErr(ex.message)
    }
  }

  const TABS = [
    { key: 'announce', label: '发布通告' },
    { key: 'posts', label: '帖子管理' },
    { key: 'users', label: '用户管理' },
    { key: 'ai', label: 'AI 模型' },
    { key: 'data', label: '数据备份' },
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
        {tab === 'ai' && (
          <div className="form-card admin-card">
            <h3 className="admin-section-title">AI 模型选择</h3>
            <p className="admin-row-sub" style={{ marginBottom: 16 }}>
              切换后，全站 AI（对话 / @EVA 回复 / 热点总结 / 翻译）立即使用所选模型，无需重启。
            </p>
            {err && <p className="form-error">{err}</p>}
            <div className="model-options">
              <div className={`model-option${aiModel?.provider === 'zhipu' ? ' active' : ''}`}>
                <div className="model-option-head">
                  <span className="model-option-name">智谱 GLM-4-Flash</span>
                  <span className={`model-badge${aiModel?.provider === 'zhipu' ? ' on' : ''}`}>
                    {aiModel?.provider === 'zhipu' ? '使用中' : '未启用'}
                  </span>
                </div>
                <p className="model-option-desc">免费、中文强、速度快，适合日常对话与总结。</p>
                <div className="model-option-foot">
                  <span className={`model-status ${aiModel?.available?.zhipu ? 'ok' : 'no'}`}>
                    {aiModel?.available?.zhipu ? '✓ 已配置 Key' : '✗ 未配置 Key'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    disabled={!aiModel?.available?.zhipu || aiModel?.provider === 'zhipu'}
                    onClick={() => handleSetModel('zhipu')}
                  >
                    {aiModel?.provider === 'zhipu' ? '当前使用' : '切换到此'}
                  </button>
                </div>
              </div>

              <div className={`model-option${aiModel?.provider === 'deepseek' ? ' active' : ''}`}>
                <div className="model-option-head">
                  <span className="model-option-name">DeepSeek</span>
                  <span className={`model-badge${aiModel?.provider === 'deepseek' ? ' on' : ''}`}>
                    {aiModel?.provider === 'deepseek' ? '使用中' : '未启用'}
                  </span>
                </div>
                <p className="model-option-desc">能力更强、总结更详细、响应更快。按量付费（约 ¥1/百万 Token）。</p>
                <div className="model-option-foot">
                  <span className={`model-status ${aiModel?.available?.deepseek ? 'ok' : 'no'}`}>
                    {aiModel?.available?.deepseek ? '✓ 已配置 Key' : '✗ 未配置 Key'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    disabled={!aiModel?.available?.deepseek || aiModel?.provider === 'deepseek'}
                    onClick={() => handleSetModel('deepseek')}
                  >
                    {aiModel?.provider === 'deepseek' ? '当前使用' : '切换到此'}
                  </button>
                </div>
              </div>
            </div>
            <p className="admin-row-sub" style={{ marginTop: 14 }}>
              注：语音识别、热点联网搜索固定使用智谱（DeepSeek 不提供这两项能力）。
            </p>
          </div>
        )}
        {tab === 'data' && (
          <div className="form-card admin-card">
            <h3 className="admin-section-title">数据备份</h3>
            <p className="admin-row-sub" style={{ marginBottom: 16 }}>
              数据保存在持久卷（/data）上，更新镜像不会丢失。服务每次启动都会自动备份，保留最近 5 份。
            </p>

            <div className="data-grid">
              <div className="data-item">
                <span>数据库路径</span>
                <b>{dataInfo?.dbPath || '—'}</b>
              </div>
              <div className="data-item">
                <span>数据库大小</span>
                <b>{fmtSize(dataInfo?.dbSize)}</b>
              </div>
              <div className="data-item">
                <span>持久卷状态</span>
                <b style={{ color: dataInfo?.mounted ? '#4ade80' : '#fda4af' }}>
                  {dataInfo?.mounted ? '✓ 已挂载（数据安全）' : '⚠️ 未挂载（数据会丢）'}
                </b>
              </div>
              <div className="data-item">
                <span>用户 / 帖子 / 回复</span>
                <b>{dataInfo ? `${dataInfo.counts.users} / ${dataInfo.counts.posts} / ${dataInfo.counts.replies}` : '—'}</b>
              </div>
              <div className="data-item">
                <span>数据体检（孤儿数据）</span>
                <b style={{ color: dataInfo && (dataInfo.orphans?.posts || dataInfo.orphans?.replies) ? '#fbbf24' : '#4ade80' }}>
                  {dataInfo
                    ? `帖子 ${dataInfo.orphans?.posts ?? 0} / 回复 ${dataInfo.orphans?.replies ?? 0}`
                    : '—'}
                </b>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn btn-primary" onClick={handleDownloadBackup}>⬇ 下载数据库备份</button>
              <button type="button" className="btn btn-ghost" onClick={reloadData}>刷新</button>
            </div>

            <h4 className="admin-section-title" style={{ marginTop: 26 }}>自动备份（最近 5 份）</h4>
            <div className="admin-list">
              {!dataInfo?.backups || dataInfo.backups.length === 0 ? (
                <div className="post-empty">暂无自动备份（下次服务启动时生成）</div>
              ) : (
                dataInfo.backups.map((b) => (
                  <div key={b.name} className="admin-row">
                    <div className="admin-row-main">
                      <div className="admin-row-title">{b.name}</div>
                      <div className="admin-row-sub">{fmtSize(b.size)} · {b.time?.slice(0, 19).replace('T', ' ')}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <h4 className="admin-section-title" style={{ marginTop: 26 }}>从备份恢复</h4>
            <p className="admin-row-sub">
              上传之前下载的 .db 备份文件。上传后需要在环界云「变更 → 保存」重新部署一次才生效，恢复前会自动备份当前数据。
            </p>
            <div className="form-actions" style={{ marginTop: 12 }}>
              <input ref={restoreRef} type="file" accept=".db" hidden onChange={handleRestore} />
              <button type="button" className="btn btn-ghost" onClick={() => restoreRef.current?.click()}>📤 上传备份并恢复</button>
            </div>
            {restoreMsg && <p className="admin-row-sub" style={{ color: '#86efac', marginTop: 10 }}>{restoreMsg}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
