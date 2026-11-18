import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/main';

describe('Pruebas de Integración (Supertest) — Seguridad, REST y SOAP', () => {
  let app: INestApplication;
  let patientToken: string;
  let patientCsrf: string;
  let patientCookies: string[];
  let doctorToken: string;
  let doctorCsrf: string;
  let doctorCookies: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // Login Paciente
    const patRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'paciente@mediconnect.mx', password: 'Paciente2026!' })
      .expect(200);
    patientToken = patRes.body.accessToken;
    patientCsrf = patRes.body.csrfToken;
    const rawPatCookies = patRes.headers['set-cookie'];
    patientCookies = Array.isArray(rawPatCookies) ? rawPatCookies : [String(rawPatCookies || '')];

    // Login Médico
    const docRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'dra.martinez@mediconnect.mx', password: 'Doctor2026!' })
      .expect(200);
    doctorToken = docRes.body.accessToken;
    doctorCsrf = docRes.body.csrfToken;
    const rawDocCookies = docRes.headers['set-cookie'];
    doctorCookies = Array.isArray(rawDocCookies) ? rawDocCookies : [String(rawDocCookies || '')];
  });

  afterAll(async () => {
    await app.close();
  });

  test('GET /api/v1/health responde estado de arquitectura y cabeceras Helmet', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('CSRF Guard bloquea POST autenticado sin X-CSRF-Token (403 Forbidden)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: 'doc-01',
        scheduledAt: '2026-12-20T10:00:00.000Z',
        mode: 'PRESENCIAL',
        reason: 'Prueba sin CSRF',
        feeType: 'STANDARD',
      });
    expect(res.status).toBe(403);
  });

  test('RBAC Guard bloquea a PATIENT de crear Expediente Clínico (403) y permite a DOCTOR (201)', async () => {
    const payload = {
      patientId: 'user-patient-01',
      icd10Code: 'J00',
      icd10Title: 'Acute nasopharyngitis',
      vitalSigns: 'TA: 115/75 | Temp: 36.7 C',
      diagnosis: 'Cuadro respiratorio leve viral',
      clinicalNotes: 'Sin dificultad respiratoria',
      prescription: 'Paracetamol 500 mg c/8h PRN',
    };

    await request(app.getHttpServer())
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${patientToken}`)
      .set('Cookie', patientCookies)
      .set('X-CSRF-Token', patientCsrf)
      .send(payload)
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('Cookie', doctorCookies)
      .set('X-CSRF-Token', doctorCsrf)
      .send(payload)
      .expect(201);

    expect(created.body.diagnosis).toBe(payload.diagnosis);
    expect(created.body.encryptedSample).toContain('AES-256-GCM');
  });

  test('API REST propia acepta autenticación remota vía X-API-Key', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/appointments')
      .set('X-API-Key', 'mc_live_utc_dwi_demo_key_2026')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('Web Service Propio SOAP devuelve contrato WSDL y responde sobre XML', async () => {
    const wsdl = await request(app.getHttpServer()).get('/soap/clinical?wsdl').expect(200);
    expect(wsdl.text).toContain('MediConnectClinicalService');

    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://mediconnect.utc.mx/soap/clinical">
        <soapenv:Body>
          <tns:VerifyAppointmentFolioRequest>
            <folio>MC-2026-1001</folio>
          </tns:VerifyAppointmentFolioRequest>
        </soapenv:Body>
      </soapenv:Envelope>`;

    const soapRes = await request(app.getHttpServer())
      .post('/soap/clinical')
      .set('Content-Type', 'text/xml')
      .send(envelope)
      .expect(200);

    expect(soapRes.text).toContain('<found>true</found>');
    expect(soapRes.text).toContain('MC-2026-1001');
  });

  test('Bloqueo de cuenta tras 5 intentos fallidos (HTTP 423) y revocación JWT en logout', async () => {
    const email = `locktest.${Date.now()}@mediconnect.mx`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'LockUser2026!',
        fullName: 'Usuario Prueba Bloqueo',
      })
      .expect(201);

    for (let i = 1; i <= 4; i += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword1!' })
        .expect(401);
    }

    // 5to intento fallido activa bloqueo HTTP 423 Locked
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1!' })
      .expect(423);

    // Probar revocación JWT al hacer logout
    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recepcion@mediconnect.mx', password: 'Recep2026!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${freshLogin.body.accessToken}`)
      .set('Cookie', freshLogin.headers['set-cookie'])
      .set('X-CSRF-Token', freshLogin.body.csrfToken)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${freshLogin.body.accessToken}`)
      .expect(401);
  });
});
