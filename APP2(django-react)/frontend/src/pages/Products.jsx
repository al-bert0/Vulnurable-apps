import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, describeError } from '../api'

// Show a normal price as $12.34, but fall back to the raw value when it is not a number.
// (A UNION-injected search puts other columns, e.g. emails/passwords, in the price slot —
// the raw value stays visible so the lab exploit is easy to see.)
function formatPrice(value) {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return String(value ?? '')
  return `$${n.toFixed(2)}`
}

export default function Products() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load(query) {
    setLoading(true)
    setError('')
    try {
      const { ok, status, data } = query
        ? await api.searchProducts(query)
        : await api.listProducts()
      if (ok) {
        setItems(Array.isArray(data) ? data : [])
      } else {
        setItems([])
        setError(describeError(data, `Could not load products (HTTP ${status || 'network error'}).`))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('').catch(() => setError('Could not load products.')) }, [])

  function handleSubmit(e) {
    e.preventDefault()
    load(q).catch(() => setError('Search failed. Please try again.'))
  }

  return (
    <>
      <section className="card">
        <p className="muted" style={{ margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>ShopEase catalogue</p>
        <h2>Find your next favourite</h2>
        <p className="muted">Browse the demo catalogue or search by product name.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="product-search">Product search</label>
          <input id="product-search" type="text" placeholder="Try “keyboard” or “mouse”..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search products'}</button>
        </form>
        {error && <div className="error" role="alert" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{error}</div>}
      </section>
      <div className="product-grid" aria-live="polite">
        {loading && items.length === 0 && <p className="muted">Loading catalogue…</p>}
        {!loading && items.length === 0 && !error && <p className="muted">No products found. Try a different search.</p>}
        {items.map((p, i) => (
          <article className="product" key={`${p.id ?? 'x'}-${i}`}>
            <p className="muted" style={{ margin: 0 }}>FEATURED PRODUCT</p>
            <h3><Link to={`/product/${p.id}`}>{String(p.name ?? '')}</Link></h3>
            <p className="muted">{String(p.description ?? '')}</p>
            <div className="price">{formatPrice(p.price)}</div>
            <p style={{ marginBottom: 0, marginTop: 16 }}><Link to={`/product/${p.id}`} className="button" style={{ textDecoration: 'none' }}>View details →</Link></p>
          </article>
        ))}
      </div>
    </>
  )
}
