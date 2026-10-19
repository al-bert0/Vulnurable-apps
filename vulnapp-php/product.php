<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/session_check.php';

$id = (int)($_GET['id'] ?? 0);
$uploadMsg = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'comment') {
    $author = $_POST['author'] ?? 'anonymous';
    $body = $_POST['body'] ?? '';
    $stmt = get_db()->prepare("INSERT INTO comments (product_id, author, body) VALUES (?, ?, ?)");
    // VULN: CWE-352 — no CSRF token on this state-changing form.
    $stmt->execute([$id, $author, $body]);
    header("Location: /product.php?id=$id");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['avatar'])) {
    // VULN: CWE-434 — Unrestricted File Upload. No extension allowlist, no
    // MIME re-check, no randomized filename: the original filename (and
    // extension) from the client is trusted outright. Uploading a file
    // named shell.php containing a one-line PHP system() call as the
    // "image" content drops a working webshell straight into a
    // web-reachable directory. Combine with admin.php's LFI (?page=) to
    // execute it even if this folder weren't directly web-accessible.
    $name = basename($_FILES['avatar']['name']); // no sanitization beyond basename()
    $dest = UPLOAD_DIR . $name;
    if (move_uploaded_file($_FILES['avatar']['tmp_name'], $dest)) {
        $uploadMsg = "Uploaded to /uploads/$name";
    } else {
        $uploadMsg = "Upload failed.";
    }
}

$stmt = get_db()->prepare("SELECT * FROM products WHERE id = ?");
$stmt->execute([$id]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

$stmt = get_db()->prepare("SELECT * FROM comments WHERE product_id = ?");
$stmt->execute([$id]);
$comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

$page_title = $product['name'] ?? 'Product';
require __DIR__ . '/includes/header.php';
?>
<?php if ($product): ?>
<div class="card">
  <h2 style="margin-top:0;"><?= htmlspecialchars($product['name']) ?></h2>
  <p class="muted"><?= htmlspecialchars($product['description']) ?></p>
  <div class="price">$<?= htmlspecialchars((string)$product['price']) ?></div>
</div>

<div class="card">
  <h3 style="margin-top:0;">Comments</h3>
  <?php if (empty($comments)): ?>
    <p class="muted">No comments yet.</p>
  <?php else: foreach ($comments as $c): ?>
    <div class="comment">
      <strong><?= htmlspecialchars($c['author']) ?></strong>
      <!-- VULN: CWE-79 — comment body echoed with NO escaping -> stored XSS -->
      <div><?= $c['body'] ?></div>
    </div>
  <?php endforeach; endif; ?>

  <h4>Add a comment</h4>
  <form method="POST" action="/product.php?id=<?= (int)$id ?>">
    <input type="hidden" name="action" value="comment">
    <label>Name</label>
    <input type="text" name="author" placeholder="Your name">
    <label>Comment</label>
    <textarea name="body" rows="3" placeholder="Write something..."></textarea>
    <button type="submit">Post Comment</button>
  </form>
</div>

<div class="card">
  <h3 style="margin-top:0;">Upload a product photo</h3>
  <?php if ($uploadMsg): ?><p class="muted"><?= htmlspecialchars($uploadMsg) ?></p><?php endif; ?>
  <form method="POST" action="/product.php?id=<?= (int)$id ?>" enctype="multipart/form-data">
    <input type="file" name="avatar">
    <button type="submit">Upload</button>
  </form>
</div>
<?php else: ?>
  <p class="muted">Product not found.</p>
<?php endif; ?>
<?php require __DIR__ . '/includes/footer.php'; ?>
