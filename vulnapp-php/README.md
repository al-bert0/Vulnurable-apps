# ShopEase (PHP)

A normal-looking 5-page shop built in plain PHP + PDO/SQLite (no framework) as an intentionally vulnerable target for security/API testing practice.

⚠️ **For local, authorized testing only.** Do not deploy publicly, do not use real data.

## Pages
1. `login.php` — SQL injection auth bypass + insecure deserialization ("remember me" cookie → PHP Object Injection)
2. `products.php` — UNION-based SQL injection
3. `profile.php?id=` — IDOR
4. `product.php?id=` — stored XSS (comments) + unrestricted file upload
5. `admin.php` — broken access control, local file inclusion, OS command injection
6. `register.php` — mass assignment (register as admin), user enumeration, no password policy

The file upload (page 4) and the LFI (page 5) chain together into full remote code execution — see **VULNERABILITIES.md** for the exact walkthrough, plus curl commands and CWE ids for every bug.

## Setup
Needs PHP 8.x with the `sqlite3`/`pdo_sqlite` extension (commonly `php-sqlite3` on Debian/Ubuntu).
```bash
php -S 127.0.0.1:8081
```
Visit `http://127.0.0.1:8081`. `vulnapp.db` is created and seeded automatically on first request; delete it to reset.

Demo logins: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

Register a new account at `/register.php`.

Make sure the `uploads/` folder is writable by the PHP process (`chmod 755 uploads` is enough on most local setups).


## Testing locally
```bash
cd vulnapp-php
php -S 127.0.0.1:8081
```
Open `http://127.0.0.1:8081/register.php` in a browser, or test the API directly:
```bash
# normal registration (auto-logs in, redirects to /products.php)
curl -i -X POST http://127.0.0.1:8081/register.php \
  -d "username=testuser&password=1234&confirm=1234&email=t@x.com"

# mass-assignment exploit: is_admin isn't on the form but the backend trusts it anyway
curl -i -X POST http://127.0.0.1:8081/register.php \
  -d "username=evil&password=1&confirm=1&is_admin=1&ssn=111-11-1111"

# registering an existing username -> user enumeration
curl -i -X POST http://127.0.0.1:8081/register.php \
  -d "username=alice&password=x&confirm=x"
```
Delete `vulnapp.db` any time to reset to the seeded demo data.

## Deploying
This is a single PHP app (server-rendered pages + a SQLite file + an `uploads/` folder it writes
to), not a split frontend/API like the other editions — so it deploys as **one service**, and
**Railway (not Vercel)** is the right target: Vercel's PHP support is unofficial and its functions
are stateless/ephemeral, which breaks the SQLite file, the uploads/LFI/RCE chain, and sessions —
all of which need a normal always-on filesystem and process, which Railway provides.

### Railway
A `Dockerfile` is included (installs PHP's `pdo_sqlite` extension and runs the built-in PHP server
on Railway's `$PORT`). From the `vulnapp-php` folder:
```bash
railway init      # first time only
railway up
```
Railway builds the Dockerfile and gives you a `https://<name>.up.railway.app` URL — open
`/register.php` there once it's deployed.

**This app is a full RCE lab (arbitrary file upload + LFI + OS command injection) with no login
required to reach any of it.** Don't share the Railway URL publicly, and remove/pause the service
when you're done testing. Every redeploy or restart wipes `vulnapp.db` and `uploads/` and reseeds
the demo data, since Railway's filesystem isn't meant to persist file writes across deploys —
that's expected here, not a bug.
