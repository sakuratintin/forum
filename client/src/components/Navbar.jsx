import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Emblem from './Emblem.jsx'
import { api, getAuthUser, setToken, setAuthUser, notifyAuthChanged } from '../utils/api.js'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [user, setUser] = useState(getAuthUser)
  const [sections, setSections] = useState([])
  const dropRef = useRef(null)
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
    function onDocClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setBoardOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

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
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>管理</NavLink>
          )}
        </nav>

        <div className="nav-actions">
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
