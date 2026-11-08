import { Link } from 'react-router-dom'
import useApi from '../hooks/useApi.js'
import { getAuthUser } from '../utils/api.js'
import useTitle from '../hooks/useTitle.js'
import PostRow from '../components/PostRow.jsx'
import SkeletonRows from '../components/Skeleton.jsx'

export default function Bookmarks() {
  useTitle('我的收藏')
  const user = getAuthUser()
  const { data, loading } = useApi('/bookmarks')
  const posts = data || []

  if (!user) {
    return (
      <div className="page">
        <div className="container page-card">
          <h2>请先登录</h2>
          <p><Link to="/login" className="detail-author">登录</Link> 后即可查看收藏。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container detail-wrap">
        <div className="page-head">
          <h1 className="page-title">我的收藏</h1>
          <p className="page-sub">你收藏过的帖子都会出现在这里</p>
        </div>
        {loading ? (
          <SkeletonRows count={4} />
        ) : posts.length === 0 ? (
          <div className="post-empty">还没有收藏任何帖子，去帖子页点「🔖 收藏」试试</div>
        ) : (
          <div className="post-list">
            {posts.map((p, i) => (
              <PostRow key={p.id} p={p} delay={i * 40} showSection />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
