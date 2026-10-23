<?php
require_once __DIR__ . '/includes/auth.php';
$titulo = 'Inicio';
$total = (int) db()->query('SELECT COUNT(*) FROM equipos')->fetchColumn();
require __DIR__ . '/includes/header.php';
?>
<section class="heroe">
    <h1>Los <?= $total ?> equipos de la NFL en un solo lugar</h1>
    <p>Consulta conferencias, divisiones y estadios, ubica cada estadio en Google Maps
       y accede a los datos mediante nuestra propia API REST.</p>
    <div class="acciones">
        <?php if (is_logged_in()): ?>
            <a class="btn" href="equipos.php">Ver equipos</a>
            <a class="btn btn-gris" href="servicios.php">Probar la API</a>
        <?php else: ?>
            <a class="btn" href="login.php">Iniciar sesión</a>
            <a class="btn btn-gris" href="registro.php">Crear cuenta</a>
        <?php endif; ?>
    </div>
</section>

<div class="caracteristicas">
    <div class="panel">
        <h3>🔒 Acceso seguro</h3>
        <p>Contraseñas cifradas con bcrypt, sesiones protegidas, tokens CSRF y bloqueo tras intentos fallidos.</p>
    </div>
    <div class="panel">
        <h3>🤖 Google reCAPTCHA</h3>
        <p>El inicio de sesión y el registro verifican con Google que no eres un robot.</p>
    </div>
    <div class="panel">
        <h3>📍 Google Maps</h3>
        <p>Cada equipo muestra la ubicación de su estadio en un mapa interactivo.</p>
    </div>
    <div class="panel">
        <h3>⚙️ API REST propia</h3>
        <p>Servicio web en JSON para consultar, crear, editar y eliminar equipos con token.</p>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
