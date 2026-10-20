import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, saveSession, describeError } from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { ok, data } = await api.login(username.trim(), password)
      if (ok && data.success && data.user) {
        saveSession(data.user)
        navigate('/products')
      } else {
        // 401 -> {success:false}; 500 -> raw SQL error + query (intentional leak, shown as-is)
        setError(describeError(data, 'Invalid username or password.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: 'clamp(20px, 6vh, 64px) auto' }}>
      <p className="muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Welcome back</p>
      <h2>Sign in to ShopEase</h2>
      <p className="muted">Use a demo account to explore the security lab.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input id="username" autoComplete="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input id="password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely →'}</button>
      </form>
      <p className="muted" style={{ marginTop: 18 }}>No account yet? <Link to="/register">Register</Link></p>
      <div style={{ marginTop: 22, padding: 14, background: '#f7f9fc', borderRadius: 10 }}>
        <strong style={{ fontSize: 13 }}>Demo accounts</strong>

      </div>
    </div>
  )
}
