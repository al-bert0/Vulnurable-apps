<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/session_check.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    // VULN: CWE-89 — SQL injection via string concatenation.
    // Try username:  admin' --
    $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
    try {
        $stmt = get_db()->query($sql);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $error = "DB error: " . $e->getMessage(); // VULN: CWE-209 verbose error leak
        $user = null;
    }

    if ($user) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['is_admin'] = (bool)$user['is_admin'];

        if (isset($_POST['remember'])) {
            // VULN: CWE-502 — "remember me" token is just base64(serialize())
            // of an array with no HMAC/signature, trivially forgeable, and
            // unserialize()'d back on a later request in session_check.php.
            $token = base64_encode(serialize([
                'user_id' => $user['id'],
                'username' => $user['username'],
                'is_admin' => (bool)$user['is_admin'],
            ]));
            setcookie('remember', $token, time() + 86400 * 30, '/');
        }

        header('Location: /products.php');
        exit;
    } elseif (!$error) {
        $error = "Invalid username or password.";
    }
}

$page_title = 'Sign In';
require __DIR__ . '/includes/header.php';
?>
<div class="card" style="max-width:380px;margin:40px auto;">
  <h2 style="margin-top:0;">Sign in to ShopEase</h2>
  <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <form method="POST" action="/login.php">
    <label>Username</label>
    <input type="text" name="username" placeholder="username" required>
    <label>Password</label>
    <input type="password" name="password" placeholder="password" required>
    <label style="display:flex;align-items:center;gap:6px;font-weight:400;">
      <input type="checkbox" name="remember" style="width:auto;margin:0;"> Remember me
    </label>
    <button type="submit">Sign In</button>
  </form>
  
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
