<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/equipos.php';
require_login();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$eq = $id ? obtener_equipo($id) : null;
if (!$eq) {
    flash('error', 'El equipo solicitado no existe.');
    redirect('equipos.php');
}

$titulo = $eq['nombre'];
require __DIR__ . '/includes/header.php';
?>
<p><a href="equipos.php">← Volver a equipos</a></p>
<div class="franja" style="background: <?= e($eq['color']) ?>"></div>
<div class="cabecera">
    <div>
        <h1><?= e($eq['nombre']) ?></h1>
        <span class="etiqueta <?= $eq['conferencia'] === 'NFC' ? 'nfc' : '' ?>"><?= e($eq['conferencia']) ?></span>
        <span class="etiqueta"><?= e($eq['division']) ?></span>
    </div>
    <div class="acciones" style="margin:0">
        <a class="btn btn-azul" href="equipo_form.php?id=<?= (int) $eq['id'] ?>">Editar</a>
        <form action="equipo_eliminar.php" method="post" class="inline"
              onsubmit="return confirm('¿Eliminar <?= e(addslashes($eq['nombre'])) ?>?');">
            <?= csrf_field() ?>
            <input type="hidden" name="id" value="<?= (int) $eq['id'] ?>">
            <button class="btn btn-peligro">Eliminar</button>
        </form>
    </div>
</div>

<div class="detalle" style="margin-top:20px">
    <div class="panel">
        <h2 style="margin-top:0">Ficha del equipo</h2>
        <dl>
            <dt>Abreviatura</dt><dd><?= e($eq['abreviatura']) ?></dd>
            <dt>Ciudad</dt><dd><?= e($eq['ciudad']) ?></dd>
            <dt>Estadio</dt><dd><?= e($eq['estadio']) ?></dd>
            <dt>Fundación</dt><dd><?= e($eq['fundacion']) ?></dd>
            <dt>Conferencia</dt><dd><?= e($eq['conferencia']) ?> <?= e($eq['division']) ?></dd>
            <dt>Coordenadas</dt><dd><?= e($eq['latitud']) ?>, <?= e($eq['longitud']) ?></dd>
            <dt>Color</dt><dd><span style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:middle;background:<?= e($eq['color']) ?>"></span> <?= e($eq['color']) ?></dd>
        </dl>
        <p class="muted small" style="margin-top:18px">
            Datos en JSON: <a href="api/equipos.php?id=<?= (int) $eq['id'] ?>" target="_blank">api/equipos.php?id=<?= (int) $eq['id'] ?></a>
        </p>
    </div>
    <div class="panel">
        <h2 style="margin-top:0">📍 Ubicación del estadio (Google Maps)</h2>
        <iframe class="mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                title="Mapa de <?= e($eq['estadio']) ?>"
                src="<?= e(mapa_url((float) $eq['latitud'], (float) $eq['longitud'], $eq['estadio'] . ', ' . $eq['ciudad'])) ?>"></iframe>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
