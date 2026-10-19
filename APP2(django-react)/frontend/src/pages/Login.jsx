import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, saveSession } from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const { ok, data } = await api.login(username, password)
    if (ok && data.success) {
      saveSession(data.user)
      navigate('/products')
    } else {
      setError(data.error || 'Invalid username or password.')
    }
  }

  return (
    <div className="card" style={{ maxWidth: 380, margin: '40px auto' }}>
      <h2 style={{ marginTop: 0 }}>Sign in to ShopEase</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Sign In</button>
      </form>
      <p className="muted">Demo accounts: alice/alice123, bob/bobpass, admin/admin!2024</p>
    </div>
  )
}
