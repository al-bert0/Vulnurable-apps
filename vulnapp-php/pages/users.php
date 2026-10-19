<h3 style="margin-top:0;">All Users</h3>
<table>
  <tr><th>ID</th><th>Username</th><th>Email</th><th>Admin</th><th>SSN</th></tr>
  <?php foreach (get_db()->query("SELECT * FROM users")->fetchAll(PDO::FETCH_ASSOC) as $u): ?>
  <tr>
    <td><?= htmlspecialchars($u['id']) ?></td>
    <td><?= htmlspecialchars($u['username']) ?></td>
    <td><?= htmlspecialchars($u['email']) ?></td>
    <td><?= $u['is_admin'] ? 'Yes' : 'No' ?></td>
    <td><?= htmlspecialchars($u['ssn']) ?></td>
  </tr>
  <?php endforeach; ?>
</table>
