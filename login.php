<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/recaptcha.php';

if (is_logged_in()) {
    redirect('equipos.php');
}

$error = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email    = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';

    if (!recaptcha_verify($_POST['g-recaptcha-response'] ?? null)) {
        $error = 'Confirma que no eres un robot.';
    } else {
        $st = db()->prepare('SELECT * FROM usuarios WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();

        if ($u && $u['bloqueado_hasta'] && strtotime($u['bloqueado_hasta']) > time()) {
            $min = (int) ceil((strtotime($u['bloqueado_hasta']) - time()) / 60);
            $error = "Cuenta bloqueada temporalmente por intentos fallidos. Intenta en $min minuto(s).";
        } elseif ($u && password_verify($password, $u['password_hash'])) {
            // Acceso correcto: se reinician los intentos
            db()->prepare('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?')
                ->execute([$u['id']]);

            // Si el algoritmo de cifrado cambió, se actualiza el hash
            if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
                db()->prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
                    ->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
            }

            session_regenerate_id(true); // evita la fijación de sesión
            $_SESSION['user_id'] = (int) $u['id'];
            $_SESSION['nombre']  = $u['nombre'];
            flash('success', 'Bienvenido, ' . $u['nombre'] . '.');
            redirect('equipos.php');
        } else {
            // Intento fallido: se cuenta y, si se excede el límite, se bloquea la cuenta
            if ($u) {
                $intentos = (int) $u['intentos_fallidos'] + 1;
                $bloqueo = null;
                if ($intentos >= MAX_LOGIN_ATTEMPTS) {
                    $bloqueo = date('Y-m-d H:i:s', time() + LOCK_MINUTES * 60);
                    $intentos = 0;
                }
                db()->prepare('UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?')
                    ->execute([$intentos, $bloqueo, $u['id']]);
                if ($bloqueo) {
                    $error = 'Demasiados intentos fallidos. La cuenta quedó bloqueada ' . LOCK_MINUTES . ' minutos.';
                }
            }
            // Mensaje genérico: no revela si el correo existe
            $error = $error ?: 'Correo o contraseña incorrectos.';
        }
    }
}

$titulo = 'Iniciar sesión';
$extraHead = recaptcha_script();
require __DIR__ . '/includes/header.php';
?>
<div class="panel panel-auth">
    <h1>Iniciar sesión</h1>
    <p class="muted">Accede con tu cuenta. Demo: <code>demo@nfl.com</code> / <code>Demo1234</code></p>
    <?php if ($error): ?><div class="alerta alerta-error"><?= e($error) ?></div><?php endif; ?>
    <form method="post" novalidate>
        <?= csrf_field() ?>
        <label for="email">Correo electrónico</label>
        <input id="email" name="email" type="email" value="<?= e($email) ?>" required autofocus>

        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" required autocomplete="current-password">

        <?= recaptcha_widget() ?>

        <div class="acciones">
            <button class="btn">Entrar</button>
            <a href="registro.php">Crear una cuenta</a>
        </div>
    </form>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
