import { Link } from 'react-router-dom'
import Emblem from './Emblem.jsx'
import useCountUp from '../hooks/useCountUp.js'
import { getAuthUser } from '../utils/api.js'

function Stat({ value, label }) {
  const n = useCountUp(value)
  return (
    <div className="hero-stat">
      <div className="hero-stat-num">{n.toLocaleString('en-US')}</div>
      <div className="hero-stat-label">{label}</div>
    </div>
  )
}

export default function Hero({ stats = [] }) {
  const user = getAuthUser()
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-emblem fade-up">
          <Emblem />
        </div>
        <p className="hero-kicker fade-up d1">Welcome to H.C.T. Forum</p>
        <h1 className="hero-title fade-up d2">
          欢迎来到 <span className="accent">H.C.T. FORUM</span>
        </h1>
        <p className="hero-desc fade-up d3">
          这里是属于同好们的讨论社区。分享见解、参与讨论、结识朋友 —— 在数据洪流中，点亮属于你的那个节点。
        </p>
        <div className="hero-cta fade-up d4">
          <Link to="/section/acg" className="btn btn-primary">进入论坛</Link>
          {!user && <Link to="/login" className="btn btn-ghost">立即注册</Link>}
        </div>
        <div className="hero-stats fade-up d5">
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
        <div className="hero-scroll fade-up d5" aria-hidden="true">
          <span className="hero-scroll-line" />
          <span className="hero-scroll-dot" />
        </div>
      </div>
    </section>
  )
}
