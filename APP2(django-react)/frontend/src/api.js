// Deliberately vulnerable training app: the demo session and API flaws are retained.
const BASE = '/api'

export function saveSession(user) {
  try {
    localStorage.setItem('shopease_user', JSON.stringify(user))
  } catch (error) {
    console.warn('Could not save demo session:', error)
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem('shopease_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user && typeof user === 'object' ? user : null
  } catch {
    // A manually edited or stale value should not crash the entire UI.
    localStorage.removeItem('shopease_user')
    return null
  }
}

export function clearSession() {
  localStorage.removeItem('shopease_user')
}

export function isAdmin() {
  const user = getSession()
  return !!(user && user.is_admin)
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers })
    const contentType = res.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await res.json()
      : { error: (await res.text()).slice(0, 1200) }
    return { ok: res.ok, status: res.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: 'Cannot reach the API. Check that the Django backend is running on port 8000.' },
    }
  }
}

export const api = {
  login: (username, password) =>
    request('/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username, email, password) =>
    request('/register/', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  searchProducts: (q) => request(`/products/search/?q=${encodeURIComponent(q)}`),
  listProducts: () => request('/products/'),
  getProduct: (id) => request(`/products/${encodeURIComponent(id)}/`),
  addComment: (id, author, body) =>
    request(`/products/${encodeURIComponent(id)}/comments/`, { method: 'POST', body: JSON.stringify({ author, body }) }),
  getProfile: (id) => request(`/profile/${encodeURIComponent(id)}/`),
  updateProfile: (id, fields) =>
    request(`/profile/${encodeURIComponent(id)}/`, { method: 'PATCH', body: JSON.stringify(fields) }),
  adminUsers: () => request('/admin/users/'),
  adminPing: (host) => request('/admin/ping/', { method: 'POST', body: JSON.stringify({ host }) }),
  adminFile: (file) => request(`/admin/files/?file=${encodeURIComponent(file)}`),
}
