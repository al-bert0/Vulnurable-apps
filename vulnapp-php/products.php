<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/session_check.php';

$q = $_GET['q'] ?? '';
$error = null;
$items = [];

// VULN: CWE-89 — unsanitized LIKE query, supports UNION-based injection.
// Try: ' UNION SELECT id,username,password,email,is_admin,ssn FROM users--
$sql = "SELECT id, name, description, price FROM products WHERE name LIKE '%$q%'";
try {
    $items = get_db()->query($sql)->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error = $e->getMessage();
}

$page_title = 'Products';
require __DIR__ . '/includes/header.php';
?>
<div class="card">
  <h2 style="margin-top:0;">Browse Products</h2>
  <form method="GET" action="/products.php">
    <input type="text" name="q" placeholder="Search products..." value="<?= htmlspecialchars($q) ?>">
    <button type="submit">Search</button>
  </form>
  <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
</div>
<div class="product-grid">
  <?php if (empty($items)): ?>
    <p class="muted">No products found.</p>
  <?php else: foreach ($items as $p): ?>
    <div class="product">
      <h3><a href="/product.php?id=<?= (int)$p['id'] ?>"><?= htmlspecialchars($p['name']) ?></a></h3>
      <p class="muted"><?= htmlspecialchars($p['description']) ?></p>
      <div class="price">$<?= htmlspecialchars((string)$p['price']) ?></div>
    </div>
  <?php endforeach; endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
