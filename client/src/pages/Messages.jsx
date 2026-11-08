import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, getAuthUser, uploadFile } from '../utils/api.js'
import { toastErr } from '../utils/toast.js'

export default function Messages() {
  const { username } = useParams()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(username || null)
  const [messages, setMessages] = useState([])
  const [mutual, setMutual] = useState(false)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const bodyRef = useRef(null)
  const imgRef = useRef(null)
  const user = getAuthUser()

  const activeConv = conversations.find((c) => c.username === active)

  function loadConversations() {
    return api.get('/messages').then((list) => { setConversations(list); return list }).catch(() => [])
  }

  useEffect(() => {
    loadConversations().then((list) => {
      if (!username && list.length && !active) setActive(list[0].username)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!active) return
    api.get(`/messages/${encodeURIComponent(active)}`).then(setMessages).catch(() => setMessages([]))
    api.get(`/users/${encodeURIComponent(active)}`).then((u) => setMutual(!!u.is_mutual)).catch(() => setMutual(false))
  }, [active])

  useEffect(() => {
    const t = setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 30)
    return () => clearTimeout(t)
  }, [messages, active])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || !active || !mutual) return
    setErr('')
    try {
      const m = await api.post(`/messages/${encodeURIComponent(active)}`, { text: text.trim() })
      setMessages((prev) => [...prev, m])
      setText('')
      loadConversations()
    } catch (ex) {
      setErr(ex.message)
      toastErr(ex.message)
    }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !active || !mutual) return
    setErr('')
    try {
      const url = await uploadFile(file)
      const m = await api.post(`/messages/${encodeURIComponent(active)}`, { image: url })
      setMessages((prev) => [...prev, m])
      loadConversations()
    } catch (ex) {
      setErr(ex.message)
      toastErr(ex.message)
    }
  }

  if (!user) {
    return (
      <div className="page">
        <div className="container page-card">
          <h2>请先登录</h2>
          <p><Link to="/login" className="detail-author">登录</Link> 后即可使用私信。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container">
        <div className="messages">
          <aside className="msg-side">
            <div className="msg-side-head"><h2 className="msg-title">私信</h2></div>
            <div className="msg-list">
              {conversations.length === 0 ? (
                <div className="msg-empty">暂无会话<br /><span className="msg-empty-sub">互相关注后即可私信</span></div>
              ) : (
                conversations.map((c) => (
                  <button key={c.username} type="button" className={`msg-item${active === c.username ? ' active' : ''}`} onClick={() => setActive(c.username)}>
                    <span className="avatar">{c.avatar ? <img src={c.avatar} alt="" className="avatar-img" /> : c.username[0]}</span>
                    <div className="msg-item-main">
                      <div className="msg-item-name">{c.username}</div>
                      <div className="msg-item-preview">{c.last?.content || (c.last?.image ? '[图片]' : '')}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="msg-chat">
            {!active ? (
              <div className="msg-empty">选择左侧会话开始聊天</div>
            ) : (
              <>
                <div className="msg-chat-head">
                  <span className="avatar">{activeConv?.avatar ? <img src={activeConv.avatar} alt="" className="avatar-img" /> : active[0]}</span>
                  <span className="msg-chat-name">{active}</span>
                  <Link to={`/user/${encodeURIComponent(active)}`} className="msg-view-profile">查看主页</Link>
                </div>
                <div className="msg-body" ref={bodyRef}>
                  {messages.length === 0 && <div className="msg-empty">还没有消息，打个招呼吧 👋</div>}
                  {messages.map((m, i) => {
                    const prev = messages[i - 1]
                    const sameSide = prev && prev.from_me === m.from_me
                    return (
                      <div key={m.id} className={`msg-row ${m.from_me ? 'me' : 'them'}${sameSide ? ' grouped' : ''}`}>
                        <div className="msg-bubble">
                          {m.image && <img src={m.image} alt="图片" className="msg-img" />}
                          {m.content ? <span>{m.content}</span> : null}
                        </div>
                        {!sameSide && <span className="msg-time">{m.created_at?.slice(11, 16)}</span>}
                      </div>
                    )
                  })}
                </div>
                <form className="msg-input" onSubmit={handleSend}>
                  <input ref={imgRef} type="file" accept="image/*" hidden onChange={handleImage} />
                  <button type="button" className="msg-img-btn" title="发送图片" disabled={!mutual} onClick={() => imgRef.current?.click()}>🖼</button>
                  <input
                    className="input"
                    type="text"
                    placeholder={mutual ? `发消息给 ${active}…` : '互相关注后才能聊天'}
                    value={text}
                    disabled={!mutual}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!mutual || !text.trim()}>发送</button>
                </form>
                {err && <p className="form-error">{err}</p>}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
