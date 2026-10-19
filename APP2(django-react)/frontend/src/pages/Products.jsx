import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Products() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

  async function load(query) {
    setError(null)
    const { ok, data } = query
      ? await api.searchProducts(query)
      : await api.listProducts()
    if (ok) setItems(Array.isArray(data) ? data : [])
    else setError(data.error || 'Search failed')
  }

  useEffect(() => { load('') }, [])

  function handleSubmit(e) {
    e.preventDefault()
    load(q)
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Browse Products</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit">Search</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="product-grid">
        {items.length === 0 && <p className="muted">No products found.</p>}
        {items.map((p, i) => (
          <div className="product" key={p.id ?? i}>
            <h3><Link to={`/product/${p.id}`}>{p.name}</Link></h3>
            <p className="muted">{p.description}</p>
            <div className="price">${typeof p.price === 'number' ? p.price.toFixed(2) : p.price}</div>
          </div>
        ))}
      </div>
    </>
  )
}
