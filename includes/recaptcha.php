<?php
/* =========================================================
 *  Servicio web de terceros: Google reCAPTCHA v2
 *  El navegador obtiene un token de Google y el servidor lo
 *  verifica llamando a https://www.google.com/recaptcha/api/siteverify
 * ========================================================= */
require_once __DIR__ . '/../config.php';

function recaptcha_widget(): string
{
    if (!RECAPTCHA_ENABLED) {
        return '<p class="muted small">reCAPTCHA desactivado (modo pruebas).</p>';
    }
    return '<div class="g-recaptcha" data-sitekey="' . htmlspecialchars(RECAPTCHA_SITE_KEY) . '"></div>';
}

function recaptcha_script(): string
{
    return RECAPTCHA_ENABLED
        ? '<script src="https://www.google.com/recaptcha/api.js?hl=es" async defer></script>'
        : '';
}

/** Devuelve true si Google confirma que el usuario no es un robot. */
function recaptcha_verify(?string $respuesta): bool
{
    if (!RECAPTCHA_ENABLED) {
        return true;
    }
    if (empty($respuesta)) {
        return false;
    }

    $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_POSTFIELDS     => http_build_query([
            'secret'   => RECAPTCHA_SECRET_KEY,
            'response' => $respuesta,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ]),
    ]);
    $json = curl_exec($ch);
    curl_close($ch);

    if ($json === false) {
        error_log('reCAPTCHA: no se pudo contactar a Google');
        return false;
    }
    $datos = json_decode($json, true);
    return !empty($datos['success']);
}
