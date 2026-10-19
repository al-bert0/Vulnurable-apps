"""
VULNAPP — Intentionally Vulnerable Flask Application
=====================================================
FOR SECURITY TESTING / API-TESTING PRACTICE ONLY.
Do NOT deploy this anywhere public. Do NOT use real data.

This app looks like a normal small e-commerce / community site
(login, product search, user profile, comments, admin panel) but
each page/endpoint has a deliberate, realistic vulnerability so you
can practice manual testing and tools (Burp Suite, Postman, sqlmap,
OWASP ZAP, curl scripts) against it.

See VULNERABILITIES.md for a full list, how to exploit each one,
and how it should be fixed.
"""

import sqlite3
import os
import subprocess
from flask import Flask, request, render_template, g, redirect, session, jsonify, make_response

app = Flask(__name__)
app.secret_key = "supersecret123"  # VULN: hardcoded weak secret key

DB_PATH = os.path.join(os.path.dirname(__file__), "vulnapp.db")


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.executescript(
        """
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS comments;

        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,       -- VULN: plaintext password storage
            email TEXT,
            is_admin INTEGER DEFAULT 0,
            ssn TEXT             -- VULN: sensitive data exposed via IDOR
        );

        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price REAL
        );

        CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            author TEXT,
            body TEXT            -- VULN: stored XSS, rendered unescaped
        );
        """
    )
    cur.executemany(
        "INSERT INTO users (username, password, email, is_admin, ssn) VALUES (?,?,?,?,?)",
        [
            ("alice", "alice123", "alice@example.com", 0, "123-45-6789"),
            ("bob", "bobpass", "bob@example.com", 0, "987-65-4321"),
            ("admin", "admin!2024", "admin@example.com", 1, "000-00-0000"),
        ],
    )
    cur.executemany(
        "INSERT INTO products (name, description, price) VALUES (?,?,?)",
        [
            ("Wireless Mouse", "Ergonomic 2.4GHz wireless mouse", 19.99),
            ("Mechanical Keyboard", "RGB backlit mechanical keyboard", 59.99),
            ("USB-C Hub", "7-in-1 USB-C hub with HDMI", 29.99),
            ("Webcam 1080p", "Full HD webcam with autofocus", 34.99),
            ("Laptop Stand", "Aluminum adjustable laptop stand", 24.99),
        ],
    )
    cur.executemany(
        "INSERT INTO comments (product_id, author, body) VALUES (?,?,?)",
        [
            (1, "alice", "Great mouse, very responsive!"),
            (2, "bob", "Love the RGB lighting on this keyboard."),
        ],
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# PAGE 1: Login  —  VULN: SQL Injection (auth bypass) + no rate limiting
# ---------------------------------------------------------------------------
@app.route("/", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")

        # VULN: string-built SQL query -> classic SQL injection.
        # Try username:  admin' --
        query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
        db = get_db()
        try:
            cur = db.execute(query)
            user = cur.fetchone()
        except sqlite3.Error as e:
            # VULN: verbose DB error leakage
            return render_template("login.html", error=f"DB error: {e}")

        if user:
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session["is_admin"] = bool(user["is_admin"])
            return redirect("/products")
        else:
            error = "Invalid username or password."
    return render_template("login.html", error=error)


@app.route("/api/login", methods=["POST"])
def api_login():
    """JSON API twin of the login form — same SQLi, for API-testing tools."""
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    password = data.get("password", "")
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    db = get_db()
    try:
        user = db.execute(query).fetchone()
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500  # VULN: stack/error leakage
    if user:
        session["user_id"] = user["id"]
        return jsonify({"success": True, "user": dict(user)})  # VULN: leaks password hash/plaintext + ssn
    return jsonify({"success": False}), 401


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# ---------------------------------------------------------------------------
# PAGE 2: Product search  —  VULN: SQL Injection (UNION-based, data exfil)
# ---------------------------------------------------------------------------
@app.route("/products")
def products():
    q = request.args.get("q", "")
    db = get_db()
    if q:
        # VULN: unsanitized LIKE query, supports UNION-based injection
        query = f"SELECT id, name, description, price FROM products WHERE name LIKE '%{q}%'"
        try:
            rows = db.execute(query).fetchall()
        except sqlite3.Error as e:
            return render_template("products.html", items=[], error=str(e), q=q)
    else:
        rows = db.execute("SELECT id, name, description, price FROM products").fetchall()
    return render_template("products.html", items=rows, error=None, q=q)


@app.route("/api/products")
def api_products():
    """JSON API twin — try: /api/products?q=' UNION SELECT id,username,password,email FROM users--"""
    q = request.args.get("q", "")
    db = get_db()
    query = f"SELECT id, name, description, price FROM products WHERE name LIKE '%{q}%'"
    try:
        rows = db.execute(query).fetchall()
        return jsonify([dict(r) for r in rows])
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# PAGE 3: User profile  —  VULN: IDOR (Insecure Direct Object Reference)
# ---------------------------------------------------------------------------
@app.route("/profile/<int:user_id>")
def profile(user_id):
    # VULN: no check that session user_id == requested user_id
    db = get_db()
    user = db.execute("SELECT id, username, email, ssn, is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return "User not found", 404
    return render_template("profile.html", user=user)


@app.route("/api/profile/<int:user_id>")
def api_profile(user_id):
    # VULN: same IDOR, plus returns full record including ssn, with no auth check at all
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return jsonify({"error": "not found"}), 404
    return jsonify(dict(user))


# ---------------------------------------------------------------------------
# PAGE 4: Product comments  —  VULN: Stored XSS + CSRF (no token)
# ---------------------------------------------------------------------------
@app.route("/product/<int:product_id>", methods=["GET", "POST"])
def product_detail(product_id):
    db = get_db()
    if request.method == "POST":
        author = request.form.get("author", "anonymous")
        body = request.form.get("body", "")
        # VULN: no CSRF token checked, no output sanitization on render
        db.execute(
            "INSERT INTO comments (product_id, author, body) VALUES (?, ?, ?)",
            (product_id, author, body),
        )
        db.commit()
        return redirect(f"/product/{product_id}")

    product = db.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    comments = db.execute("SELECT * FROM comments WHERE product_id = ?", (product_id,)).fetchall()
    # template renders comment.body with |safe -> stored XSS
    return render_template("product_detail.html", product=product, comments=comments)


# ---------------------------------------------------------------------------
# PAGE 5: Admin panel  —  VULN: Broken access control + command injection
# ---------------------------------------------------------------------------
@app.route("/admin")
def admin():
    # VULN: "security by obscurity" - checks a client-controlled cookie,
    # not the server-side session, and defaults to allowing access.
    is_admin_cookie = request.cookies.get("is_admin", "1")  # VULN: trusts client input
    if is_admin_cookie != "1":
        return "Forbidden", 403
    db = get_db()
    users = db.execute("SELECT id, username, email, is_admin, ssn FROM users").fetchall()
    resp = make_response(render_template("admin.html", users=users))
    resp.set_cookie("is_admin", "1")  # reinforces the broken trust
    return resp


@app.route("/api/admin/ping", methods=["POST"])
def admin_ping():
    """
    'Diagnostic' endpoint that pings a host.
    VULN: OS command injection — host param concatenated into a shell command.
    Try: {"host": "127.0.0.1; cat /etc/passwd"}
    No auth check either (VULN: broken access control).
    """
    data = request.get_json(silent=True) or {}
    host = data.get("host", "127.0.0.1")
    cmd = f"ping -c 1 {host}"  # VULN: shell=True + string interpolation
    try:
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, timeout=5)
        return jsonify({"output": output.decode(errors="replace")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users", methods=["GET"])
def api_admin_users():
    # VULN: no auth check at all on a sensitive admin API
    db = get_db()
    users = db.execute("SELECT * FROM users").fetchall()
    return jsonify([dict(u) for u in users])


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        init_db()
    else:
        init_db()  # always reseed fresh on restart for repeatable testing
    app.run(host="0.0.0.0", port=5000, debug=True)  # VULN: debug=True exposes Werkzeug debugger/RCE
