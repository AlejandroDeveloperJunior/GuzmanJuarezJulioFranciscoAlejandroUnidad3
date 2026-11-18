import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR =
  process.env.SCREENSHOT_DIR ||
  'C:\\Users\\julio.admin\\.gemini\\antigravity\\scratch\\mediconnect_screenshots';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:4000';

fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  try {
    // 1. Login Page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=MediConnect Pro');
    await page.screenshot({ path: path.join(OUT_DIR, '01_login.png'), fullPage: false });

    // Login as Paciente
    await page.click('button:has-text("Paciente")');
    await page.click('button:has-text("Ingresar de forma segura")');
    await page.waitForSelector('text=Bienvenido,');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, '02_dashboard.png'), fullPage: false });

    // 2. Agenda y Pagos (Strategy + Adapter + Observer)
    await page.click('a:has-text("Agenda y Pagos")');
    await page.waitForSelector('text=Nueva Reserva Clínica');
    await page.waitForTimeout(500);
    await page.fill('input[type="datetime-local"]', '2026-12-18T11:30');
    await page.click('button:has-text("Confirmar y Pagar Cita")');
    await page.waitForSelector('text=confirmada y pagada');
    await page.screenshot({ path: path.join(OUT_DIR, '03_appointments.png'), fullPage: false });

    // 3. Expediente NOM-004 + NIH ICD-10-CM + AES-256-GCM
    await page.click('a:has-text("Expediente NOM-004")');
    await page.waitForSelector('text=Evidencia de Cifrado en Reposo');
    await page.fill('input[placeholder*="Buscar diagnóstico"]', 'asthma');
    await page.click('button:has-text("Buscar")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '04_medical_records_icd10.png'), fullPage: false });

    // 4. Mapa de Sedes (Leaflet + Nominatim)
    await page.click('a:has-text("Mapa de Sedes")');
    await page.waitForSelector('text=MediConnect Ramos Arizpe UTC');
    await page.fill('input[placeholder*="Buscar ciudad"]', 'Universidad Tecnologica de Coahuila');
    await page.click('button:has-text("Geocodificar con Nominatim")');
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(OUT_DIR, '05_clinics_map_nominatim.png'), fullPage: false });

    // 5. Centro de Seguridad (como Paciente -> prueba bloqueo CSRF y RBAC 403 + XSS)
    await page.click('a:has-text("Centro de Seguridad")');
    await page.waitForSelector('text=Laboratorio de Pruebas de Seguridad');
    await page.click('button:has-text("1. Probar Ataque sin CSRF")');
    await page.waitForSelector('text=CSRF BLOQUEADO');
    await page.click('button:has-text("2. Probar RBAC")');
    await page.waitForSelector('text=RBAC PROTEGIDO');
    await page.screenshot({ path: path.join(OUT_DIR, '06_security_lab_rbac_csrf.png'), fullPage: false });

    // Logout & Login as Admin TI to capture full Audit Log + API Keys
    await page.click('button:has-text("Cerrar sesión segura")');
    await page.waitForSelector('text=Iniciar Sesión');
    await page.click('button:has-text("Admin TI")');
    await page.click('button:has-text("Ingresar de forma segura")');
    await page.waitForSelector('text=Bienvenido,');
    await page.click('a:has-text("Centro de Seguridad")');
    await page.waitForSelector('text=Bitácora Inmutable de Auditoría');
    await page.click('button:has-text("Generar Llave")');
    await page.waitForSelector('text=Nueva X-API-Key:');
    await page.screenshot({ path: path.join(OUT_DIR, '07_security_audit_admin.png'), fullPage: true });

    // 6. Web Services Propios (REST + API Key)
    await page.click('a:has-text("Web Services (REST/SOAP)")');
    await page.waitForSelector('text=Endpoints Propios NestJS');
    await page.click('button:has-text("X-API-Key")');
    await page.click('button:has-text("GET /api/v1/appointments")');
    await page.waitForSelector('text=MC-2026-1001');
    await page.screenshot({ path: path.join(OUT_DIR, '08_ws_propio_rest.png'), fullPage: false });

    // 7. Web Service Propio SOAP XML
    await page.click('button:has-text("Web Service Propio (SOAP)")');
    await page.waitForSelector('text=Enviar Petición SOAP XML');
    await page.click('button:has-text("Enviar Petición SOAP XML")');
    await page.waitForSelector('text=VerifyAppointmentFolioResponse');
    await page.screenshot({ path: path.join(OUT_DIR, '09_ws_propio_soap.png'), fullPage: false });

    // 8. Web Services de Terceros (En Vivo)
    await page.click('button:has-text("Web Services de Terceros")');
    await page.waitForSelector('text=NIH Clinical Tables');
    await page.click('button:has-text("1. NIH Clinical Tables")');
    await page.waitForSelector('text=National Library of Medicine');
    await page.screenshot({ path: path.join(OUT_DIR, '10_ws_terceros.png'), fullPage: false });

    // 9. Swagger OpenAPI UI
    await page.goto(`${API_URL}/api/docs`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=MediConnect Pro');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, '11_swagger_openapi.png'), fullPage: false });

    if (consoleErrors.length > 0) {
      throw new Error(`Errores en consola detectados durante E2E: ${consoleErrors.join(' | ')}`);
    }

    console.log('✅ E2E Playwright completado con éxito. Capturas guardadas en:', OUT_DIR);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ E2E falló:', err);
  process.exit(1);
});
