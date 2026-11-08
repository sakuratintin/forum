import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api, getAuthUser, uploadFile } from '../utils/api.js'
import { toastOk, toastErr } from '../utils/toast.js'
import MediaUploader from '../components/MediaUploader.jsx'
import SectionPicker from '../components/SectionPicker.jsx'

export default function NewPost() {
  const [searchParams] = useSearchParams()
  const { data: sections } = useApi('/sections')
  const secs = sections || []
  const [title, setTitle] = useState('')
  const [section, setSection] = useState(searchParams.get('section') || '')
  const [content, setContent] = useState('')
  const [media, setMedia] = useState([])
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [done, setDone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiBusy, setAiBusy] = useState('')
  const user = getAuthUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (secs.length && !secs.some((s) => s.slug === section)) {
      setSection(secs[0].slug)
    }
  }, [secs, section])

  if (!user) {
    return (
      <div className="page">
        <div className="container page-card">
          <h2>请先登录</h2>
          <p><Link to="/login" className="detail-author">登录</Link> 后即可发帖。</p>
        </div>
      </div>
    )
  }
  if (user.muted) {
    return (
      <div className="page">
        <div className="container page-card">
          <h2>你已被禁言</h2>
          <p>暂时无法发布帖子，请联系管理员解禁。</p>
        </div>
      </div>
    )
  }

  function fail(msg) {
    setError(msg)
    setShakeKey((k) => k + 1)
    toastErr(msg)
  }

  async function aiCall(prompt) {
    const data = await api.post('/ai/chat', { messages: [{ role: 'user', content: prompt }] })
    return (data.content || '').trim()
  }

  async function aiPolish() {
    if (!content.trim()) return fail('请先写正文，再用 AI 润色')
    setAiBusy('polish')
    try {
      setContent(await aiCall(`请润色下面这段论坛帖子正文，保持原意，让表达更通顺自然。直接输出润色后的正文，不要任何解释：\n\n${content}`))
    } catch (ex) {
      fail(ex.message)
    } finally {
      setAiBusy('')
    }
  }

  async function aiContinue() {
    if (!content.trim()) return fail('请先写正文，再用 AI 续写')
    setAiBusy('continue')
    try {
      const extra = await aiCall(`请接着下面这段论坛帖子正文自然地续写一段（约 100 字），风格保持一致，直接输出续写内容，不要重复原文：\n\n${content}`)
      setContent(content + '\n\n' + extra)
    } catch (ex) {
      fail(ex.message)
    } finally {
      setAiBusy('')
    }
  }

  async function aiTitle() {
    if (!content.trim()) return fail('请先写正文，再生成标题')
    setAiBusy('title')
    try {
      const t = await aiCall(`请根据下面这段论坛帖子正文，生成一个简洁吸引人的标题（不超过 20 字），直接输出标题，不要引号、不要解释：\n\n${content}`)
      setTitle(t.slice(0, 80))
    } catch (ex) {
      fail(ex.message)
    } finally {
      setAiBusy('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return fail('请填写标题')
    if (!content.trim() && media.length === 0) return fail('请填写正文或上传附件')
    setError('')
    setSubmitting(true)
    try {
      const mediaUrls = []
      for (const f of media) mediaUrls.push(await uploadFile(f))
      const created = await api.post('/posts', { title: title.trim(), section, content: content.trim(), media: mediaUrls })
      toastOk('发帖成功')
      navigate(`/post/${created.id}`)
    } catch (ex) {
      fail(ex.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <h1 className="page-title">发布新帖</h1>
          <p className="page-sub">分享你的想法，与社区交流</p>
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label-row">
              <span className="field-label">标题</span>
              <span className="field-count">{title.length}/80</span>
            </span>
            <input className="input" type="text" placeholder="一句话概括你的主题" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="field">
            <span className="field-label">板块</span>
            <SectionPicker value={section} onChange={setSection} sections={secs} />
          </div>

          <label className="field">
            <span className="field-label-row">
              <span className="field-label">正文</span>
              <span className="field-count">{content.length} 字</span>
            </span>
            <textarea className="input textarea" rows={8} placeholder="在这里输入正文内容…" value={content} onChange={(e) => setContent(e.target.value)} />
          </label>

          <div className="ai-tools">
            <button type="button" className="ai-tool-btn" onClick={aiPolish} disabled={!!aiBusy}>
              {aiBusy === 'polish' ? '润色中…' : '✨ AI 润色'}
            </button>
            <button type="button" className="ai-tool-btn" onClick={aiContinue} disabled={!!aiBusy}>
              {aiBusy === 'continue' ? '续写中…' : '➕ AI 续写'}
            </button>
            <button type="button" className="ai-tool-btn" onClick={aiTitle} disabled={!!aiBusy}>
              {aiBusy === 'title' ? '生成中…' : '🏷 生成标题'}
            </button>
          </div>

          <MediaUploader files={media} onChange={setMedia} />

          {error && <p key={shakeKey} className="form-error shake">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '发布中…' : '发布'}</button>
            <span className="form-hint">支持图片和视频附件</span>
          </div>

          {done && <div className="form-toast">{done}</div>}
        </form>
      </div>
    </div>
  )
}
