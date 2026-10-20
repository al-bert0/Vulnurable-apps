import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Login from './pages/Login.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/Admin.jsx'
import Register from './pages/Register.jsx'

function NotFound() {
  const { pathname } = useLocation()
  return (
    <div className="card">
      <h2>Page not found</h2>
      <p className="muted">There is no page at <code>{pathname}</code>.</p>
      <p><Link to="/products">Back to products</Link></p>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <>
      <Nav />
      <div className="container">
        {/* key = pathname so a crashed page recovers when you navigate elsewhere */}
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/profile/:id" element={<Profile />} />
            {/* VULN: no route guard — /admin renders for anyone who visits
                it directly, regardless of session state. */}
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </div>
      <footer>ShopEase</footer>
    </>
  )
}
