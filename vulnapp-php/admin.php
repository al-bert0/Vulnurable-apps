<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/session_check.php';

// VULN: CWE-284 — "access control" that trusts a client-supplied cookie
// instead of the server-side session, and defaults to allow when absent.
$isAdminCookie = $_COOKIE['is_admin'] ?? '1';
if ($isAdminCookie !== '1') {
    http_response_code(403);
    die('Forbidden');
}
setcookie('is_admin', '1', time() + 3600, '/'); // reinforces the broken trust

$pingOutput = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['host'])) {
    // VULN: CWE-78 — OS command injection, host concatenated into a shell command.
    // Try host:  127.0.0.1; cat /etc/passwd
    $host = $_POST['host'];
    $pingOutput = shell_exec("ping -c 1 $host 2>&1");
}

$page_title = 'Admin';
require __DIR__ . '/includes/header.php';
?>
<div class="card">
  <h2 style="margin-top:0;">Admin Panel</h2>
  <p class="muted">Access is only gated by the client-side "is_admin" cookie — try editing it in devtools.</p>
  <?php
    // VULN: CWE-98 / CWE-22 — Local File Inclusion. The "page" parameter
    // is passed straight to include() with only a hardcoded "pages/"
    // prefix and NO validation, NO allowlist, and no extension
    // enforcement — because include() takes the path's extension as
    // written, a traversal (?page=../uploads/shell.php) reaches a file
    // OUTSIDE the pages/ folder entirely once ../ segments are used, and
    // since whatever gets included is executed as PHP, this chains
    // directly with the unrestricted upload on product.php for RCE.
    // Try: ?page=../uploads/shell.php&c=id  (after uploading shell.php there)
    // Or:  ?page=../../../../etc/passwd  (plain file disclosure)
    $page = $_GET['page'] ?? 'dashboard.php';
    $target = 'pages/' . $page;
    include $target; // VULN: unsanitized include(), no allowlist, no realpath confinement
  ?>
</div>

<div class="card">
  <h3 style="margin-top:0;">Network Diagnostic</h3>
  <form method="POST" action="/admin.php">
    <label>Host</label>
    <input type="text" name="host" value="127.0.0.1">
    <button type="submit">Ping</button>
  </form>
  <?php if ($pingOutput !== null): ?>
    <pre style="white-space:pre-wrap;"><?= htmlspecialchars($pingOutput) ?></pre>
  <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
