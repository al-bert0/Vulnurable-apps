// Deliberately vulnerable training app: the demo session and API flaws are retained.
//
// API base URL:
//  - local dev: '/api' (Vite proxies it to Django on :8000, see vite.config.js)
//  - deployed frontend (e.g. Vercel): set VITE_API_BASE to the full backend URL,
//    for example  VITE_API_BASE=https://my-backend.example.com/api
const BASE = String(import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '')

const SESSION_KEY = 'shopease_user'
const SESSION_EVENT = 'shopease-session'

function notifySessionChanged() {
  try { window.dispatchEvent(new Event(SESSION_EVENT)) } catch { /* ignore */ }
}

export const SESSION_CHANGED_EVENT = SESSION_EVENT

export function saveSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch (error) {
    console.warn('Could not save demo session:', error)
  }
  notifySessionChanged()
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const user = JSON.parse(raw)
    return user && typeof user === 'object' ? user : null
  } catch {
    // A manually edited or stale value should not crash the entire UI.
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    return null
  }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  notifySessionChanged()
}

export function isAdmin() {
  const user = getSession()
  return !!(user && user.is_admin)
}

// Turn a non-JSON response (usually Django's DEBUG HTML error page, or the SPA's
// own index.html when the API is not reachable) into a short readable message.
// NOTE: the Django DEBUG exception text is intentionally still shown (info leak lab).
function summarizeText(text, status) {
  const raw = String(text || '')
  if (/<div id=["']root["']/.test(raw)) {
    return (
      'The API URL returned the frontend page instead of JSON, so the Django backend is not ' +
      'reachable from here. Locally: start the backend on port 8000. Deployed: set VITE_API_BASE ' +
      'to your backend URL (e.g. https://your-backend/api) and redeploy.'
    )
  }
  if (/<html|<!doctype/i.test(raw)) {
    const stripped = raw
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return `HTTP ${status}: ${stripped.slice(0, 600) || 'unexpected HTML response'}`
  }
  return raw.trim().slice(0, 1200) || `HTTP ${status}: empty response`
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }

  let res
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: 'Cannot reach the API. Check that the Django backend is running on port 8000 (or that VITE_API_BASE is correct).' },
    }
  }

  let data
  try {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      data = await res.json()
    } else {
      data = { error: summarizeText(await res.text(), res.status) }
    }
  } catch {
    data = { error: `The API sent an unreadable response (HTTP ${res.status}).` }
  }

  // Callers do data.error / data.product / etc., so never hand them null or a bare primitive.
  if (data === null || typeof data !== 'object') data = { value: data }

  return { ok: res.ok, status: res.status, data }
}

// Build one human-readable message out of the different error shapes the API returns
// ({error}, {detail}, DRF field errors like {email: ["..."]}).
export function describeError(data, fallback = 'Something went wrong.') {
  if (!data || typeof data !== 'object') return fallback
  if (typeof data.error === 'string' && data.error) return data.error
  if (typeof data.detail === 'string' && data.detail) return data.detail
  const parts = Object.entries(data)
    .filter(([key]) => key !== 'success' && key !== 'query')
    .flatMap(([key, value]) => {
      const text = Array.isArray(value) ? value.map(String).join(' ') : typeof value === 'string' ? value : ''
      return text ? [`${key}: ${text}`] : []
    })
  return parts.length ? parts.join(' ') : fallback
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
