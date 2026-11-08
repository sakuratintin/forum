import { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api.js'

const SYSTEM = '你是 H.C.T. Forum 论坛的 AI 助手，请用简洁、友好的中文回答用户的问题。'
const STORAGE_KEY = 'forum_ai_chat'

const SUGGESTIONS = ['这个论坛怎么发帖？', '怎么关注其他用户？', '推荐几个热门板块']

function SparkIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z" fill="currentColor" />
      <path d="M19 3.5 L19.7 5.5 L22 6.2 L19.7 6.9 L19 9 L18.3 6.9 L16 6.2 L18.3 5.5 Z" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

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
  const [listening, setListening] = useState(false)
  const bodyRef = useRef(null)
  const recRef = useRef(null)

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

  useEffect(() => () => recRef.current?.abort?.(), [])

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

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('当前浏览器不支持语音输入，建议用 Chrome 或 Edge')
      return
    }
    try {
      const rec = new SR()
      rec.lang = 'zh-CN'
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onstart = () => setListening(true)
      rec.onend = () => setListening(false)
      rec.onerror = (e) => {
        setListening(false)
        setError('语音识别失败：' + (e.error || '未知错误'))
      }
      rec.onresult = (e) => {
        const t = e.results[0][0].transcript
        setText((prev) => (prev ? prev + t : t))
      }
      recRef.current = rec
      rec.start()
    } catch (ex) {
      setError('语音功能启动失败：' + ex.message)
    }
  }

  function stopVoice() {
    recRef.current?.stop?.()
    setListening(false)
  }

  return (
    <div className={`ai-chat${open ? ' open' : ''}`}>
      {open && (
        <div className="ai-panel">
          <div className="ai-head">
            <span className="ai-title"><SparkIcon size={16} /> AI 助手</span>
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
            <button
              type="button"
              className={`ai-mic${listening ? ' listening' : ''}`}
              onClick={listening ? stopVoice : startVoice}
              disabled={loading}
              title="语音输入"
            >
              <MicIcon />
            </button>
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={listening ? '聆听中…' : '问点什么…'}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !text.trim()}>发送</button>
          </form>
        </div>
      )}
      <button type="button" className={`ai-fab${open ? ' open' : ''}`} onClick={() => setOpen((v) => !v)} title="AI 助手">
        {open ? '×' : <SparkIcon size={26} />}
      </button>
    </div>
  )
}
