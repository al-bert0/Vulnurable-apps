import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [host, setHost] = useState('127.0.0.1')
  const [pingResult, setPingResult] = useState('')
  const [file, setFile] = useState('internal_notes.txt')
  const [fileResult, setFileResult] = useState('')

  useEffect(() => {
    // VULN: no auth header sent, none required — the API returns the full
    // user table (including SSNs and plaintext passwords) to anyone.
    api.adminUsers().then(({ data }) => setUsers(Array.isArray(data) ? data : []))
  }, [])

  async function runPing(e) {
    e.preventDefault()
    const { data } = await api.adminPing(host)
    setPingResult(data.output || data.error || '')
  }

  async function runFile(e) {
    e.preventDefault()
    const { data } = await api.adminFile(file)
    setFileResult(data.content || data.error || '')
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Admin Panel</h2>
        <p className="muted">This page only hid itself from the nav bar for non-admins client-side — the APIs below have no real auth check.</p>
        <table>
          <thead>
            <tr><th>ID</th><th>Username</th><th>Email</th><th>Admin</th><th>SSN</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td><td>{u.username}</td><td>{u.email}</td>
                <td>{u.is_admin ? 'Yes' : 'No'}</td><td>{u.ssn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Network Diagnostic</h3>
        <form onSubmit={runPing}>
          <label>Host</label>
          <input type="text" value={host} onChange={(e) => setHost(e.target.value)} />
          <button type="submit">Ping</button>
        </form>
        {pingResult && <pre style={{ whiteSpace: 'pre-wrap' }}>{pingResult}</pre>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Download Report</h3>
        <form onSubmit={runFile}>
          <label>File name</label>
          <input type="text" value={file} onChange={(e) => setFile(e.target.value)} />
          <button type="submit">Fetch</button>
        </form>
        {fileResult && <pre style={{ whiteSpace: 'pre-wrap' }}>{fileResult}</pre>}
      </div>
    </>
  )
}
