import Emblem from './Emblem.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Emblem />
          <span className="nav-brand-name">H.C.T</span>
        </div>
        <p className="footer-text">
          © {new Date().getFullYear()} H.C.T. Forum · 仅供学习交流
        </p>
      </div>
    </footer>
  )
}
