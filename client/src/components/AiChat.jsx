import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, transcribeFile } from '../utils/api.js'

const SYSTEM = `你是 H.C.T. Forum 论坛的 AI 助手。请只依据下面列出的功能回答，绝对不要编造网站上不存在的功能（例如没有「预览」「标签」「草稿」「编辑器」等）。

网站功能：
- 板块（共 6 个）：二次元、学习交流、学习生活、社团活动、二手集市、游戏讨论
- 发帖：点导航栏「发帖」→ 填标题 → 选板块 → 写正文（可选上传图片/视频）→ 点「发布」。板块页右上角也有「＋ 发帖」。
- 关注：打开他人主页点「＋ 关注」；互相关注后按钮显示「互相关注 ✓」
- 私信：导航栏「私信」，仅互相关注的好友可发
- 搜索：导航栏「搜索」，可搜帖子标题/内容；切到「用户」标签可按用户名或 UID 搜索
- 热点资讯：导航栏「热点」，含 新闻/赛事/动漫/游戏 分类，由 AI 联网整理
- 帖子内 @EVA：在帖子回复框输入 @EVA + 问题，AI 会阅读该帖和评论后作答
- UID：每个用户有唯一数字 UID，显示在个人主页

回答要求：简洁（200 字以内）；问「怎么用」时用 1. 2. 3. 列出步骤；不确定就直接说不知道，不要编造。`

const STORAGE_KEY = 'forum_ai_chat'

const SUGGESTIONS = ['怎么发帖？', '怎么关注和私信别人？', '怎么查看热点资讯？', '论坛有哪些板块？']

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

// 把 AudioBuffer 编码成 16bit PCM 的 WAV（智谱语音识别只收 wav/mp3）
function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const samples = buffer.length
  const dataSize = samples * numCh * 2
  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numCh * 2, true)
  view.setUint16(32, numCh * 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)
  const channels = []
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c))
  let off = 44
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

async function toWav(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    return audioBufferToWav(audioBuffer)
  } finally {
    try {
      ctx.close()
    } catch {
      /* ignore */
    }
  }
}

export default function AiChat() {
  const location = useLocation()
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
  const [transcribing, setTranscribing] = useState(false)
  const bodyRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])

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

  useEffect(() => () => {
    try {
      recRef.current?.stop?.()
    } catch {
      /* ignore */
    }
  }, [])

  async function send(content) {
    const msg = (content ?? text).trim()
    if (!msg || loading) return
    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setText('')
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/ai/chat', {
        messages: next,
        system: `${SYSTEM}\n\n（用户当前所在页面：${location.pathname}）`,
      })
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

  async function startVoice() {
    if (listening || transcribing) return
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('当前浏览器不支持录音，请用 Chrome / Edge')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      const timer = setTimeout(() => {
        try {
          rec.stop()
        } catch {
          /* ignore */
        }
      }, 30000)
      rec.onstop = async () => {
        clearTimeout(timer)
        try {
          stream.getTracks().forEach((t) => t.stop())
        } catch {
          /* ignore */
        }
        const raw = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        setListening(false)
        if (!raw.size) return
        setTranscribing(true)
        setError('')
        try {
          const wav = await toWav(raw)
          const t = await transcribeFile(wav, 'voice.wav')
          if (t) setText((prev) => (prev ? prev + t : t))
          else setError('没有识别到内容，请再说一次')
        } catch (ex) {
          setError('语音识别失败：' + ex.message)
        } finally {
          setTranscribing(false)
        }
      }
      recRef.current = rec
      rec.start()
      setListening(true)
      setError('')
    } catch (ex) {
      setError(ex.name === 'NotAllowedError' ? '请允许浏览器使用麦克风' : '无法录音：' + ex.message)
    }
  }

  function stopVoice() {
    try {
      recRef.current?.stop?.()
    } catch {
      /* ignore */
    }
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
              disabled={loading || transcribing}
              title={listening ? '结束录音' : '语音输入'}
            >
              <MicIcon />
            </button>
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={transcribing ? '正在识别语音…' : listening ? '正在录音（最长 30 秒），再点一下结束…' : '问点什么…'}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || transcribing || !text.trim()}>发送</button>
          </form>
        </div>
      )}
      <button type="button" className={`ai-fab${open ? ' open' : ''}`} onClick={() => setOpen((v) => !v)} title="AI 助手">
        {open ? '×' : <SparkIcon size={26} />}
      </button>
    </div>
  )
}
