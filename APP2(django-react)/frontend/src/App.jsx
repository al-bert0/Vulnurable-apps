import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Login from './pages/Login.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <>
      <Nav />
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/products" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/profile/:id" element={<Profile />} />
          {/* VULN: no route guard — /admin renders for anyone who visits
              it directly, regardless of session state. */}
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
      <footer>ShopEase Demo (Django + React) &mdash; Internal Test Build</footer>
    </>
  )
}
