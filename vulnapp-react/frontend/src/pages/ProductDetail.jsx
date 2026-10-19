import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, describeError } from '../api'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [comments, setComments] = useState([])
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  async function load() {
    setLoading(true)
    const { ok, data } = await api.getProduct(id)
    if (ok && data.product) {
      setProduct(data.product)
      setComments(Array.isArray(data.comments) ? data.comments : [])
      setError('')
    } else {
      setProduct(null)
      setComments([])
      setError(describeError(data, 'Could not load this product.'))
    }
    setLoading(false)
  }

  useEffect(() => { setProduct(null); load() }, [id])

  async function submitComment(e) {
    e.preventDefault()
    setError('')
    setPosting(true)
    try {
      const result = await api.addComment(id, author || 'anonymous', body)
      if (result.ok) {
        setAuthor('')
        setBody('')
        await load()
      } else {
        setError(describeError(result.data, 'Could not post comment.'))
      }
    } finally {
      setPosting(false)
    }
  }

  if (loading && !product) return <p className="muted">Loading product details…</p>
  if (!product) return <div className="card"><div className="error" role="alert">{error || 'Product not found.'}</div></div>

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{product.name}</h2>
        <p className="muted">{product.description}</p>
        <div className="price">${Number(product.price).toFixed(2)}</div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Customer comments</h3>
        {error && <div className="error" role="alert">{error}</div>}
        {comments.length === 0 && <p className="muted">No comments yet.</p>}
        {comments.map((c) => (
          <div className="comment" key={c.id}>
            <strong>{c.author}</strong>
            {/* VULN: stored XSS (CWE-79). The comment body comes straight
                from the API with no sanitization and is rendered with
                dangerouslySetInnerHTML. NOTE: browsers do not execute <script>
                tags inserted via innerHTML, so use an event-handler payload
                such as <img src=x onerror=alert(1)>. */}
            <div dangerouslySetInnerHTML={{ __html: c.body }} />
          </div>
        ))}

        <h4>Add a comment</h4>
        <form onSubmit={submitComment}>
          <label htmlFor="comment-author">Name</label>
          <input id="comment-author" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" />
          <label htmlFor="comment-body">Comment</label>
          <textarea id="comment-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write something..." required />
          <button type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post Comment'}</button>
        </form>
      </div>
    </>
  )
}
