import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken, setAuthUser, notifyAuthChanged } from '../utils/api.js'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function fail(msg) {
    setError(msg)
    setShakeKey((k) => k + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) return fail('请填写用户名和密码')
    if (mode === 'register' && password !== confirm) return fail('两次输入的密码不一致')
    setError('')
    setLoading(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const data = await api.post(path, { username: username.trim(), password })
      setToken(data.token)
      setAuthUser(data.user)
      notifyAuthChanged()
      navigate('/')
    } catch (ex) {
      fail(ex.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="form-card form-card-narrow">
          <div className="form-tabs">
            <button type="button" className={`form-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError('') }}>登录</button>
            <button type="button" className={`form-tab${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setError('') }}>注册</button>
            <span className="form-tab-indicator" style={{ transform: mode === 'login' ? 'translateX(0)' : 'translateX(100%)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">用户名</span>
              <input className="input" type="text" placeholder="输入用户名" value={username} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">密码</span>
              <input className="input" type="password" placeholder="输入密码" value={password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {mode === 'register' && (
              <label className="field">
                <span className="field-label">确认密码</span>
                <input className="input" type="password" placeholder="再次输入密码" value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
              </label>
            )}
            {error && <p key={shakeKey} className="form-error shake">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>


        </div>
      </div>
    </div>
  )
}
