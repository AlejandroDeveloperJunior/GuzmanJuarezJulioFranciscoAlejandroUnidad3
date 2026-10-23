<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/equipos.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Método no permitido.');
}
csrf_check();

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if ($id && eliminar_equipo($id)) {
    flash('success', 'Equipo eliminado.');
} else {
    flash('error', 'No se pudo eliminar el equipo.');
}
redirect('equipos.php');
