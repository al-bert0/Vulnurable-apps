import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [comments, setComments] = useState([])
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')

  async function load() {
    const { ok, data } = await api.getProduct(id)
    if (ok) {
      setProduct(data.product)
      setComments(data.comments)
    }
  }

  useEffect(() => { load() }, [id])

  async function submitComment(e) {
    e.preventDefault()
    await api.addComment(id, author || 'anonymous', body)
    setAuthor('')
    setBody('')
    load()
  }

  if (!product) return <p className="muted">Loading...</p>

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{product.name}</h2>
        <p className="muted">{product.description}</p>
        <div className="price">${Number(product.price).toFixed(2)}</div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Comments</h3>
        {comments.length === 0 && <p className="muted">No comments yet.</p>}
        {comments.map((c) => (
          <div className="comment" key={c.id}>
            <strong>{c.author}</strong>
            {/* VULN: stored XSS (CWE-79). The comment body comes straight
                from the API with no sanitization and is rendered with
                dangerouslySetInnerHTML, so a posted <script> tag executes
                for every later visitor of this page. */}
            <div dangerouslySetInnerHTML={{ __html: c.body }} />
          </div>
        ))}

        <h4>Add a comment</h4>
        <form onSubmit={submitComment}>
          <label>Name</label>
          <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" />
          <label>Comment</label>
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write something..." />
          <button type="submit">Post Comment</button>
        </form>
      </div>
    </>
  )
}
