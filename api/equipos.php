<?php
/* =========================================================
 *  WEB SERVICE PROPIO — API REST de equipos NFL (JSON)
 *
 *  GET    api/equipos.php                 Lista (filtros: conferencia, division, q)
 *  GET    api/equipos.php?id=5            Un equipo
 *  POST   api/equipos.php                 Crear       (requiere token)
 *  PUT    api/equipos.php?id=5            Actualizar  (requiere token)
 *  DELETE api/equipos.php?id=5            Eliminar    (requiere token)
 *
 *  Token: cabecera  "Authorization: Bearer <token>"  o  "X-API-Key: <token>"
 *  El token se genera en "Mi perfil" y en la BD solo se guarda su hash SHA-256.
 * ========================================================= */
require_once __DIR__ . '/../includes/equipos.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

function responder(int $codigo, array $cuerpo): void
{
    http_response_code($codigo);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/** Busca al usuario dueño del token enviado. */
function usuario_por_token(): ?array
{
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$auth && function_exists('getallheaders')) {
        $h = array_change_key_case(getallheaders(), CASE_LOWER);
        $auth = $h['authorization'] ?? '';
    }
    $token = '';
    if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($auth), $m)) {
        $token = $m[1];
    } elseif (!empty($_SERVER['HTTP_X_API_KEY'])) {
        $token = trim($_SERVER['HTTP_X_API_KEY']);
    }
    if (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
        return null;
    }
    $st = db()->prepare('SELECT id, nombre FROM usuarios WHERE api_token_hash = ?');
    $st->execute([hash('sha256', strtolower($token))]);
    return $st->fetch() ?: null;
}

function requerir_token(): array
{
    $u = usuario_por_token();
    if (!$u) {
        header('WWW-Authenticate: Bearer');
        responder(401, ['ok' => false, 'error' => 'Token inválido o ausente. Genera uno en "Mi perfil".']);
    }
    return $u;
}

function leer_json(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responder(400, ['ok' => false, 'error' => 'El cuerpo debe ser JSON válido.']);
    }
    return $datos;
}

function formatear(array $e): array
{
    $e['id'] = (int) $e['id'];
    $e['fundacion'] = (int) $e['fundacion'];
    $e['latitud'] = (float) $e['latitud'];
    $e['longitud'] = (float) $e['longitud'];
    return $e;
}

$metodo = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
if ($id === false) {
    responder(400, ['ok' => false, 'error' => 'El parámetro id debe ser un número entero.']);
}

try {
    switch ($metodo) {
        case 'OPTIONS':
            responder(204, []);

        case 'GET':
            if ($id) {
                $eq = obtener_equipo($id);
                $eq ? responder(200, ['ok' => true, 'data' => formatear($eq)])
                    : responder(404, ['ok' => false, 'error' => "No existe el equipo $id."]);
            }
            $lista = array_map('formatear', buscar_equipos([
                'conferencia' => $_GET['conferencia'] ?? '',
                'division'    => $_GET['division'] ?? '',
                'q'           => trim($_GET['q'] ?? ''),
            ]));
            responder(200, ['ok' => true, 'total' => count($lista), 'data' => $lista]);

        case 'POST':
            requerir_token();
            [$d, $err] = validar_equipo(leer_json());
            if (!$err && nombre_duplicado($d['nombre'])) {
                $err['nombre'] = 'Ya existe un equipo con ese nombre.';
            }
            if ($err) {
                responder(422, ['ok' => false, 'error' => 'Datos inválidos.', 'detalles' => $err]);
            }
            $nuevo = guardar_equipo($d);
            header('Location: equipos.php?id=' . $nuevo);
            responder(201, ['ok' => true, 'mensaje' => 'Equipo creado.', 'data' => formatear(obtener_equipo($nuevo))]);

        case 'PUT':
            requerir_token();
            if (!$id) {
                responder(400, ['ok' => false, 'error' => 'Indica el id: api/equipos.php?id=N']);
            }
            $actual = obtener_equipo($id);
            if (!$actual) {
                responder(404, ['ok' => false, 'error' => "No existe el equipo $id."]);
            }
            // Se permiten actualizaciones parciales: lo que no se envíe conserva su valor
            [$d, $err] = validar_equipo(array_merge($actual, leer_json()));
            if (!$err && nombre_duplicado($d['nombre'], $id)) {
                $err['nombre'] = 'Ya existe un equipo con ese nombre.';
            }
            if ($err) {
                responder(422, ['ok' => false, 'error' => 'Datos inválidos.', 'detalles' => $err]);
            }
            guardar_equipo($d, $id);
            responder(200, ['ok' => true, 'mensaje' => 'Equipo actualizado.', 'data' => formatear(obtener_equipo($id))]);

        case 'DELETE':
            requerir_token();
            if (!$id) {
                responder(400, ['ok' => false, 'error' => 'Indica el id: api/equipos.php?id=N']);
            }
            eliminar_equipo($id)
                ? responder(200, ['ok' => true, 'mensaje' => "Equipo $id eliminado."])
                : responder(404, ['ok' => false, 'error' => "No existe el equipo $id."]);

        default:
            header('Allow: GET, POST, PUT, DELETE, OPTIONS');
            responder(405, ['ok' => false, 'error' => "Método $metodo no permitido."]);
    }
} catch (PDOException $ex) {
    error_log('API: ' . $ex->getMessage());
    responder(500, ['ok' => false, 'error' => 'Error interno del servidor.']);
}
