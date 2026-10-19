import { Link, useNavigate } from 'react-router-dom'
import { clearSession, getSession, isAdmin } from '../api'

export default function Nav() {
  const navigate = useNavigate()
  const user = getSession()

  function logout() {
    clearSession()
    navigate('/login')
  }

  return (
    <nav>
      <div className="brand">🛒 ShopEase</div>
      <div>
        <Link to="/products">Products</Link>
        {user && <Link to={`/profile/${user.id}`}>My Profile</Link>}
        {/* VULN: this link is only hidden/shown based on a client-side
            localStorage flag — it is not real access control. Anyone can
            navigate to /admin directly, or set is_admin in devtools. */}
        {isAdmin() && <Link to="/admin">Admin</Link>}
        {user ? (
          <a href="#" onClick={(e) => { e.preventDefault(); logout() }}>Logout</a>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
