import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptSeedText(plaintext: string): string {
  const hex =
    process.env.ENCRYPTION_KEY_HEX ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(hex.slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

async function main() {
  console.log('Iniciando sembrado de datos para MediConnect Pro...');

  await prisma.auditLog.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.user.deleteMany();

  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        id: 'clinic-ramos-arizpe',
        code: 'MC-RA-01',
        name: 'MediConnect Ramos Arizpe UTC',
        address: 'Blvd. Miguel Ramos Arizpe 1420, Zona Industrial',
        city: 'Ramos Arizpe',
        state: 'Coahuila',
        phone: '844-488-1200',
        latitude: 25.5529,
        longitude: -100.9465,
      },
    }),
    prisma.clinic.create({
      data: {
        id: 'clinic-saltillo-norte',
        code: 'MC-SLW-02',
        name: 'MediConnect Saltillo Norte',
        address: 'Blvd. Venustiano Carranza 2450, Col. República',
        city: 'Saltillo',
        state: 'Coahuila',
        phone: '844-415-8830',
        latitude: 25.4463,
        longitude: -100.9922,
      },
    }),
    prisma.clinic.create({
      data: {
        id: 'clinic-torreon-esp',
        code: 'MC-TRC-03',
        name: 'Centro Especialidades Torreón',
        address: 'Av. Morelos 980 Pte., Centro',
        city: 'Torreón',
        state: 'Coahuila',
        phone: '871-712-4500',
        latitude: 25.5428,
        longitude: -103.4068,
      },
    }),
  ]);

  const adminPass = await bcrypt.hash('Admin2026!', 12);
  const doctorPass = await bcrypt.hash('Doctor2026!', 12);
  const recepPass = await bcrypt.hash('Recep2026!', 12);
  const patientPass = await bcrypt.hash('Paciente2026!', 12);

  const adminUser = await prisma.user.create({
    data: {
      id: 'user-admin-01',
      email: 'admin@mediconnect.mx',
      passwordHash: adminPass,
      fullName: 'Ing. Gabriel Reyes Morales (Dir. TI)',
      role: 'ADMIN',
      phone: '844-400-0001',
    },
  });

  const doctor1User = await prisma.user.create({
    data: {
      id: 'user-doc-01',
      email: 'dra.martinez@mediconnect.mx',
      passwordHash: doctorPass,
      fullName: 'Dra. Elena Martínez Vega',
      role: 'DOCTOR',
      phone: '844-400-0010',
    },
  });

  const doctor2User = await prisma.user.create({
    data: {
      id: 'user-doc-02',
      email: 'dr.ramirez@mediconnect.mx',
      passwordHash: doctorPass,
      fullName: 'Dr. Carlos Ramírez Lozano',
      role: 'DOCTOR',
      phone: '844-400-0011',
    },
  });

  await prisma.user.create({
    data: {
      id: 'user-recep-01',
      email: 'recepcion@mediconnect.mx',
      passwordHash: recepPass,
      fullName: 'Laura Mendoza Flores',
      role: 'RECEPTIONIST',
      phone: '844-400-0020',
    },
  });

  const patientUser = await prisma.user.create({
    data: {
      id: 'user-patient-01',
      email: 'paciente@mediconnect.mx',
      passwordHash: patientPass,
      fullName: 'Julio Francisco Guzmán Juárez',
      role: 'PATIENT',
      phone: '844-555-2026',
    },
  });

  const doctor1 = await prisma.doctor.create({
    data: {
      id: 'doc-01',
      userId: doctor1User.id,
      clinicId: clinics[0].id,
      specialty: 'Cardiología Clínica',
      licenseNumber: 'CED-COA-849201',
      consultationFee: 850,
      scheduleSummary: 'Lun-Vie 09:00-17:00',
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      id: 'doc-02',
      userId: doctor2User.id,
      clinicId: clinics[1].id,
      specialty: 'Medicina Interna y Telemedicina',
      licenseNumber: 'CED-COA-731504',
      consultationFee: 650,
      scheduleSummary: 'Lun-Sáb 08:00-16:00',
    },
  });

  const appt1 = await prisma.appointment.create({
    data: {
      id: 'appt-01',
      folio: 'MC-2026-1001',
      patientId: patientUser.id,
      doctorId: doctor1.id,
      clinicId: clinics[0].id,
      scheduledAt: new Date('2026-11-20T10:00:00.000Z'),
      durationMinutes: 30,
      mode: 'PRESENCIAL',
      status: 'CONFIRMED',
      reason: 'Evaluación cardiovascular preventiva y control de presión arterial',
      feeType: 'INSURANCE',
      baseAmount: 850,
      finalAmount: 552.5,
      paymentStatus: 'PAID',
      paymentProviderRef: 'pi_mc_2026_1001_seed',
      isHolidayWarning: false,
    },
  });

  await prisma.appointment.create({
    data: {
      id: 'appt-02',
      folio: 'MC-2026-1002',
      patientId: patientUser.id,
      doctorId: doctor2.id,
      clinicId: clinics[1].id,
      scheduledAt: new Date('2026-11-21T16:30:00.000Z'),
      durationMinutes: 30,
      mode: 'TELEMEDICINA',
      status: 'CONFIRMED',
      reason: 'Seguimiento metabólico remoto vía sala cifrada WebRTC',
      feeType: 'CORPORATE',
      baseAmount: 650,
      finalAmount: 520,
      paymentStatus: 'PAID',
      paymentProviderRef: 'pi_mc_2026_1002_seed',
      meetingRoomUrl: 'https://meet.mediconnect.local/sala/mc-2026-1002',
      isHolidayWarning: false,
    },
  });

  await prisma.medicalRecord.create({
    data: {
      id: 'rec-01',
      appointmentId: appt1.id,
      patientId: patientUser.id,
      doctorId: doctor1.id,
      icd10Code: 'I10',
      icd10Title: 'Essential (primary) hypertension',
      vitalSignsJson: 'TA: 122/78 mmHg | FC: 70 lpm | SpO2: 98% | Temp: 36.5 °C',
      diagnosisEncrypted: encryptSeedText(
        'Hipertensión arterial esencial controlada en estadio inicial (NOM-004-SSA3-2012).',
      ),
      clinicalNotesEncrypted: encryptSeedText(
        'Paciente asintomático. Buena adherencia a dieta hiposódica y ejercicio aeróbico moderado 150 min/sem.',
      ),
      prescriptionEncrypted: encryptSeedText(
        'Losartán 50 mg vía oral cada 24 horas por la mañana. Control domiciliario de TA 2 veces por semana.',
      ),
      digitalSignatureHash: crypto
        .createHash('sha256')
        .update('rec-01|doc-01|I10|2026')
        .digest('hex'),
    },
  });

  // Demo X-API-Key (almacenada únicamente como hash SHA-256)
  const demoApiKey = 'mc_live_utc_dwi_demo_key_2026';
  await prisma.apiKey.create({
    data: {
      userId: adminUser.id,
      name: 'Llave Demo Swagger / Postman',
      keyPrefix: demoApiKey.slice(0, 15),
      keyHash: crypto.createHash('sha256').update(demoApiKey).digest('hex'),
      isActive: true,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: 'SYSTEM_SEED',
        resource: '/prisma/seed',
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        details: 'Inicialización de sedes Coahuila, médicos, citas y expediente cifrado AES-256-GCM',
      },
      {
        userId: doctor1User.id,
        userEmail: doctor1User.email,
        action: 'ECE_SIGN_RECORD',
        resource: '/api/v1/medical-records/rec-01',
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        details: 'Expediente NOM-004 firmado con SHA-256 y cifrado AES-256-GCM',
      },
    ],
  });

  console.log('Seed completado con éxito.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
