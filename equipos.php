<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/equipos.php';
require_login();

$filtros = [
    'q'           => trim($_GET['q'] ?? ''),
    'conferencia' => $_GET['conferencia'] ?? '',
    'division'    => $_GET['division'] ?? '',
];
$equipos = buscar_equipos($filtros);

$titulo = 'Equipos';
require __DIR__ . '/includes/header.php';
?>
<div class="cabecera">
    <div>
        <h1>Equipos de la NFL</h1>
        <p class="muted"><?= count($equipos) ?> equipo(s) encontrados</p>
    </div>
    <a class="btn" href="equipo_form.php">+ Nuevo equipo</a>
</div>

<form class="filtros" method="get">
    <input name="q" placeholder="Buscar equipo, ciudad o estadio" value="<?= e($filtros['q']) ?>">
    <select name="conferencia">
        <option value="">Todas las conferencias</option>
        <?php foreach (CONFERENCIAS as $c): ?>
            <option <?= $filtros['conferencia'] === $c ? 'selected' : '' ?>><?= $c ?></option>
        <?php endforeach; ?>
    </select>
    <select name="division">
        <option value="">Todas las divisiones</option>
        <?php foreach (DIVISIONES as $d): ?>
            <option <?= $filtros['division'] === $d ? 'selected' : '' ?>><?= $d ?></option>
        <?php endforeach; ?>
    </select>
    <button class="btn btn-azul">Filtrar</button>
    <a class="btn btn-gris" href="equipos.php">Limpiar</a>
</form>

<div class="grid-equipos">
    <?php foreach ($equipos as $eq): ?>
        <a class="equipo" href="equipo.php?id=<?= (int) $eq['id'] ?>" style="--c: <?= e($eq['color']) ?>">
            <div class="abr"><?= e($eq['abreviatura']) ?></div>
            <h3><?= e($eq['nombre']) ?></h3>
            <div class="muted small"><?= e($eq['estadio']) ?> · <?= e($eq['ciudad']) ?></div>
            <div style="margin-top:8px">
                <span class="etiqueta <?= $eq['conferencia'] === 'NFC' ? 'nfc' : '' ?>"><?= e($eq['conferencia']) ?></span>
                <span class="etiqueta"><?= e($eq['division']) ?></span>
            </div>
        </a>
    <?php endforeach; ?>
    <?php if (!$equipos): ?>
        <p class="muted">No hay equipos que coincidan con la búsqueda.</p>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
