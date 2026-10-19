import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSession, isAdmin, SESSION_CHANGED_EVENT } from '../api'

export default function Nav() {
  const navigate = useNavigate()
  useLocation() // re-render on every route change so the links reflect the current session
  const [, setTick] = useState(0)
  const user = getSession()

  // Re-render when the session changes (login, logout, profile update, other tab).
  useEffect(() => {
    const refresh = () => setTick((n) => n + 1)
    window.addEventListener(SESSION_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  function logout() {
    clearSession()
    navigate('/login')
  }

  return (
    <nav>
      <div className="brand">🛒 ShopEase</div>
      <div>
        <Link to="/products">Products</Link>
        {user && user.id != null && <Link to={`/profile/${user.id}`}>My Profile</Link>}
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
