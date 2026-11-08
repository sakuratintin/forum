import { Link } from 'react-router-dom'
import Emblem from './Emblem.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-col footer-brand-col">
          <div className="footer-brand">
            <Emblem />
            <span className="nav-brand-name">H.C.T</span>
          </div>
          <p className="footer-tagline">在数据洪流中，点亮属于你的节点 —— 一个属于同好们的讨论社区。</p>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">社区</h4>
          <Link to="/section/all" className="footer-link">全部帖子</Link>
          <Link to="/hot" className="footer-link">热点资讯</Link>
          <Link to="/new" className="footer-link">发布帖子</Link>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">发现</h4>
          <Link to="/search" className="footer-link">搜索帖子 / 用户</Link>
          <Link to="/messages" className="footer-link">私信</Link>
          <Link to="/login" className="footer-link">登录 / 注册</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <p className="footer-text">© {new Date().getFullYear()} H.C.T. Forum · 仅供学习交流</p>
      </div>
    </footer>
  )
}
