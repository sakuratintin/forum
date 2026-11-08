import { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api.js'

const SYSTEM = '你是 H.C.T. Forum 论坛的 AI 助手，请用简洁、友好的中文回答用户的问题。'
const STORAGE_KEY = 'forum_ai_chat'

const SUGGESTIONS = ['这个论坛怎么发帖？', '怎么关注其他用户？', '推荐几个热门板块']

export default function AiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bodyRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* ignore */
    }
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 30)
  }, [open])

  async function send(content) {
    const msg = (content ?? text).trim()
    if (!msg || loading) return
    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setText('')
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/ai/chat', { messages: next, system: SYSTEM })
      setMessages([...next, { role: 'assistant', content: data.content }])
    } catch (ex) {
      setError(ex.message)
    } finally {
      setLoading(false)
      setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 30)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    send()
  }

  function clearChat() {
    setMessages([])
    setError('')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`ai-chat${open ? ' open' : ''}`}>
      {open && (
        <div className="ai-panel">
          <div className="ai-head">
            <span>🤖 AI 助手</span>
            <span className="ai-head-actions">
              {messages.length > 0 && (
                <button type="button" className="ai-clear" onClick={clearChat} title="清空对话">清空</button>
              )}
              <button type="button" className="ai-close" aria-label="关闭" onClick={() => setOpen(false)}>×</button>
            </span>
          </div>
          <div className="ai-body" ref={bodyRef}>
            {messages.length === 0 && !error && (
              <div className="ai-welcome">
                <div className="ai-welcome-title">你好！我是论坛 AI 助手 👋</div>
                <div className="ai-suggest">
                  {SUGGESTIONS.map((s) => (
                    <button type="button" key={s} className="ai-suggest-btn" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>{m.content}</div>
            ))}
            {loading && (
              <div className="ai-msg assistant ai-typing"><span></span><span></span><span></span></div>
            )}
            {error && <div className="ai-msg assistant ai-error">出错了：{error}</div>}
          </div>
          <form className="ai-input" onSubmit={onSubmit}>
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="问点什么…"
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !text.trim()}>发送</button>
          </form>
        </div>
      )}
      <button type="button" className={`ai-fab${open ? ' open' : ''}`} onClick={() => setOpen((v) => !v)} title="AI 助手">
        {open ? '×' : '🤖'}
      </button>
    </div>
  )
}
