import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, saveSession, describeError } from '../api'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { ok, data } = await api.register(form.username.trim(), form.email.trim(), form.password)
      if (ok && data.success && data.user) {
        // Auto-login after registration (same insecure localStorage session as login).
        saveSession(data.user)
        navigate('/products')
      } else {
        // VULN: server error text (incl. "username already taken") shown verbatim -> user enumeration.
        setError(describeError(data, 'Registration failed.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: 'clamp(20px, 6vh, 64px) auto' }}>
      <p className="muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>New here?</p>
      <h2>Create your ShopEase account</h2>
      {error && <div className="error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="reg-username">Username</label>
        <input id="reg-username" autoComplete="username" type="text" value={form.username} onChange={set('username')} required />
        <label htmlFor="reg-email">Email</label>
        <input id="reg-email" autoComplete="email" type="email" value={form.email} onChange={set('email')} required />
        <label htmlFor="reg-password">Password</label>
        <input id="reg-password" autoComplete="new-password" type="password" value={form.password} onChange={set('password')} required />
        <label htmlFor="reg-confirm">Confirm password</label>
        <input id="reg-confirm" autoComplete="new-password" type="password" value={form.confirm} onChange={set('confirm')} required />
        <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account →'}</button>
      </form>
      <p className="muted" style={{ marginTop: 18 }}>Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  )
}
