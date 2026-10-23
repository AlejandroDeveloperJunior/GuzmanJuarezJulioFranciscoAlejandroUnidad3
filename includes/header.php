<?php
// Cabeceras HTTP de seguridad
header('X-Frame-Options: SAMEORIGIN');            // evita clickjacking
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

$titulo = $titulo ?? 'NFL Web';
$pagina = basename($_SERVER['SCRIPT_NAME']);
$extraHead = $extraHead ?? '';
function nav_activo(string $archivo, string $pagina): string
{
    return $archivo === $pagina ? ' class="activo"' : '';
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($titulo) ?> · NFL Web</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/estilos.css">
    <?= $extraHead ?>
</head>
<body>
<header class="barra">
    <div class="contenedor barra-int">
        <a class="logo" href="index.php"><span class="logo-balon">🏈</span> NFL<b>Web</b></a>
        <nav>
            <?php if (is_logged_in()): ?>
                <a href="equipos.php"<?= nav_activo('equipos.php', $pagina) ?>>Equipos</a>
                <a href="servicios.php"<?= nav_activo('servicios.php', $pagina) ?>>Servicios Web</a>
                <a href="perfil.php"<?= nav_activo('perfil.php', $pagina) ?>>Mi perfil</a>
                <form action="logout.php" method="post" class="inline">
                    <?= csrf_field() ?>
                    <button class="btn-link">Salir</button>
                </form>
            <?php else: ?>
                <a href="login.php"<?= nav_activo('login.php', $pagina) ?>>Iniciar sesión</a>
                <a href="registro.php" class="btn btn-sm">Registrarse</a>
            <?php endif; ?>
        </nav>
    </div>
</header>
<main class="contenedor">
<?php if ($f = flash_get()): ?>
    <div class="alerta alerta-<?= e($f[0]) ?>"><?= e($f[1]) ?></div>
<?php endif; ?>
