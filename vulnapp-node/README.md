# ShopEase (Node.js / Express)

A normal-looking 5-page shop built with Express + EJS (server-rendered) and a JWT-in-a-cookie "session" — intentionally vulnerable, for security/API testing practice.

⚠️ **For local, authorized testing only.** Do not deploy publicly, do not use real data.

## Pages
1. `/login` — SQL injection auth bypass + a JWT that's decoded but never signature-verified
2. `/products` — UNION-based SQL injection
3. `/profile/:id` — IDOR + prototype pollution via an unsafe settings merge
4. `/product/:id` — stored XSS (comments rendered with EJS's unescaped tag)
5. `/admin` — broken access control, OS command injection, `eval()`-based code injection

Full exploit commands, CWE ids, and fixes for every one: **VULNERABILITIES.md**

## Setup
Requires Node.js 22.5+ (uses the built-in `node:sqlite` module — no native build step, no separate database server needed).
```bash
npm install
npm start
```
Visit `http://127.0.0.1:3000`. `vulnapp.db` is dropped and reseeded every time the server starts, so you always get a clean state.

Demo logins: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`
