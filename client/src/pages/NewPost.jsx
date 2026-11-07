import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api, getAuthUser } from '../utils/api.js'
import { fileToDataUrl } from '../utils/image.js'
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
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return fail('请填写标题')
    if (!content.trim() && media.length === 0) return fail('请填写正文或上传附件')
    setError('')
    setSubmitting(true)
    try {
      const mediaUrls = []
      for (const f of media) mediaUrls.push(await fileToDataUrl(f))
      const created = await api.post('/posts', { title: title.trim(), section, content: content.trim(), media: mediaUrls })
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
