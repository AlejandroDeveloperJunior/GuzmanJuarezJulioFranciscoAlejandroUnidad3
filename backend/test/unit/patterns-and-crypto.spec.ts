import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '../../src/common/cache/cache.service';
import { AesGcmService } from '../../src/common/crypto/aes-gcm.service';
import { SanitizeInputPipe } from '../../src/common/pipes/sanitize-input.pipe';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';
import { AppointmentRepository } from '../../src/modules/appointments/appointment.repository';
import { FeeCalculatorContext } from '../../src/modules/billing/fee-strategy';
import { PaymentGatewayAdapter } from '../../src/modules/billing/payment-gateway.adapter';
import { NotificationSenderFactory } from '../../src/modules/notifications/notification.factory';

describe('Pruebas Unitarias — Patrones de Diseño, Criptografía y Lógica Clínica', () => {
  test('Singleton: CacheService retorna la misma instancia y revoca tokens JWT en lista negra', () => {
    const a = CacheService.getInstance();
    const b = CacheService.getInstance();
    expect(a).toBe(b);

    a.blacklistToken('jti-test-123', 60);
    expect(b.isTokenBlacklisted('jti-test-123')).toBe(true);
    expect(b.isTokenBlacklisted('jti-other')).toBe(false);
  });

  test('Strategy: FeeCalculatorContext calcula tarifas STANDARD, INSURANCE y CORPORATE', () => {
    const std = FeeCalculatorContext.calculate(1000, 'STANDARD');
    const ins = FeeCalculatorContext.calculate(1000, 'INSURANCE');
    const corp = FeeCalculatorContext.calculate(1000, 'CORPORATE');

    expect(std.finalAmount).toBe(1000);
    expect(ins.finalAmount).toBe(650);
    expect(corp.finalAmount).toBe(800);
  });

  test('Factory Method: NotificationSenderFactory instancia EMAIL, SMS y WHATSAPP', () => {
    const factory = new NotificationSenderFactory();
    const email = factory.create('EMAIL').send({
      recipient: 'paciente@mediconnect.mx',
      subject: 'Cita',
      body: 'Confirmada',
    });
    const sms = factory.create('SMS').send({
      recipient: '8441234567',
      subject: 'Cita',
      body: 'Confirmada',
    });
    const wa = factory.create('WHATSAPP').send({
      recipient: '8441234567',
      subject: 'Cita',
      body: 'Confirmada',
    });

    expect(email.channel).toBe('EMAIL');
    expect(sms.channel).toBe('SMS');
    expect(wa.channel).toBe('WHATSAPP');
  });

  test('Adapter: PaymentGatewayAdapter procesa pago y reembolso desacoplado', async () => {
    const adapter = new PaymentGatewayAdapter();
    const payment = await adapter.processPayment({
      folio: 'MC-2026-9999',
      amountMxn: 552.5,
      patientEmail: 'paciente@mediconnect.mx',
    });
    expect(payment.status).toBe('PAID');
    expect(payment.currency).toBe('MXN');

    const refund = await adapter.refundTransaction(payment.transactionId, 552.5);
    expect(refund.status).toBe('REFUNDED');
  });

  test('Criptografía AES-256-GCM y TOTP MFA RFC-6238', () => {
    const cryptoSvc = new AesGcmService();
    const original = 'Diagnóstico reservado NOM-004: Glucosa 105 mg/dL';
    const cipher = cryptoSvc.encrypt(original);

    expect(cipher).not.toContain('Glucosa');
    expect(cryptoSvc.decrypt(cipher)).toBe(original);

    // Manipulación de ciphertext debe fallar la etiqueta de autenticación GCM
    const tampered = `${cipher.slice(0, -2)}ff`;
    expect(() => cryptoSvc.decrypt(tampered)).toThrow();

    const secret = cryptoSvc.generateTotpSecret();
    const code = cryptoSvc.generateTotpCode(secret);
    expect(cryptoSvc.verifyTotpCode(secret, code)).toBe(true);
    expect(cryptoSvc.verifyTotpCode(secret, '000000')).toBe(code === '000000');
  });

  test('Pipeline SanitizeInputPipe elimina payloads XSS', () => {
    const pipe = new SanitizeInputPipe();
    const clean = pipe.sanitize({
      reason: '<script>alert("xss")</script>Dolor de cabeza',
      note: 'javascript:alert(1) Revisión',
    }) as { reason: string; note: string };

    expect(clean.reason).toBe('Dolor de cabeza');
    expect(clean.note).not.toContain('javascript:');
  });

  test('Repository Mock + Observer: AppointmentsService detecta colisión de horarios y emite evento', async () => {
    const mockRepo = {
      findDoctorById: jest.fn().mockResolvedValue({
        id: 'doc-01',
        clinicId: 'clinic-01',
        consultationFee: 850,
        user: { fullName: 'Dra. Elena' },
      }),
      findPatientById: jest.fn().mockResolvedValue({
        id: 'pat-01',
        email: 'paciente@mediconnect.mx',
        fullName: 'Julio Guzmán',
        role: 'PATIENT',
      }),
      findConflictingAppointment: jest
        .fn()
        .mockResolvedValueOnce({ id: 'a1', folio: 'MC-2026-1001', scheduledAt: new Date() })
        .mockResolvedValueOnce(null),
      create: jest.fn().mockImplementation(async (data) => ({ id: 'new-appt', ...data })),
    } as unknown as AppointmentRepository;

    const paymentAdapter = new PaymentGatewayAdapter();
    const emitter = new EventEmitter2();
    const emitSpy = jest.spyOn(emitter, 'emit');

    const svc = new AppointmentsService(mockRepo, paymentAdapter, emitter);
    const actor = {
      sub: 'pat-01',
      email: 'paciente@mediconnect.mx',
      role: 'PATIENT',
      fullName: 'Julio Guzmán',
      authMethod: 'jwt' as const,
    };

    // Primer llamado debe lanzar ConflictException por traslape
    await expect(
      svc.create(
        {
          doctorId: 'doc-01',
          scheduledAt: '2026-12-05T10:00:00.000Z',
          mode: 'TELEMEDICINA',
          reason: 'Consulta de control',
          feeType: 'INSURANCE',
        },
        actor,
      ),
    ).rejects.toThrow(ConflictException);

    // Segundo llamado sin traslape debe aplicar Strategy (850 * 0.65 = 552.5) y emitir Observer
    const res = await svc.create(
      {
        doctorId: 'doc-01',
        scheduledAt: '2026-12-05T12:00:00.000Z',
        mode: 'TELEMEDICINA',
        reason: 'Consulta de control',
        feeType: 'INSURANCE',
        notificationChannel: 'WHATSAPP',
      },
      actor,
    );

    expect(res.feeBreakdown.finalAmount).toBe(552.5);
    expect(emitSpy).toHaveBeenCalledWith('appointment.confirmed', expect.anything());
  });
});
