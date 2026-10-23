<?php
require_once __DIR__ . '/../config.php';

/**
 * Conexión única a MySQL mediante PDO.
 * Se desactivan las consultas preparadas emuladas para que MySQL
 * reciba los parámetros por separado (protección contra inyección SQL).
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = getenv('NFL_DB_DSN') ?: 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $ex) {
            // No se muestra el detalle del error al usuario (podría revelar datos del servidor)
            error_log('Error de conexión: ' . $ex->getMessage());
            http_response_code(500);
            exit('No fue posible conectar con la base de datos. Revisa config.php.');
        }
    }
    return $pdo;
}
