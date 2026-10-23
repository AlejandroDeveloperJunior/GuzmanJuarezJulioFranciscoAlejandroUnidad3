<?php
require_once __DIR__ . '/includes/auth.php';

// Solo por POST con token CSRF, para que un enlace externo no pueda cerrar la sesión
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('index.php');
}
csrf_check();

$_SESSION = [];
$p = session_get_cookie_params();
setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
session_destroy();

session_start();
flash('info', 'Sesión cerrada correctamente.');
redirect('login.php');
