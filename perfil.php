<?php
require_once __DIR__ . '/includes/auth.php';
require_login();

$tokenNuevo = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if (($_POST['accion'] ?? '') === 'generar') {
        // Token aleatorio de 256 bits; en la BD solo se guarda su hash
        $tokenNuevo = bin2hex(random_bytes(32));
        db()->prepare('UPDATE usuarios SET api_token_hash = ? WHERE id = ?')
            ->execute([hash('sha256', $tokenNuevo), $_SESSION['user_id']]);
    } elseif (($_POST['accion'] ?? '') === 'revocar') {
        db()->prepare('UPDATE usuarios SET api_token_hash = NULL WHERE id = ?')
            ->execute([$_SESSION['user_id']]);
        flash('info', 'Token revocado. La API rechazará el token anterior.');
        redirect('perfil.php');
    }
}
$u = current_user();

$titulo = 'Mi perfil';
require __DIR__ . '/includes/header.php';
?>
<h1>Mi perfil</h1>
<div class="dos-col">
    <div class="panel">
        <h2 style="margin-top:0">Datos de la cuenta</h2>
        <p><b>Nombre:</b> <?= e($u['nombre']) ?></p>
        <p><b>Correo:</b> <?= e($u['email']) ?></p>
        <p><b>Miembro desde:</b> <?= e($u['creado_en']) ?></p>
        <p class="muted small">Tu contraseña está guardada como hash bcrypt; ni el administrador puede leerla.</p>
    </div>
    <div class="panel">
        <h2 style="margin-top:0">Token de la API</h2>
        <?php if ($tokenNuevo): ?>
            <div class="alerta alerta-success">Copia tu token ahora: por seguridad no se volverá a mostrar.</div>
            <div class="token-caja" id="token"><?= e($tokenNuevo) ?></div>
            <div class="acciones">
                <button class="btn btn-azul btn-sm" type="button"
                        onclick="navigator.clipboard.writeText(document.getElementById('token').textContent);this.textContent='¡Copiado!'">Copiar</button>
                <a class="btn btn-sm" href="servicios.php">Probar en Servicios Web</a>
            </div>
        <?php else: ?>
            <p>Estado: <?= $u['api_token_hash'] ? '<b style="color:var(--ok)">Token activo</b>' : '<b class="muted">Sin token</b>' ?></p>
            <p class="muted small">El token permite crear, editar y eliminar equipos desde la API.</p>
        <?php endif; ?>
        <form method="post" class="acciones">
            <?= csrf_field() ?>
            <button class="btn" name="accion" value="generar">Generar nuevo token</button>
            <?php if ($u['api_token_hash'] && !$tokenNuevo): ?>
                <button class="btn btn-peligro" name="accion" value="revocar">Revocar</button>
            <?php endif; ?>
        </form>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
