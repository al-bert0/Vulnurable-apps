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




$page_title = 'Admin';
require __DIR__ . '/includes/header.php';
?>
<div class="card">
  <h2 style="margin-top:0;">Admin Panel</h2>
  
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


<?php require __DIR__ . '/includes/footer.php'; ?>
