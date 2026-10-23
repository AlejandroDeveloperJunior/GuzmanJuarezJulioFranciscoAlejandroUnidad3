<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/equipos.php';
require_login();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) ?: null;
$eq = $id ? obtener_equipo($id) : null;
if ($id && !$eq) {
    flash('error', 'El equipo no existe.');
    redirect('equipos.php');
}

$datos = $eq ?? ['nombre' => '', 'abreviatura' => '', 'ciudad' => '', 'conferencia' => 'AFC',
                 'division' => 'Este', 'estadio' => '', 'fundacion' => '', 'latitud' => '',
                 'longitud' => '', 'color' => '#013369'];
$errores = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    [$limpios, $errores] = validar_equipo($_POST);
    if (!$errores && nombre_duplicado($limpios['nombre'], $id)) {
        $errores['nombre'] = 'Ya existe un equipo con ese nombre.';
    }
    if (!$errores) {
        $nuevoId = guardar_equipo($limpios, $id);
        flash('success', $id ? 'Equipo actualizado.' : 'Equipo creado.');
        redirect('equipo.php?id=' . $nuevoId);
    }
    $datos = array_merge($datos, array_intersect_key($_POST, array_flip(CAMPOS_EQUIPO)));
}

function campo_error(array $errores, string $c): string
{
    return isset($errores[$c]) ? '<div class="error-campo">' . e($errores[$c]) . '</div>' : '';
}

$titulo = $id ? 'Editar equipo' : 'Nuevo equipo';
require __DIR__ . '/includes/header.php';
?>
<p><a href="<?= $id ? 'equipo.php?id=' . $id : 'equipos.php' ?>">← Volver</a></p>
<div class="panel">
    <h1><?= e($titulo) ?></h1>
    <form method="post" novalidate>
        <?= csrf_field() ?>
        <div class="grid-form">
            <div>
                <label for="nombre">Nombre</label>
                <input id="nombre" name="nombre" value="<?= e($datos['nombre']) ?>" required>
                <?= campo_error($errores, 'nombre') ?>
            </div>
            <div>
                <label for="abreviatura">Abreviatura</label>
                <input id="abreviatura" name="abreviatura" maxlength="4" value="<?= e($datos['abreviatura']) ?>" required>
                <?= campo_error($errores, 'abreviatura') ?>
            </div>
            <div>
                <label for="ciudad">Ciudad</label>
                <input id="ciudad" name="ciudad" value="<?= e($datos['ciudad']) ?>" required>
                <?= campo_error($errores, 'ciudad') ?>
            </div>
            <div>
                <label for="estadio">Estadio</label>
                <input id="estadio" name="estadio" value="<?= e($datos['estadio']) ?>" required>
                <?= campo_error($errores, 'estadio') ?>
            </div>
            <div>
                <label for="conferencia">Conferencia</label>
                <select id="conferencia" name="conferencia">
                    <?php foreach (CONFERENCIAS as $c): ?>
                        <option <?= $datos['conferencia'] === $c ? 'selected' : '' ?>><?= $c ?></option>
                    <?php endforeach; ?>
                </select>
                <?= campo_error($errores, 'conferencia') ?>
            </div>
            <div>
                <label for="division">División</label>
                <select id="division" name="division">
                    <?php foreach (DIVISIONES as $d): ?>
                        <option <?= $datos['division'] === $d ? 'selected' : '' ?>><?= $d ?></option>
                    <?php endforeach; ?>
                </select>
                <?= campo_error($errores, 'division') ?>
            </div>
            <div>
                <label for="fundacion">Año de fundación</label>
                <input id="fundacion" name="fundacion" type="number" value="<?= e($datos['fundacion']) ?>" required>
                <?= campo_error($errores, 'fundacion') ?>
            </div>
            <div>
                <label for="color">Color principal</label>
                <input id="color" name="color" type="color" value="<?= e($datos['color']) ?>">
                <?= campo_error($errores, 'color') ?>
            </div>
            <div>
                <label for="latitud">Latitud del estadio</label>
                <input id="latitud" name="latitud" type="number" step="0.000001" value="<?= e($datos['latitud']) ?>" required>
                <?= campo_error($errores, 'latitud') ?>
            </div>
            <div>
                <label for="longitud">Longitud del estadio</label>
                <input id="longitud" name="longitud" type="number" step="0.000001" value="<?= e($datos['longitud']) ?>" required>
                <?= campo_error($errores, 'longitud') ?>
            </div>
        </div>
        <p class="muted small">Tip: en Google Maps haz clic derecho sobre el estadio para copiar sus coordenadas.</p>
        <div class="acciones">
            <button class="btn"><?= $id ? 'Guardar cambios' : 'Crear equipo' ?></button>
            <a class="btn btn-gris" href="equipos.php">Cancelar</a>
        </div>
    </form>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
