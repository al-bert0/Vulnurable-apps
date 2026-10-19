import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, describeError, getSession, saveSession } from '../api'

export default function Profile() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let cancelled = false
    setUser(null)
    setError('')
    setStatus(null)
    // VULN: IDOR — this just fetches whatever :id is in the URL, no check
    // that it matches the logged-in user.
    api.getProfile(id).then(({ ok, status: code, data }) => {
      if (cancelled) return
      if (ok) setUser(data)
      else setError(code === 404 ? `No user with id ${id}.` : describeError(data, 'Could not load this profile.'))
    })
    return () => { cancelled = true }
  }, [id])

  async function grantAdmin() {
    // VULN: mass assignment — the API happily accepts is_admin on a PATCH
    // with no server-side privilege check.
    const { ok, data } = await api.updateProfile(id, { is_admin: true })
    if (ok) {
      setUser(data)
      setStatus('is_admin set to true via PATCH — no authorization was checked.')
      // If this is the logged-in user's own record, mirror it into the (insecure)
      // client-side session so the Admin link appears right away.
      const session = getSession()
      if (session && String(session.id) === String(data.id)) saveSession({ ...session, ...data })
    } else {
      setStatus(describeError(data, 'Update failed.'))
    }
  }

  if (error) return <div className="card" style={{ maxWidth: 480 }}><div className="error" role="alert">{error}</div></div>
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
