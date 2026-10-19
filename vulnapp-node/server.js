/**
 * VULNAPP — ShopEase (Node.js / Express edition)
 * FOR LOCAL SECURITY-TESTING USE ONLY — see VULNERABILITIES.md.
 *
 * Same 5-page shop as the other editions, rebuilt with Node/JS-specific
 * footguns layered on top of the usual SQLi/XSS/IDOR/command-injection set:
 *   - JWT "auth" that decodes but never verifies the signature (CWE-347)
 *   - Prototype pollution via an unsafe recursive merge (CWE-1321)
 *   - eval()-based server-side code injection in a "coupon calculator" (CWE-95)
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { db, seed } = require('./db');

const app = express();
const PORT = 3000;

// VULN: CWE-798 — hardcoded JWT secret checked into source.
const JWT_SECRET = 'shopease-super-secret-2024';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const upload = multer({ dest: UPLOAD_DIR }); // VULN: no file type / size restriction

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(path.join(__dirname, 'vulnapp.db'))) {
  seed();
} else {
  seed(); // always reseed fresh for repeatable testing, like the other editions
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
function currentUser(req) {
  const token = req.cookies.token;
  if (!token) return null;
  try {
    // VULN: CWE-347 — jwt.decode() reads the payload WITHOUT verifying the
    // signature at all (that's jwt.verify's job, and it's never called).
    // Anyone can hand-craft a token with any payload — including
    // {"is_admin": true} — using any algorithm (or "none"), and this
    // middleware will trust it completely.
    const payload = jwt.decode(token);
    return payload;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PAGE 1: Login — SQL injection (auth bypass)
// ---------------------------------------------------------------------------
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  // VULN: CWE-89 — string-built SQL. Try username:  admin' --
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  let user;
  try {
    user = db.prepare(query).get();
  } catch (e) {
    return res.render('login', { error: `DB error: ${e.message}` }); // VULN: CWE-209
  }
  if (user) {
    // Token is properly *signed* here — the vulnerability is that nothing
    // downstream ever checks the signature (see currentUser above), so
    // signing it correctly on login doesn't actually protect anything.
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: !!user.is_admin }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: false }); // VULN: no httpOnly in spirit of the demo is moot since decode() ignores sig anyway; also no secure flag
    return res.redirect('/products');
  }
  res.render('login', { error: 'Invalid username or password.' });
});

app.post('/api/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  try {
    const user = db.prepare(query).get();
    if (user) {
      const token = jwt.sign({ id: user.id, username: user.username, is_admin: !!user.is_admin }, JWT_SECRET);
      return res.json({ success: true, token, user }); // VULN: leaks plaintext password + ssn
    }
    return res.status(401).json({ success: false });
  } catch (e) {
    return res.status(500).json({ error: e.message, query });
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// ---------------------------------------------------------------------------
// PAGE 2: Product search — SQL injection (UNION-based)
// ---------------------------------------------------------------------------
function searchProducts(q) {
  // VULN: CWE-89 — unparameterized LIKE clause.
  // Try: ' UNION SELECT id,username,password,email,is_admin,ssn FROM users--
  const query = `SELECT id, name, description, price FROM products WHERE name LIKE '%${q}%'`;
  return db.prepare(query).all();
}

app.get('/products', (req, res) => {
  const q = req.query.q || '';
  let items = [], error = null;
  try {
    items = q ? searchProducts(q) : db.prepare('SELECT * FROM products').all();
  } catch (e) {
    error = e.message;
  }
  res.render('products', { items, error, q, user: currentUser(req) });
});

app.get('/api/products', (req, res) => {
  const q = req.query.q || '';
  try {
    const items = q ? searchProducts(q) : db.prepare('SELECT * FROM products').all();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// PAGE 3: Profile — IDOR + Prototype Pollution via unsafe merge
// ---------------------------------------------------------------------------
function unsafeMerge(target, source) {
  // VULN: CWE-1321 — naive recursive merge with no guard against
  // "__proto__" / "constructor" / "prototype" keys. A PATCH body of
  // {"__proto__": {"is_admin": true}} walks straight onto Object.prototype,
  // polluting EVERY object in the process from then on.
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (typeof target[key] !== 'object' || target[key] === null) target[key] = {};
      unsafeMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

app.get('/profile/:id', (req, res) => {
  // VULN: CWE-639 — IDOR, no ownership check against the logged-in user.
  const user = db.prepare(`SELECT id, username, email, ssn, is_admin FROM users WHERE id = ${req.params.id}`).get();
  res.render('profile', { profile: user, user: currentUser(req) });
});

app.get('/api/profile/:id', (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ${req.params.id}`).get();
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});

app.patch('/api/profile/:id/settings', (req, res) => {
  // "Update display settings" — looks harmless, but merges the whole body
  // (unsanitized) into a plain object with the vulnerable merge above.
  const settings = unsafeMerge({}, req.body);
  res.json({ ok: true, settings });
});

// Diagnostic endpoint proving pollution landed on Object.prototype globally.
app.get('/api/_debug/prototype-check', (req, res) => {
  const freshObject = {};
  res.json({ polluted_is_admin: freshObject.is_admin === true, object: freshObject });
});

// ---------------------------------------------------------------------------
// PAGE 4: Product detail & comments — Stored XSS (unescaped EJS output)
// ---------------------------------------------------------------------------
app.get('/product/:id', (req, res) => {
  const product = db.prepare(`SELECT * FROM products WHERE id = ${req.params.id}`).get();
  const comments = db.prepare(`SELECT * FROM comments WHERE product_id = ${req.params.id}`).all();
  res.render('product_detail', { product, comments, user: currentUser(req) });
});

app.post('/product/:id/comments', (req, res) => {
  // VULN: CWE-352 — no CSRF token on this state-changing form.
  const { author = 'anonymous', body = '' } = req.body;
  db.prepare('INSERT INTO comments (product_id, author, body) VALUES (?, ?, ?)').run(req.params.id, author, body);
  res.redirect(`/product/${req.params.id}`);
});
// VULN (template-side, see views/product_detail.ejs): comment body is
// rendered with EJS's unescaped <%- %> tag instead of <%= %>, so a posted
// <script> tag executes for every later visitor -> CWE-79.

// ---------------------------------------------------------------------------
// PAGE 5: Admin — broken access control, command injection, code injection
// ---------------------------------------------------------------------------
app.get('/admin', (req, res) => {
  // VULN: CWE-284 — "access control" built on the same unverified JWT
  // decode, which is itself escalatable via the prototype-pollution bug
  // above (polluting Object.prototype.is_admin makes a FRESH, unsigned
  // object look admin too, in code elsewhere that does `{...req.user}`
  // style spreads over defaults).
  const user = currentUser(req);
  const users = db.prepare('SELECT id, username, email, is_admin, ssn FROM users').all();
  res.render('admin', { users, user });
});

app.get('/api/admin/users', (req, res) => {
  // VULN: no auth check at all on this API route.
  res.json(db.prepare('SELECT * FROM users').all());
});

app.post('/api/admin/ping', (req, res) => {
  // VULN: CWE-78 — OS command injection via string-concatenated shell command.
  // Try: {"host": "127.0.0.1; cat /etc/passwd"}
  const host = req.body.host || '127.0.0.1';
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    res.json({ output: stdout + stderr + (err ? `\n${err.message}` : '') });
  });
});

app.post('/api/admin/coupon-preview', (req, res) => {
  /**
   * "Live coupon preview" — lets an admin type a small formula like
   * "price * 0.9" to preview a discount. VULN: CWE-95 — Code Injection.
   * The expression is run through eval() with the request body spliced
   * in directly, so it's full arbitrary JavaScript execution, not just
   * arithmetic. Node's process has filesystem/network/child_process
   * access, so this is RCE.
   * Try: {"price": 100, "formula": "require('child_process').execSync('id').toString()"}
   */
  const { price = 0, formula = 'price' } = req.body;
  try {
    // eslint-disable-next-line no-eval
    const result = eval(formula); // VULN
    res.json({ result: String(result) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`ShopEase (Node) listening on http://127.0.0.1:${PORT}`);
});
