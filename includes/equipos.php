<?php
/* =========================================================
 *  Reglas de negocio de equipos (compartidas por el sitio y la API)
 * ========================================================= */
require_once __DIR__ . '/db.php';

const CONFERENCIAS = ['AFC', 'NFC'];
const DIVISIONES   = ['Este', 'Norte', 'Sur', 'Oeste'];
const CAMPOS_EQUIPO = ['nombre', 'abreviatura', 'ciudad', 'conferencia', 'division',
                       'estadio', 'fundacion', 'latitud', 'longitud', 'color'];

/**
 * Valida y limpia los datos de un equipo.
 * @return array [datosLimpios, errores]
 */
function validar_equipo(array $in): array
{
    $d = [];
    $err = [];

    foreach (['nombre' => 100, 'ciudad' => 100, 'estadio' => 120] as $campo => $max) {
        $v = trim((string) ($in[$campo] ?? ''));
        if ($v === '' || mb_strlen($v) > $max) {
            $err[$campo] = "El campo $campo es obligatorio (máx. $max caracteres).";
        }
        $d[$campo] = $v;
    }

    $d['abreviatura'] = strtoupper(trim((string) ($in['abreviatura'] ?? '')));
    if (!preg_match('/^[A-Z]{2,4}$/', $d['abreviatura'])) {
        $err['abreviatura'] = 'La abreviatura debe tener de 2 a 4 letras.';
    }

    $d['conferencia'] = (string) ($in['conferencia'] ?? '');
    if (!in_array($d['conferencia'], CONFERENCIAS, true)) {
        $err['conferencia'] = 'Conferencia inválida (AFC o NFC).';
    }

    $d['division'] = (string) ($in['division'] ?? '');
    if (!in_array($d['division'], DIVISIONES, true)) {
        $err['division'] = 'División inválida (Este, Norte, Sur u Oeste).';
    }

    $anio = filter_var($in['fundacion'] ?? null, FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1900, 'max_range' => (int) date('Y')]]);
    if ($anio === false) {
        $err['fundacion'] = 'Año de fundación inválido.';
    }
    $d['fundacion'] = $anio;

    $lat = filter_var($in['latitud'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($lat === false || $lat < -90 || $lat > 90) {
        $err['latitud'] = 'Latitud inválida (-90 a 90).';
    }
    $d['latitud'] = $lat;

    $lng = filter_var($in['longitud'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($lng === false || $lng < -180 || $lng > 180) {
        $err['longitud'] = 'Longitud inválida (-180 a 180).';
    }
    $d['longitud'] = $lng;

    $d['color'] = (string) ($in['color'] ?? '#013369');
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $d['color'])) {
        $err['color'] = 'Color inválido (formato #RRGGBB).';
    }

    return [$d, $err];
}

function buscar_equipos(array $filtros = []): array
{
    $sql = 'SELECT * FROM equipos WHERE 1=1';
    $p = [];
    if (!empty($filtros['conferencia']) && in_array($filtros['conferencia'], CONFERENCIAS, true)) {
        $sql .= ' AND conferencia = ?';
        $p[] = $filtros['conferencia'];
    }
    if (!empty($filtros['division']) && in_array($filtros['division'], DIVISIONES, true)) {
        $sql .= ' AND division = ?';
        $p[] = $filtros['division'];
    }
    if (!empty($filtros['q'])) {
        $sql .= ' AND (nombre LIKE ? OR ciudad LIKE ? OR estadio LIKE ?)';
        $like = '%' . $filtros['q'] . '%';
        array_push($p, $like, $like, $like);
    }
    $sql .= ' ORDER BY conferencia, division, nombre';
    $st = db()->prepare($sql);
    $st->execute($p);
    return $st->fetchAll();
}

function obtener_equipo(int $id): ?array
{
    $st = db()->prepare('SELECT * FROM equipos WHERE id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function guardar_equipo(array $d, ?int $id = null): int
{
    $campos = CAMPOS_EQUIPO;
    $valores = array_map(fn($c) => $d[$c], $campos);
    if ($id === null) {
        $sql = 'INSERT INTO equipos (' . implode(', ', $campos) . ') VALUES ('
             . implode(', ', array_fill(0, count($campos), '?')) . ')';
        db()->prepare($sql)->execute($valores);
        return (int) db()->lastInsertId();
    }
    $sql = 'UPDATE equipos SET ' . implode(', ', array_map(fn($c) => "$c = ?", $campos)) . ' WHERE id = ?';
    $valores[] = $id;
    db()->prepare($sql)->execute($valores);
    return $id;
}

function eliminar_equipo(int $id): bool
{
    $st = db()->prepare('DELETE FROM equipos WHERE id = ?');
    $st->execute([$id]);
    return $st->rowCount() > 0;
}

function nombre_duplicado(string $nombre, ?int $excluirId = null): bool
{
    $st = db()->prepare('SELECT id FROM equipos WHERE nombre = ? AND id <> ?');
    $st->execute([$nombre, $excluirId ?? 0]);
    return (bool) $st->fetch();
}

/* ---------- Servicio web de terceros: Google Maps ---------- */
function mapa_url(float $lat, float $lng, string $lugar = ''): string
{
    if (GOOGLE_MAPS_API_KEY !== '') {
        return 'https://www.google.com/maps/embed/v1/place?key=' . urlencode(GOOGLE_MAPS_API_KEY)
             . '&q=' . urlencode($lugar !== '' ? $lugar : "$lat,$lng") . '&zoom=15';
    }
    return 'https://maps.google.com/maps?q=' . urlencode("$lat,$lng") . '&z=15&output=embed';
}
