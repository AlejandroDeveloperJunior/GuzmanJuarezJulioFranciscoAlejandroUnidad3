<?php
require_once __DIR__ . '/includes/auth.php';
require_login();

$titulo = 'Servicios Web';
$extraFooter = '<script src="assets/js/api-demo.js"></script>';
require __DIR__ . '/includes/header.php';
?>
<h1>Servicios Web</h1>
<p class="muted">Servicios de terceros que consume el sitio y servicio web propio que expone.</p>

<h2>Servicios web de terceros</h2>
<div class="dos-col">
    <div class="panel">
        <h3 style="margin-top:0">🤖 Google reCAPTCHA v2</h3>
        <p>Se usa en <a href="login.php">inicio de sesión</a> y <a href="registro.php">registro</a>.
           El navegador obtiene un token de Google y el servidor lo valida con
           <code>POST https://www.google.com/recaptcha/api/siteverify</code>
           (archivo <code>includes/recaptcha.php</code>). Si Google responde
           <code>"success": false</code>, el acceso se rechaza.</p>
    </div>
    <div class="panel">
        <h3 style="margin-top:0">📍 Google Maps</h3>
        <p>Cada <a href="equipos.php">ficha de equipo</a> incrusta un mapa de Google con la ubicación del
           estadio a partir de su latitud y longitud guardadas en MySQL
           (función <code>mapa_url()</code> en <code>includes/equipos.php</code>).</p>
    </div>
</div>

<h2>Web service propio: API REST de equipos</h2>
<div class="panel" style="padding:0;overflow:auto">
    <table>
        <tr><th>Método</th><th>Ruta</th><th>Descripción</th><th>Token</th></tr>
        <tr><td><span class="metodo GET">GET</span></td><td><code>api/equipos.php</code></td><td>Lista todos. Filtros: <code>conferencia</code>, <code>division</code>, <code>q</code></td><td>No</td></tr>
        <tr><td><span class="metodo GET">GET</span></td><td><code>api/equipos.php?id=5</code></td><td>Obtiene un equipo</td><td>No</td></tr>
        <tr><td><span class="metodo POST">POST</span></td><td><code>api/equipos.php</code></td><td>Crea un equipo (cuerpo JSON)</td><td>Sí</td></tr>
        <tr><td><span class="metodo PUT">PUT</span></td><td><code>api/equipos.php?id=5</code></td><td>Actualiza campos de un equipo (JSON)</td><td>Sí</td></tr>
        <tr><td><span class="metodo DELETE">DELETE</span></td><td><code>api/equipos.php?id=5</code></td><td>Elimina un equipo</td><td>Sí</td></tr>
    </table>
</div>
<p class="muted small">Autenticación: cabecera <code>Authorization: Bearer &lt;token&gt;</code>. Genera tu token en <a href="perfil.php">Mi perfil</a>.
   Códigos: 200 OK · 201 creado · 400 petición mal formada · 401 sin token · 404 no existe · 405 método no permitido · 422 datos inválidos.</p>

<h2>Probar la API</h2>
<div class="dos-col">
    <div class="panel">
        <label for="metodo">Método</label>
        <select id="metodo">
            <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
        </select>

        <label for="ruta">Ruta</label>
        <input id="ruta" value="api/equipos.php?conferencia=AFC&division=Oeste">

        <label for="token">Token (solo POST, PUT y DELETE)</label>
        <input id="token" placeholder="Pega aquí tu token de 64 caracteres">

        <label for="cuerpo">Cuerpo JSON</label>
        <textarea id="cuerpo" rows="9"></textarea>

        <div class="acciones">
            <button class="btn" id="enviar" type="button">Enviar petición</button>
        </div>
        <p class="muted small">Ejemplos rápidos:</p>
        <div class="acciones" style="margin-top:0">
            <button class="btn btn-gris btn-sm" data-ejemplo="listar" type="button">Listar todos</button>
            <button class="btn btn-gris btn-sm" data-ejemplo="uno" type="button">Ver id 14</button>
            <button class="btn btn-gris btn-sm" data-ejemplo="crear" type="button">Crear</button>
            <button class="btn btn-gris btn-sm" data-ejemplo="editar" type="button">Editar</button>
            <button class="btn btn-gris btn-sm" data-ejemplo="eliminar" type="button">Eliminar</button>
            <button class="btn btn-gris btn-sm" data-ejemplo="sinToken" type="button">POST sin token</button>
        </div>
    </div>
    <div class="panel">
        <label>Respuesta</label>
        <div class="consola" id="salida">Pulsa “Enviar petición” para ver la respuesta del servidor.</div>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
