// VULN: the "session" is just the full user object (including plaintext
// password and SSN returned by the API) cached in localStorage. Any XSS
// anywhere on the site (see the comments page) can read this directly —
// there is no httpOnly cookie, no token scoping, nothing.
const BASE = '/api'

export function saveSession(user) {
  localStorage.setItem('shopease_user', JSON.stringify(user))
}

export function getSession() {
  const raw = localStorage.getItem('shopease_user')
  return raw ? JSON.parse(raw) : null
}

export function clearSession() {
  localStorage.removeItem('shopease_user')
}

// VULN: the frontend decides whether to show the Admin nav link / page
// purely from this client-controlled localStorage flag. The backend API
// has no server-side check either (see /api/admin/*), so this is only a
// cosmetic gate, not real access control — defense-in-depth is absent on
// both ends.
export function isAdmin() {
  const user = getSession()
  return !!(user && user.is_admin)
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export const api = {
  login: (username, password) =>
    request('/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  searchProducts: (q) => request(`/products/search/?q=${encodeURIComponent(q)}`),
  listProducts: () => request('/products/'),
  getProduct: (id) => request(`/products/${id}/`),
  addComment: (id, author, body) =>
    request(`/products/${id}/comments/`, { method: 'POST', body: JSON.stringify({ author, body }) }),
  getProfile: (id) => request(`/profile/${id}/`),
  updateProfile: (id, fields) =>
    request(`/profile/${id}/`, { method: 'PATCH', body: JSON.stringify(fields) }),
  adminUsers: () => request('/admin/users/'),
  adminPing: (host) => request('/admin/ping/', { method: 'POST', body: JSON.stringify({ host }) }),
  adminFile: (file) => request(`/admin/files/?file=${encodeURIComponent(file)}`),
}
