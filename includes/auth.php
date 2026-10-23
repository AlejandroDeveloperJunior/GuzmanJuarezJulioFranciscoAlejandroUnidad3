<?php
/* =========================================================
 *  Sesión segura, CSRF y utilidades de autenticación
 * ========================================================= */
require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_name('NFLSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,                      // JavaScript no puede leer la cookie
        'samesite' => 'Lax',                     // mitiga CSRF entre sitios
        'secure'   => !empty($_SERVER['HTTPS']), // solo HTTPS cuando esté disponible
    ]);
    session_start();
}

// Cierre automático por inactividad
if (isset($_SESSION['user_id'], $_SESSION['last_activity'])
    && time() - $_SESSION['last_activity'] > SESSION_TIMEOUT) {
    session_unset();
    session_destroy();
    session_start();
    $_SESSION['flash'] = ['warning', 'Tu sesión expiró por inactividad. Inicia sesión de nuevo.'];
}
$_SESSION['last_activity'] = time();

/** Escapa texto para HTML (protección XSS). */
function e($valor): string
{
    return htmlspecialchars((string) $valor, ENT_QUOTES, 'UTF-8');
}

function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

function flash(string $tipo, string $mensaje): void
{
    $_SESSION['flash'] = [$tipo, $mensaje];
}

function flash_get(): ?array
{
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

/* ---------- Token CSRF ---------- */
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    $enviado = $_POST['csrf'] ?? '';
    if (!is_string($enviado) || !hash_equals(csrf_token(), $enviado)) {
        http_response_code(403);
        exit('Solicitud rechazada: token CSRF inválido.');
    }
}

/* ---------- Usuario actual ---------- */
function is_logged_in(): bool
{
    return !empty($_SESSION['user_id']);
}

function current_user(): ?array
{
    if (!is_logged_in()) {
        return null;
    }
    $st = db()->prepare('SELECT id, nombre, email, api_token_hash, creado_en FROM usuarios WHERE id = ?');
    $st->execute([$_SESSION['user_id']]);
    return $st->fetch() ?: null;
}

/** Protege una página: si no hay sesión, manda al login. */
function require_login(): void
{
    if (!is_logged_in()) {
        flash('warning', 'Debes iniciar sesión para ver esa página.');
        redirect('login.php');
    }
}
