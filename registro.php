<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/recaptcha.php';

if (is_logged_in()) {
    redirect('equipos.php');
}

$errores = [];
$nombre = $email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $nombre    = trim($_POST['nombre'] ?? '');
    $email     = strtolower(trim($_POST['email'] ?? ''));
    $password  = $_POST['password'] ?? '';
    $confirmar = $_POST['confirmar'] ?? '';

    if (mb_strlen($nombre) < 3 || mb_strlen($nombre) > 100) {
        $errores['nombre'] = 'Escribe tu nombre (3 a 100 caracteres).';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errores['email'] = 'Correo electrónico inválido.';
    }
    // Política de contraseñas: mínimo 8 caracteres con letras y números
    if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
        $errores['password'] = 'Mínimo 8 caracteres, con al menos una letra y un número.';
    }
    if ($password !== $confirmar) {
        $errores['confirmar'] = 'Las contraseñas no coinciden.';
    }
    if (!recaptcha_verify($_POST['g-recaptcha-response'] ?? null)) {
        $errores['captcha'] = 'Confirma que no eres un robot.';
    }

    if (!$errores) {
        $st = db()->prepare('SELECT id FROM usuarios WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) {
            $errores['email'] = 'Ya existe una cuenta con ese correo.';
        }
    }

    if (!$errores) {
        // Cifrado de la contraseña con bcrypt (incluye sal aleatoria automáticamente)
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $st = db()->prepare('INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)');
        $st->execute([$nombre, $email, $hash]);
        flash('success', 'Cuenta creada. Ya puedes iniciar sesión.');
        redirect('login.php');
    }
}

$titulo = 'Registro';
$extraHead = recaptcha_script();
require __DIR__ . '/includes/header.php';
?>
<div class="panel panel-auth">
    <h1>Crear cuenta</h1>
    <p class="muted">Regístrate para consultar y administrar los equipos.</p>
    <form method="post" novalidate>
        <?= csrf_field() ?>
        <label for="nombre">Nombre completo</label>
        <input id="nombre" name="nombre" value="<?= e($nombre) ?>" required>
        <?php if (isset($errores['nombre'])): ?><div class="error-campo"><?= e($errores['nombre']) ?></div><?php endif; ?>

        <label for="email">Correo electrónico</label>
        <input id="email" name="email" type="email" value="<?= e($email) ?>" required>
        <?php if (isset($errores['email'])): ?><div class="error-campo"><?= e($errores['email']) ?></div><?php endif; ?>

        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" required autocomplete="new-password">
        <?php if (isset($errores['password'])): ?><div class="error-campo"><?= e($errores['password']) ?></div><?php endif; ?>

        <label for="confirmar">Confirmar contraseña</label>
        <input id="confirmar" name="confirmar" type="password" required autocomplete="new-password">
        <?php if (isset($errores['confirmar'])): ?><div class="error-campo"><?= e($errores['confirmar']) ?></div><?php endif; ?>

        <?= recaptcha_widget() ?>
        <?php if (isset($errores['captcha'])): ?><div class="error-campo"><?= e($errores['captcha']) ?></div><?php endif; ?>

        <div class="acciones">
            <button class="btn">Registrarme</button>
            <a href="login.php">Ya tengo cuenta</a>
        </div>
    </form>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
