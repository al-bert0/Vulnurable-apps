import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function Profile() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(null)

  async function load() {
    // VULN: IDOR — this just fetches whatever :id is in the URL, no check
    // that it matches the logged-in user.
    const { ok, data } = await api.getProfile(id)
    if (ok) setUser(data)
  }

  useEffect(() => { load() }, [id])

  async function grantAdmin() {
    // VULN: mass assignment — the API happily accepts is_admin on a PATCH
    // with no server-side privilege check.
    const { ok, data } = await api.updateProfile(id, { is_admin: true })
    if (ok) {
      setUser(data)
      setStatus('is_admin set to true via PATCH — no authorization was checked.')
    }
  }

  if (!user) return <p className="muted">Loading...</p>

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>User Profile</h2>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Username:</strong> {user.username}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>SSN:</strong> {user.ssn}</p>
      <p><strong>Admin:</strong> {user.is_admin ? 'Yes' : 'No'}</p>
      <p className="muted">Try changing the number in the URL (/profile/2, /profile/3 ...) — no ownership check is performed.</p>
      <button onClick={grantAdmin}>Grant myself admin (mass-assignment demo)</button>
      {status && <p className="muted" style={{ marginTop: 10 }}>{status}</p>}
    </div>
  )
}
