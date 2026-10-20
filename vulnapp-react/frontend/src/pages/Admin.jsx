import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Admin() {
  
  const [file, setFile] = useState('internal_notes.txt')
  const [fileResult, setFileResult] = useState('')



  async function runFile(e) {
    e.preventDefault()
    const { data } = await api.adminFile(file)
    setFileResult(data.content || data.error || '(empty file)')
  }

  return (
    <>
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
