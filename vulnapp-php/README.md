# ShopEase (PHP)

A normal-looking 5-page shop built in plain PHP + PDO/SQLite (no framework) as an intentionally vulnerable target for security/API testing practice.

⚠️ **For local, authorized testing only.** Do not deploy publicly, do not use real data.

## Pages
1. `login.php` — SQL injection auth bypass + insecure deserialization ("remember me" cookie → PHP Object Injection)
2. `products.php` — UNION-based SQL injection
3. `profile.php?id=` — IDOR
4. `product.php?id=` — stored XSS (comments) + unrestricted file upload
5. `admin.php` — broken access control, local file inclusion, OS command injection

The file upload (page 4) and the LFI (page 5) chain together into full remote code execution — see **VULNERABILITIES.md** for the exact walkthrough, plus curl commands and CWE ids for every bug.

## Setup
Needs PHP 8.x with the `sqlite3`/`pdo_sqlite` extension (commonly `php-sqlite3` on Debian/Ubuntu).
```bash
php -S 127.0.0.1:8081
```
Visit `http://127.0.0.1:8081`. `vulnapp.db` is created and seeded automatically on first request; delete it to reset.

Demo logins: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

Make sure the `uploads/` folder is writable by the PHP process (`chmod 755 uploads` is enough on most local setups).
