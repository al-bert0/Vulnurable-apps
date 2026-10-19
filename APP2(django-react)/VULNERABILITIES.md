# ShopEase (Django + React) — Vulnerability Guide

**For authorized security testing / learning only. Run locally. Never deploy publicly or use real data.**

Same 5-page concept as the Flask edition, rebuilt as a Django REST Framework API + a separate React (Vite) single-page frontend — so you can practice testing a realistic SPA-plus-API architecture, including the frontend-specific issues that come with that split.

Demo accounts: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

---

## Page 1 — Login (`POST /api/login/`)
**SQL Injection (authentication bypass) — CWE-89**
Raw `connection.cursor()` query built with an f-string.
```
curl -X POST http://127.0.0.1:8000/api/login/ -H "Content-Type: application/json" \
  -d '{"username":"admin'"'"' --","password":"x"}'
```
Also returns plaintext password + SSN in the response, and raw SQL error text on failure.
**Fix:** parameterized queries (`cursor.execute(sql, [params])`), hash passwords, generic errors.

## Page 2 — Product search (`GET /api/products/search/?q=`)
**SQL Injection (UNION-based) — CWE-89**
```
curl "http://127.0.0.1:8000/api/products/search/?q=%27%20UNION%20SELECT%20id,username,password,email,is_admin,ssn%20FROM%20api_appuser--"
```
Dumps the whole user table through a product search box. Try `sqlmap -u "http://127.0.0.1:8000/api/products/search/?q=test"`.
**Fix:** use the Django ORM (`Product.objects.filter(name__icontains=q)`) or parameterized raw SQL.

## Page 3 — Profile (`GET/PATCH /api/profile/<id>/`)
**IDOR — CWE-639** and **Mass assignment — CWE-915**
No auth, no ownership check on GET. On PATCH, the serializer exposes every column, so a client can include `"is_admin": true` and self-promote:
```
curl -X PATCH http://127.0.0.1:8000/api/profile/1/ -H "Content-Type: application/json" -d '{"is_admin": true}'
```
**Fix:** require authentication, check `request.user.id == user_id` (or role), and use a serializer with an explicit, non-privileged field allowlist for self-service updates.

## Page 4 — Product detail & comments (`/product/<id>` in React, `POST /api/products/<id>/comments/`)
**Stored XSS — CWE-79** (frontend) and **CSRF — CWE-352** (backend)
The backend stores comment bodies raw; the React page renders them with `dangerouslySetInnerHTML`, so a posted `<script>` tag executes for every later visitor:
```
curl -X POST http://127.0.0.1:8000/api/products/1/comments/ -H "Content-Type: application/json" \
  -d '{"author":"tester","body":"<script>alert(document.cookie)</script>"}'
```
The comment endpoint is also `@csrf_exempt` and Django's `CsrfViewMiddleware` is removed globally in settings, so a malicious page could auto-submit this on a logged-in victim's behalf.
**Fix:** drop `dangerouslySetInnerHTML` (render as plain text, or sanitize with DOMPurify if HTML is genuinely needed), re-enable `CsrfViewMiddleware`, and don't exempt state-changing views.

## Page 5 — Admin (`/admin` in React, `/api/admin/users/`, `/api/admin/ping/`, `/api/admin/files/`)
**Broken access control — CWE-284**, **OS command injection — CWE-78**, **Path traversal — CWE-22**
- `/api/admin/users/` has no permission check at all — anyone gets every user's SSN and plaintext password.
- The React Admin link is hidden/shown only from a `localStorage` flag the user fully controls (`localStorage.setItem('shopease_user', JSON.stringify({is_admin:true}))` in devtools unlocks the nav link); the API behind it enforces nothing regardless.
- Command injection:
  ```
  curl -X POST http://127.0.0.1:8000/api/admin/ping/ -H "Content-Type: application/json" -d '{"host":"127.0.0.1; cat /etc/passwd"}'
  ```
- Path traversal:
  ```
  curl "http://127.0.0.1:8000/api/admin/files/?file=../vulnsite/settings.py"
  ```
**Fix:** real server-side permission classes (e.g. `IsAdminUser` backed by actual authentication), avoid `shell=True` + validate/allowlist the ping target, and resolve+confine the file path to `REPORTS_DIR` with `os.path.realpath` + a prefix check (or just an allowlist of filenames).

---

## Also present throughout
- Hardcoded Django `SECRET_KEY` (CWE-798).
- `DEBUG=True` (CWE-489) — full tracebacks, source snippets, and settings values leak on any unhandled error; try hitting `/api/login/` with malformed JSON.
- `CORS_ALLOW_ALL_ORIGINS=True` + `CORS_ALLOW_CREDENTIALS=True` (CWE-942) — any origin can call this API with credentials.
- `CsrfViewMiddleware` removed globally, plus explicit `@csrf_exempt` on top.
- Plaintext password storage (CWE-256); SSNs returned by multiple unrelated endpoints (CWE-359).
- The frontend's entire "session" is a JSON blob (including plaintext password + SSN) sitting in `localStorage` with no `httpOnly` protection — trivially readable by any XSS.

## Suggested testing workflow
1. **Manual / Burp Repeater:** browse all 5 React pages as a normal user first, then intercept and tamper with the underlying API calls (login body, `q` param, profile `id`/PATCH body, comment `body`, ping `host`, `file` param).
2. **sqlmap:** `sqlmap -u "http://127.0.0.1:8000/api/products/search/?q=test" --batch --dump`
3. **Browser devtools:** edit `localStorage.shopease_user` to grant yourself `is_admin` client-side and watch the nav link appear — then confirm the API doesn't actually check it either.
4. **ZAP active scan:** point at `http://127.0.0.1:8000/api/` (API) and `http://127.0.0.1:5173/` (SPA) separately — SPAs often need the API crawled directly since links aren't in server-rendered HTML.
