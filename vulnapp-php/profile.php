<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/session_check.php';

// VULN: CWE-639 — IDOR. No check that the logged-in user matches $id.
$id = $_GET['id'] ?? 0;
$stmt = get_db()->prepare("SELECT id, username, email, ssn, is_admin FROM users WHERE id = ?");
$stmt->execute([$id]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

$page_title = 'Profile';
require __DIR__ . '/includes/header.php';
?>
<div class="card" style="max-width:480px;">
  <h2 style="margin-top:0;">User Profile</h2>
  <?php if ($profile): ?>
    <p><strong>ID:</strong> <?= htmlspecialchars($profile['id']) ?></p>
    <p><strong>Username:</strong> <?= htmlspecialchars($profile['username']) ?></p>
    <p><strong>Email:</strong> <?= htmlspecialchars($profile['email']) ?></p>
    <p><strong>SSN:</strong> <?= htmlspecialchars($profile['ssn']) ?></p>
    <p><strong>Admin:</strong> <?= $profile['is_admin'] ? 'Yes' : 'No' ?></p>
    
  <?php else: ?>
    <p class="muted">User not found.</p>
  <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
