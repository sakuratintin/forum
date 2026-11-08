import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import FollowButton from '../components/FollowButton.jsx'
import PostRow from '../components/PostRow.jsx'

export default function Search() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [input, setInput] = useState(q)
  const [tab, setTab] = useState('posts')
  const navigate = useNavigate()

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
          <div className="post-empty">输入关键词开始搜索</div>
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
                  <div className="post-empty">搜索中…</div>
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
                  <div className="post-empty">搜索中…</div>
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
                          <div className="user-card-stat">帖子 {u.post_count || 0}</div>
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
