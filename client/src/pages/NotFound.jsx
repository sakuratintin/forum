import { Link } from 'react-router-dom'
import useTitle from '../hooks/useTitle.js'

export default function NotFound() {
  useTitle('页面不存在')
  return (
    <div className="page">
      <div className="container page-card">
        <h2>页面不存在</h2>
        <p>你要找的页面可能已被删除，或者链接有误。</p>
        <div className="form-actions" style={{ justifyContent: 'center', marginTop: 20 }}>
          <Link to="/" className="btn btn-primary">返回首页</Link>
          <Link to="/section/all" className="btn btn-ghost">浏览帖子</Link>
        </div>
      </div>
    </div>
  )
}
