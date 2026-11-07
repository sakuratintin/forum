import { useRef, useState } from 'react'
import { api } from '../utils/api.js'

const SYSTEM = '你是 H.C.T. Forum 论坛的 AI 助手，请用简洁、友好的中文回答用户的问题。'

export default function AiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bodyRef = useRef(null)

  async function send(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user', content }]
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
      setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 50)
    }
  }

  return (
    <div className={`ai-chat${open ? ' open' : ''}`}>
      {open && (
        <div className="ai-panel">
          <div className="ai-head">
            <span>🤖 AI 助手</span>
            <button type="button" className="ai-close" aria-label="关闭" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="ai-body" ref={bodyRef}>
            {messages.length === 0 && !error && <div className="ai-tip">你好！我是论坛 AI 助手，有什么可以帮你？</div>}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>{m.content}</div>
            ))}
            {loading && <div className="ai-msg assistant">正在思考…</div>}
            {error && <div className="ai-msg assistant ai-error">出错了：{error}</div>}
          </div>
          <form className="ai-input" onSubmit={send}>
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
