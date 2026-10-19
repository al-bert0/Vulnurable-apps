<?php
require __DIR__ . '/config.php';
session_destroy();
setcookie('remember', '', time() - 3600, '/');
header('Location: /login.php');
