import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Emblem from './Emblem.jsx'
import { api, getAuthUser, setToken, setAuthUser, notifyAuthChanged } from '../utils/api.js'

const NOTIF_LABEL = { mention: '@ 提到了你', reply: '回复了你', like: '赞了你' }

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifList, setNotifList] = useState([])
  const [user, setUser] = useState(getAuthUser)
  const [sections, setSections] = useState([])
  const [unread, setUnread] = useState(0)
  const dropRef = useRef(null)
  const notifRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    function onAuth() { setUser(getAuthUser()) }
    window.addEventListener('auth-changed', onAuth)
    return () => window.removeEventListener('auth-changed', onAuth)
  }, [])

  useEffect(() => {
    api.get('/sections').then((d) => setSections(d)).catch(() => setSections([]))
  }, [])

  useEffect(() => {
    if (!user) {
      setUnread(0)
      return
    }
    let alive = true
    function load() {
      api.get('/notifications/unread').then((d) => { if (alive) setUnread(d.unread || 0) }).catch(() => {})
    }
    load()
    const t = setInterval(load, 60000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [user])

  useEffect(() => {
    function onDocClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setBoardOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  function toggleNotif() {
    const next = !notifOpen
    setNotifOpen(next)
    setBoardOpen(false)
    if (next && user) {
      api.get('/notifications').then((d) => setNotifList((d.items || []).slice(0, 6))).catch(() => setNotifList([]))
    }
  }

  function logout() {
    setToken(null)
    setAuthUser(null)
    notifyAuthChanged()
    navigate('/')
  }

  const onSection = location.pathname.startsWith('/section')

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="nav-brand" onClick={() => { setOpen(false); setBoardOpen(false) }}>
          <Emblem />
          <span className="nav-brand-text">
            <span className="nav-brand-name">H.C.T</span>
            <span className="nav-brand-sub">FORUM</span>
          </span>
        </Link>

        <nav className={`nav-links${open ? ' open' : ''}`}>
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>首页</NavLink>

          <div className="nav-dropdown" ref={dropRef}>
            <button type="button" className={`nav-link nav-dropdown-toggle${onSection ? ' active' : ''}`} onClick={() => setBoardOpen((v) => !v)}>
              板块 <span className="nav-caret">▾</span>
            </button>
            <div className={`nav-dropdown-menu${boardOpen ? ' open' : ''}`}>
              <Link to="/section/all" className="nav-dropdown-item" onClick={() => { setBoardOpen(false); setOpen(false) }}>全部帖子</Link>
              {sections.map((s) => (
                <Link key={s.slug} to={`/section/${s.slug}`} className="nav-dropdown-item" onClick={() => { setBoardOpen(false); setOpen(false) }}>
                  {s.name}
                </Link>
              ))}
            </div>
          </div>

          <NavLink to="/new" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>发帖</NavLink>
          <NavLink to="/messages" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>私信</NavLink>
          <NavLink to="/search" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>搜索</NavLink>
          <NavLink to="/hot" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>热点</NavLink>
          <a
            href="https://xfurqukmczhp.sealosgzg.site/"
            className="nav-link nav-external"
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => { setOpen(false); setBoardOpen(false) }}
          >
            图库 <span className="nav-caret">↗</span>
          </a>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>管理</NavLink>
          )}
        </nav>

        <div className="nav-actions">
          {user && (
            <div className="nav-notif" ref={notifRef}>
              <button type="button" className="nav-bell" title="提醒" onClick={toggleNotif}>
                🔔
                {unread > 0 && <span className="nav-bell-badge">{unread > 99 ? '99+' : unread}</span>}
              </button>
              {notifOpen && (
                <div className="nav-notif-panel">
                  <div className="nav-notif-head">提醒</div>
                  {notifList.length === 0 ? (
                    <div className="nav-notif-empty">暂无提醒</div>
                  ) : (
                    notifList.map((n) => (
                      <Link
                        key={n.id}
                        to={n.post_id ? `/post/${n.post_id}` : '/notifications'}
                        className="nav-notif-item"
                        onClick={() => setNotifOpen(false)}
                      >
                        <span className="avatar">
                          {n.actor?.avatar ? <img src={n.actor.avatar} alt="" className="avatar-img" /> : n.actor?.username?.[0]}
                        </span>
                        <div className="nav-notif-main">
                          <div className="nav-notif-title"><b>{n.actor?.username}</b> {NOTIF_LABEL[n.type] || n.type}</div>
                          {n.snippet && <div className="nav-notif-snippet">{n.snippet}</div>}
                        </div>
                      </Link>
                    ))
                  )}
                  <Link to="/notifications" className="nav-notif-more" onClick={() => setNotifOpen(false)}>查看全部 →</Link>
                </div>
              )}
            </div>
          )}
          {user ? (
            <>
              <Link to={`/user/${encodeURIComponent(user.username)}`} className="nav-profile" title="个人主页">
                <span className="nav-profile-avatar">{user.avatar ? <img src={user.avatar} alt="头像" /> : user.username[0]}</span>
                <span className="nav-profile-label">{user.username}</span>
              </Link>
              <button className="btn btn-ghost nav-btn" onClick={logout}>退出</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary nav-btn">登录</Link>
          )}
          <button className="nav-menu-toggle" aria-label="菜单" onClick={() => setOpen(!open)}>☰</button>
        </div>
      </div>
    </header>
  )
}
