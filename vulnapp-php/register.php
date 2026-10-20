<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/session_check.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm  = $_POST['confirm'] ?? '';
    $email    = trim($_POST['email'] ?? '');

    if ($username === '' || $password === '') {
        $error = 'Username and password are required.';
    } elseif ($password !== $confirm) {
        $error = 'Passwords do not match.';
    } else {
        $stmt = get_db()->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            // VULN: CWE-204 — user enumeration, distinct message for an existing name.
            $error = "Username '$username' is already taken.";
        } else {
            // VULN: CWE-915 — mass assignment. is_admin/ssn are not on the HTML
            // form, but the backend trusts ANY POST field with these names, so a
            // raw request can self-register as an admin:
            //   curl -X POST http://127.0.0.1:8081/register.php \
            //     -d "username=evil&password=1&confirm=1&is_admin=1&ssn=111-11-1111"
            $isAdmin = isset($_POST['is_admin']) ? 1 : 0;
            $ssn = $_POST['ssn'] ?? '';

            // VULN: CWE-256 / CWE-521 — plaintext password storage, no password
            // policy, no rate limiting / CAPTCHA, no email verification.
            $stmt = get_db()->prepare(
                "INSERT INTO users (username, password, email, is_admin, ssn) VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([$username, $password, $email, $isAdmin, $ssn]);
            $newId = get_db()->lastInsertId();

            // Auto-login after registration, same plain session as login.php.
            $_SESSION['user_id'] = $newId;
            $_SESSION['username'] = $username;
            $_SESSION['is_admin'] = (bool)$isAdmin;

            header('Location: /products.php');
            exit;
        }
    }
}

$page_title = 'Register';
require __DIR__ . '/includes/header.php';
?>
<div class="card" style="max-width:380px;margin:40px auto;">
  <h2 style="margin-top:0;">Create your ShopEase account</h2>
  <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <form method="POST" action="/register.php">
    <label>Username</label>
    <input type="text" name="username" placeholder="username" required>
    <label>Email</label>
    <input type="text" name="email" placeholder="email">
    <label>Password</label>
    <input type="password" name="password" placeholder="password" required>
    <label>Confirm password</label>
    <input type="password" name="confirm" placeholder="confirm password" required>
    <button type="submit">Create account</button>
  </form>
  <p class="muted">Already have an account? <a href="/login.php">Sign in</a></p>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
