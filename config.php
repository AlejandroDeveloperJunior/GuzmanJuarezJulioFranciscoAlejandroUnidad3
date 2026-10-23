<?php
/* =========================================================
 *  Configuración general de la aplicación
 * ========================================================= */

// --- Base de datos MySQL ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'nfl_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// --- Google reCAPTCHA v2 (casilla "No soy un robot") ---
// Estas son las claves de PRUEBA oficiales de Google: siempre validan y muestran
// el aviso "solo para pruebas". Para producción crea las tuyas en
// https://www.google.com/recaptcha/admin  (tipo v2 casilla, dominio: localhost).
define('RECAPTCHA_SITE_KEY',   '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI');
define('RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe');
// Se puede desactivar con la variable de entorno NFL_RECAPTCHA_OFF=1 (pruebas sin internet).
define('RECAPTCHA_ENABLED', getenv('NFL_RECAPTCHA_OFF') ? false : true);

// --- Google Maps ---
// Opcional. Sin clave se usa el mapa incrustado clásico de Google Maps.
// Con clave se usa la Maps Embed API oficial.
define('GOOGLE_MAPS_API_KEY', '');

// --- Seguridad ---
define('SESSION_TIMEOUT', 1800);      // 30 min de inactividad cierran la sesión
define('MAX_LOGIN_ATTEMPTS', 5);      // intentos fallidos antes de bloquear
define('LOCK_MINUTES', 15);           // minutos de bloqueo de la cuenta
