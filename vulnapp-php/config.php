<?php
/**
 * VULNAPP (PHP edition) — config + seed data.
 * FOR LOCAL SECURITY-TESTING USE ONLY — see VULNERABILITIES.md.
 */
session_start();

// VULN: hardcoded credentials/paths, errors displayed to the client (CWE-209)
ini_set('display_errors', 1);
error_reporting(E_ALL);

define('DB_PATH', __DIR__ . '/vulnapp.db');
define('UPLOAD_DIR', __DIR__ . '/uploads/');

function get_db() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }
    return $pdo;
}

function seed_db() {
    $pdo = get_db();
    $pdo->exec("DROP TABLE IF EXISTS users");
    $pdo->exec("DROP TABLE IF EXISTS products");
    $pdo->exec("DROP TABLE IF EXISTS comments");
    $pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, email TEXT, is_admin INTEGER DEFAULT 0, ssn TEXT)");
    $pdo->exec("CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, price REAL)");
    $pdo->exec("CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, author TEXT, body TEXT)");

    $pdo->exec("INSERT INTO users (username, password, email, is_admin, ssn) VALUES
        ('alice','alice123','alice@example.com',0,'123-45-6789'),
        ('bob','bobpass','bob@example.com',0,'987-65-4321'),
        ('admin','admin!2024','admin@example.com',1,'000-00-0000')");

    $pdo->exec("INSERT INTO products (name, description, price) VALUES
        ('Wireless Mouse','Ergonomic 2.4GHz wireless mouse',19.99),
        ('Mechanical Keyboard','RGB backlit mechanical keyboard',59.99),
        ('USB-C Hub','7-in-1 USB-C hub with HDMI',29.99),
        ('Webcam 1080p','Full HD webcam with autofocus',34.99),
        ('Laptop Stand','Aluminum adjustable laptop stand',24.99)");

    $pdo->exec("INSERT INTO comments (product_id, author, body) VALUES
        (1,'alice','Great mouse, very responsive!'),
        (2,'bob','Love the RGB lighting on this keyboard.')");
}

if (!file_exists(DB_PATH)) {
    seed_db();
}

/**
 * VULN: CWE-502 — Insecure Deserialization / PHP Object Injection.
 * This class is loaded on every request (it's right here in config.php,
 * which every page includes), so it's a reachable "gadget" for any
 * unserialize() call on attacker-controlled input anywhere in the app —
 * see the "remember me" cookie handling in includes/session_check.php.
 * Its destructor writes attacker-controlled content to an
 * attacker-controlled path with no validation at all.
 */
class Logger {
    public $logFile = 'app.log';
    public $logMsg = 'default log entry';

    public function __destruct() {
        @file_put_contents($this->logFile, $this->logMsg, FILE_APPEND);
    }
}
