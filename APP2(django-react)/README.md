# ShopEase (Django + React edition)

A normal-looking 5-page shop — Django REST Framework API + React (Vite) SPA — built **on purpose** as a vulnerable target for API-testing and security-testing practice.

⚠️ **For local, authorized testing only.** Do not deploy publicly, do not use real data.

## Pages
1. Login — SQL injection auth bypass
2. Product search — UNION-based SQL injection
3. Profile — IDOR + mass assignment (self-promote to admin)
4. Product detail / comments — stored XSS (`dangerouslySetInnerHTML`) + CSRF
5. Admin — broken access control, OS command injection, path traversal
6. Register — mass assignment (register as admin), user enumeration, no password policy

Full exploit commands, CWE ids, and fixes for every one: **VULNERABILITIES.md**

## Setup

### Backend (Django API — port 8000)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed       # optional: wipes and reseeds demo data (migrate already seeds it)
python manage.py runserver 127.0.0.1:8000
```

### Frontend (React/Vite — port 5173)
```bash
cd frontend
npm install
npm run dev
```
Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api/*` to the Django backend on `:8000` (see `vite.config.js`), so start the backend first.

Django admin (all models): `http://127.0.0.1:8000/django-admin/` — `djadmin / djadmin123` (also reachable via the Vite port at `/django-admin/`).

Register a new account at `/register`.

Demo logins: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

## Notes
- Re-run `python manage.py seed` any time to reset the data to a clean state (useful after mass-assignment / XSS tests mutate it).
- `npm run build` produces a static production build in `frontend/dist/` if you'd rather serve it from Django or a static server instead of the Vite dev server.


## Polish / lab notes
The frontend now has a responsive visual system, clearer loading/error feedback, and more resilient API parsing/session handling. These are usability/runtime improvements only: documented intentional vulnerabilities remain deliberately present for isolated lab practice. Do not expose this app to the public internet or use real credentials/data.
