# NFL Web — Unidad 3: Aplicación Web

Sitio web en **PHP 8 + MySQL** para consultar y administrar los 32 equipos de la NFL.

| Requerimiento | Cómo se cumple | Archivos |
|---|---|---|
| Mecanismos de seguridad | Contraseñas cifradas con bcrypt, sesiones seguras, tokens CSRF, consultas preparadas (anti inyección SQL), escape de salida (anti XSS), bloqueo tras 5 intentos fallidos, cabeceras HTTP de seguridad, carpetas privadas bloqueadas | `includes/auth.php`, `login.php`, `registro.php`, `.htaccess` |
| Web services de terceros | **Google reCAPTCHA v2** en login y registro; **Google Maps** con la ubicación de cada estadio | `includes/recaptcha.php`, `includes/equipos.php` (`mapa_url`), `equipo.php` |
| Web services propios | API REST en JSON con GET, POST, PUT y DELETE, protegida con token Bearer | `api/equipos.php`, `perfil.php`, `servicios.php` |

## Instalación (XAMPP)

1. Copia la carpeta del proyecto dentro de `C:\xampp\htdocs\`.
2. Inicia **Apache** y **MySQL** en el panel de XAMPP.
3. Abre `http://localhost/phpmyadmin` → pestaña **Importar** → elige `database/nfl_db.sql`.
4. Si tu MySQL tiene contraseña, edítala en `config.php`.
5. Entra a `http://localhost/<carpeta-del-proyecto>/`.

Usuario de prueba: **demo@nfl.com** / **Demo1234**

### Claves de Google
- `config.php` trae las claves de **prueba** oficiales de reCAPTCHA (siempre validan y muestran un aviso rojo de “solo pruebas”). Para quitar el aviso, crea tus claves en <https://www.google.com/recaptcha/admin> (tipo *v2 casilla*, dominio `localhost`) y reemplázalas.
- Google Maps funciona sin clave. Si tienes una clave de Maps Embed API, colócala en `GOOGLE_MAPS_API_KEY`.

## API REST propia

Base: `http://localhost/<carpeta>/api/equipos.php`

| Método | Ruta | Token |
|---|---|---|
| GET | `api/equipos.php` (filtros `?conferencia=AFC&division=Oeste&q=texto`) | No |
| GET | `api/equipos.php?id=14` | No |
| POST | `api/equipos.php` (cuerpo JSON) | Sí |
| PUT | `api/equipos.php?id=14` (cuerpo JSON, campos parciales) | Sí |
| DELETE | `api/equipos.php?id=14` | Sí |

El token se genera en **Mi perfil** y se envía como `Authorization: Bearer <token>`. En la base de datos solo se guarda su hash SHA-256.

Ejemplo con curl:
```bash
curl -X POST http://localhost/nfl-web/api/equipos.php \
  -H "Authorization: Bearer TU_TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Mexico City Aztecas","abreviatura":"MEX","ciudad":"Ciudad de México","conferencia":"NFC","division":"Sur","estadio":"Estadio Banorte","fundacion":2026,"latitud":19.3029,"longitud":-99.1505,"color":"#006847"}'
```
La página **Servicios Web** del sitio tiene un probador integrado con botones de ejemplo.

Códigos de respuesta: 200, 201, 400, 401, 404, 405, 422.

## Estructura
```
api/equipos.php        Web service propio (REST/JSON)
assets/                CSS y JS (probador de la API)
database/nfl_db.sql    Esquema y datos iniciales
includes/              Conexión, sesión/seguridad, reCAPTCHA, lógica de equipos
index.php              Inicio
login.php, registro.php, logout.php, perfil.php
equipos.php, equipo.php, equipo_form.php, equipo_eliminar.php
servicios.php          Documentación y pruebas de servicios web
```
