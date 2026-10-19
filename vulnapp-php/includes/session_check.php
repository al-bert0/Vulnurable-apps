<?php
/**
 * VULN: CWE-502 — the "remember me" cookie is a base64'd PHP serialize()
 * blob that gets unserialize()'d directly with no type-checking, no
 * signature, no allowlist. Because the Logger class (see config.php) is
 * always loaded, an attacker can forge a cookie that instantiates it with
 * $logFile pointed at uploads/shell.php and $logMsg containing PHP code,
 * and win arbitrary file write the moment this runs (Logger::__destruct
 * fires at the end of the request). Combine with admin.php's LFI to get RCE.
 *
 * Forge example:
 *   php -r '$o = new Logger(); // ... see VULNERABILITIES.md for the exact PoC'
 */
if (!isset($_SESSION['user_id']) && isset($_COOKIE['remember'])) {
    $data = @unserialize(base64_decode($_COOKIE['remember'])); // VULN
    if (is_array($data) && isset($data['user_id'])) {
        $_SESSION['user_id'] = $data['user_id'];
        $_SESSION['username'] = $data['username'] ?? '';
        $_SESSION['is_admin'] = $data['is_admin'] ?? false;
    }
}

function current_user() {
    if (!isset($_SESSION['user_id'])) return null;
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'] ?? '',
        'is_admin' => $_SESSION['is_admin'] ?? false,
    ];
}
