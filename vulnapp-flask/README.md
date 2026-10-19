# ShopEase (VulnApp)

A small, normal-looking 5-page shopping site built **on purpose** as a vulnerable target for API-testing and security-testing practice.

⚠️ **For local, authorized testing only.** Do not deploy publicly, do not point it at the real internet, do not put real personal data in it.

## Pages
1. `/login` — Login (SQL injection auth bypass)
2. `/products` — Product search (UNION-based SQL injection)
3. `/profile/<id>` — User profile (IDOR)
4. `/product/<id>` — Product detail + comments (stored XSS, no CSRF)
5. `/admin` — Admin panel (broken access control, command injection)

Every page has a matching JSON API route under `/api/...` for tool-based testing (Postman, curl, sqlmap, Burp).

## Setup
```bash
pip install flask
python3 app.py
```
Visit `http://127.0.0.1:5000`. The SQLite DB (`vulnapp.db`) is dropped and reseeded every time the app starts, so you always get a clean state.

Demo logins: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

## Full vulnerability list + exploit commands
See **VULNERABILITIES.md** — it has the exact curl command for every flaw, the CWE classification, and the fix.


## Polish / lab notes
The interface has been refreshed for responsive layouts and clearer form states. Intentional security weaknesses documented in `VULNERABILITIES.md` are retained for isolated, authorized lab practice. Do not expose this app to the public internet or use real credentials/data.
