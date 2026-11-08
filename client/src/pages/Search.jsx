import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import useTitle from '../hooks/useTitle.js'
import FollowButton from '../components/FollowButton.jsx'
import PostRow from '../components/PostRow.jsx'
import SkeletonRows from '../components/Skeleton.jsx'

const RECENT_KEY = 'forum_recent_search'
const HOT_TAGS = ['二次元', '推番', '学习方法', '考研', '社团招新', '二手交易', '手游', '端游', '期末考试']

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.slice(0, 8) : []
  } catch {
    return []
  }
}

function saveRecent(v) {
  try {
    const list = loadRecent().filter((x) => x !== v)
    list.unshift(v)
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)))
  } catch {
    /* ignore */
  }
}

export default function Search() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [input, setInput] = useState(q)
  const [tab, setTab] = useState('posts')
  const [recent, setRecent] = useState(loadRecent)
  const navigate = useNavigate()
  useTitle('搜索')

  useEffect(() => {
    if (q) {
      saveRecent(q)
      setRecent(loadRecent())
    }
  }, [q])

  const { data: postData, loading: postLoading } = useApi(`/posts?q=${encodeURIComponent(q)}&pageSize=50`)
  const { data: userData, loading: userLoading } = useApi(`/users?q=${encodeURIComponent(q)}`)

  const posts = postData?.posts || []
  const postTotal = postData?.total || 0
  const users = userData || []

  function onSubmit(e) {
    e.preventDefault()
    const v = input.trim()
    if (v) navigate(`/search?q=${encodeURIComponent(v)}`)
  }

  function go(v) {
    setInput(v)
    navigate(`/search?q=${encodeURIComponent(v)}`)
  }

  function clearRecent() {
    try {
      localStorage.removeItem(RECENT_KEY)
    } catch {
      /* ignore */
    }
    setRecent([])
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <h1 className="page-title">搜索</h1>
          <p className="page-sub">搜索帖子或用户</p>
        </div>

        <form className="search-bar" onSubmit={onSubmit}>
          <input className="input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入关键词…" />
          <button type="submit" className="btn btn-primary">搜索</button>
        </form>

        {!q ? (
          <div className="search-suggest">
            {recent.length > 0 && (
              <>
                <div className="search-suggest-head">
                  <span>最近搜索</span>
                  <button type="button" className="search-clear" onClick={clearRecent}>清空</button>
                </div>
                <div className="search-chips">
                  {recent.map((r) => (
                    <button key={r} type="button" className="search-chip" onClick={() => go(r)}>{r}</button>
                  ))}
                </div>
              </>
            )}
            <div className="search-suggest-head"><span>热门搜索</span></div>
            <div className="search-chips">
              {HOT_TAGS.map((t) => (
                <button key={t} type="button" className="search-chip" onClick={() => go(t)}>{t}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="board-tabs search-tabs">
              <button type="button" className={`board-tab${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>帖子</button>
              <button type="button" className={`board-tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>用户</button>
            </div>

            {tab === 'posts' ? (
              <>
                <p className="search-count">找到 {postTotal} 条与「{q}」相关的帖子</p>
                {postLoading ? (
                  <SkeletonRows count={4} />
                ) : posts.length === 0 ? (
                  <div className="post-empty">没有找到相关帖子</div>
                ) : (
                  <div className="post-list">
                    {posts.map((p, i) => (
                      <PostRow key={p.id} p={p} delay={i * 30} showSection />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="search-count">找到 {users.length} 位与「{q}」相关的用户</p>
                {userLoading ? (
                  <SkeletonRows count={3} />
                ) : users.length === 0 ? (
                  <div className="post-empty">没有找到相关用户</div>
                ) : (
                  <div className="user-grid">
                    {users.map((u) => (
                      <Link to={`/user/${encodeURIComponent(u.username)}`} key={u.id} className="user-card fade-up">
                        <span className="avatar">{u.avatar ? <img src={u.avatar} alt="" className="avatar-img" /> : u.username[0]}</span>
                        <div className="user-card-main">
                          <div className="user-card-name">
                            {u.username}
                            {u.muted ? <span className="muted-badge">已禁言</span> : null}
                          </div>
                          <div className="user-card-bio">{u.bio || '这个人很懒，还没有填写简介。'}</div>
                          <div className="user-card-stat">UID {u.uid || '—'} · 帖子 {u.post_count || 0}</div>
                        </div>
                        <FollowButton username={u.username} initialFollowing={u.is_following} />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
