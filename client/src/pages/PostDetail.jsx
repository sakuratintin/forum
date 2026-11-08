import { useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { api, getAuthUser } from '../utils/api.js'
import useTitle from '../hooks/useTitle.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FollowButton from '../components/FollowButton.jsx'
import SkeletonRows from '../components/Skeleton.jsx'
import { toastOk, toastErr } from '../utils/toast.js'

function isVideo(m) {
  return typeof m === 'string' && (/^data:video\//.test(m) || /\.(mp4|webm|mov|ogg|m4v)$/i.test(m))
}

export default function PostDetail() {
  const { id } = useParams()
  const { data: post, loading, error, setData } = useApi(`/posts/${id}`)
  const { data: sections } = useApi('/sections')
  const [replyText, setReplyText] = useState('')
  const [replyErr, setReplyErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [translation, setTranslation] = useState('')
  const [translating, setTranslating] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const replyRef = useRef(null)
  const user = getAuthUser()
  const navigate = useNavigate()
  useTitle(post?.title)

  if (loading && !post) {
    return <div className="page"><div className="container"><SkeletonRows count={2} /></div></div>
  }
  if (error && !post) {
    return <div className="page"><div className="container page-card"><h2>加载失败</h2><p>{error}</p></div></div>
  }
  if (!post) {
    return <div className="page"><div className="container page-card"><h2>帖子不存在或已被删除</h2><p>该帖子可能已被删除，请返回列表。</p></div></div>
  }

  const sectionSlug = (sections || []).find((s) => s.name === post.section)?.slug
  const mutedMe = !!user?.muted
  const canDelete = !!user && (post.author?.id === user.id || user.role === 'admin')
  const isAdmin = user?.role === 'admin'

  async function handleLike() {
    try {
      const r = await api.post(`/posts/${post.id}/like`)
      setData({ ...post, liked: r.liked, like_count: post.like_count + (r.liked ? 1 : -1) })
    } catch { /* ignore */ }
  }

  async function handleBookmark() {
    try {
      const r = await api.post(`/posts/${post.id}/bookmark`)
      setData({ ...post, bookmarked: r.bookmarked })
      toastOk(r.bookmarked ? '已收藏' : '已取消收藏')
    } catch (ex) {
      toastErr(ex.message)
    }
  }

  async function handleReply(e) {
    e.preventDefault()
    if (mutedMe || !replyText.trim() || submitting) return
    setSubmitting(true)
    setReplyErr('')
    try {
      const r = await api.post(`/posts/${post.id}/replies`, { content: replyText.trim() })
      const myReply = { ...r }
      delete myReply.aiReply
      const added = [myReply]
      if (r.aiReply && r.aiReply.id) added.push(r.aiReply)
      setData({ ...post, replies: [...(post.replies || []), ...added], reply_count: (post.reply_count || 0) + added.length })
      if (r.aiReply && r.aiReply.error) setReplyErr(r.aiReply.error)
      setReplyText('')
    } catch (ex) {
      setReplyErr(ex.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTranslate() {
    if (translating || !post.content) return
    setTranslating(true)
    setReplyErr('')
    try {
      const data = await api.post('/ai/chat', {
        messages: [{ role: 'user', content: `请把下面这段帖子内容翻译成中文（如果原文是中文则翻译成英文），直接输出译文，不要任何解释：\n\n${post.content}` }],
      })
      setTranslation((data.content || '').trim())
    } catch (ex) {
      setReplyErr(ex.message)
    } finally {
      setTranslating(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await api.del(`/posts/${post.id}`)
      toastOk('帖子已删除')
      navigate(sectionSlug ? `/section/${sectionSlug}` : '/')
    } catch (ex) {
      toastErr(ex.message)
      setReplyErr(ex.message)
      setShowDelete(false)
      setDeleting(false)
    }
  }

  async function handlePin() {
    try {
      const r = await api.post(`/posts/${post.id}/pin`)
      setData({ ...post, pinned: r.pinned })
    } catch (ex) {
      setReplyErr(ex.message)
    }
  }

  return (
    <div className="page">
      <div className="container detail-wrap">
        <nav className="breadcrumb">
          <Link to="/">首页</Link>
          <span>/</span>
          {sectionSlug ? <Link to={`/section/${sectionSlug}`}>{post.section}</Link> : <span>{post.section}</span>}
          <span>/</span>
          <span>帖子</span>
        </nav>

        <article className="detail-card">
          <header className="detail-head">
            <h1 className="detail-title">
              {post.pinned && <span className="post-tag pinned">置顶</span>}
              {post.hot && <span className="post-tag hot">热门</span>}
              {post.title}
            </h1>
            <div className="detail-meta">
              <span className="avatar">
                {post.author?.avatar ? <img src={post.author.avatar} alt="" className="avatar-img" /> : post.author?.username?.[0]}
              </span>
              <Link to={`/user/${encodeURIComponent(post.author?.username)}`} className="detail-author author-link">{post.author?.username}</Link>
              {post.author?.uid && <span className="detail-uid">UID {post.author.uid}</span>}
              <FollowButton username={post.author?.username} initialFollowing={post.author?.is_following} />
              <span>·</span>
              <span>{post.created_at}</span>
              <span>·</span>
              <span>{post.section}</span>
            </div>
          </header>

          <div className="detail-body">
            {post.content && <p>{post.content}</p>}
            {post.media?.length > 0 && (
              <div className="detail-media">
                {post.media.map((m, i) =>
                  isVideo(m) ? (
                    <video key={i} src={m} controls className="detail-video" />
                  ) : (
                    <img key={i} src={m} alt={`图片${i + 1}`} loading="lazy" />
                  ),
                )}
              </div>
            )}
            {translation && (
              <div className="detail-translate">
                <div className="detail-translate-title">🌐 AI 翻译</div>
                <p>{translation}</p>
              </div>
            )}
          </div>

          <footer className="detail-actions">
            <button type="button" className={`action-btn${post.liked ? ' liked' : ''}`} onClick={handleLike}>
              <span className="like-icon">{post.liked ? '❤️' : '🤍'}</span>
              <span>{post.like_count}</span>
            </button>
            <button type="button" className="action-btn" onClick={() => replyRef.current?.focus()}>💬 {post.reply_count}</button>
            <button type="button" className={`action-btn${post.bookmarked ? ' bookmarked' : ''}`} onClick={handleBookmark}>
              {post.bookmarked ? '🔖 已收藏' : '🔖 收藏'}
            </button>
            <button type="button" className="action-btn" onClick={handleTranslate} disabled={translating}>
              {translating ? '翻译中…' : '🌐 翻译'}
            </button>
            {canDelete && (
              <Link to={`/post/${post.id}/edit`} className="action-btn">✏️ 编辑</Link>
            )}
            {canDelete && (
              <button type="button" className="action-btn action-danger" onClick={() => setShowDelete(true)}>🗑 删除</button>
            )}
            {isAdmin && (
              <button type="button" className="action-btn action-pin" onClick={handlePin}>
                {post.pinned ? '📌 取消置顶' : '📌 置顶'}
              </button>
            )}
          </footer>
        </article>

        <section className="replies">
          <h2 className="replies-title">{post.replies?.length || 0} 条回复</h2>
          <div className="reply-list">
            {(post.replies || []).map((r) => (
              <div className={`reply-item${r.is_ai ? ' ai' : ''}`} key={r.id}>
                <span className="avatar">{r.author?.avatar ? <img src={r.author.avatar} alt="" className="avatar-img" /> : r.author?.username?.[0]}</span>
                <div className="reply-main">
                  <div className="reply-head">
                    <span className="reply-author">{r.author?.username}</span>
                    {r.is_ai && <span className="ai-badge">AI</span>}
                    <span className="reply-floor">#{r.floor}</span>
                  </div>
                  <p className="reply-content">{r.content}</p>
                  <div className="reply-meta"><span>{r.created_at}</span></div>
                </div>
              </div>
            ))}
          </div>

          {!user ? (
            <div className="reply-login">
              <p>登录后即可参与讨论、回复本帖</p>
              <Link to="/login" className="btn btn-primary">去登录</Link>
            </div>
          ) : (
            <form className="reply-form" onSubmit={handleReply}>
            {mutedMe && <p className="form-error">你已被禁言，暂时无法回复。</p>}
            {replyErr && <p className="form-error">{replyErr}</p>}
            <textarea
              ref={replyRef}
              className="input textarea"
              rows={3}
              placeholder={mutedMe ? '你已被禁言，暂时无法回复' : '写下你的回复…（输入 @EVA 可让 AI 回答）'}
              value={replyText}
              disabled={mutedMe || submitting}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="form-actions">
              <button
                type="button"
                className="reply-eva-btn"
                onClick={() => setReplyText((t) => (t.includes('@EVA') ? t : t ? t + ' @EVA ' : '@EVA '))}
                disabled={mutedMe || submitting}
              >
                @EVA 提问
              </button>
              <button type="submit" className="btn btn-primary" disabled={mutedMe || submitting}>
                {submitting ? (/@EVA/i.test(replyText) ? 'AI 思考中…' : '发送中…') : '回复'}
              </button>
            </div>
            </form>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="删除帖子"
        message="确定要删除这篇帖子吗？删除后无法恢复。"
        confirmText={deleting ? '删除中…' : '删除'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
