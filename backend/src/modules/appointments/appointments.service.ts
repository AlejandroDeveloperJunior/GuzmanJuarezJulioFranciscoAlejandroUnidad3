import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { FeeCalculatorContext } from '../billing/fee-strategy';
import { PaymentGatewayAdapter } from '../billing/payment-gateway.adapter';
import { AppointmentConfirmedEvent } from '../notifications/notification.listener';
import { AppointmentRepository } from './appointment.repository';
import { CreateAppointmentDto } from './appointments.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly paymentGateway: PaymentGatewayAdapter,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateAppointmentDto,
    currentUser: AuthenticatedUser,
    isHolidayDate = false,
  ) {
    const doctor = await this.repository.findDoctorById(dto.doctorId);
    if (!doctor) {
      throw new NotFoundException('Médico no encontrado en el directorio');
    }

    const targetPatientId =
      ['ADMIN', 'RECEPTIONIST'].includes(currentUser.role) && dto.patientId
        ? dto.patientId
        : currentUser.sub;

    const patient = await this.repository.findPatientById(targetPatientId);
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const scheduledDate = new Date(dto.scheduledAt);
    const duration = dto.durationMinutes ?? 30;

    // Algoritmo anti-colisión de citas médicas
    const conflict = await this.repository.findConflictingAppointment(
      doctor.id,
      scheduledDate,
      duration,
    );
    if (conflict) {
      throw new ConflictException(
        `Colisión de horario detectada: el médico ya tiene la cita ${conflict.folio} en esa franja horaria.`,
      );
    }

    // Patrón Strategy: cálculo dinámico de tarifa según convenio
    const feeBreakdown = FeeCalculatorContext.calculate(
      doctor.consultationFee,
      dto.feeType,
    );

    const folio = `MC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let paymentStatus = 'PENDING';
    let status = 'PENDING';
    let paymentProviderRef: string | null = null;

    if (dto.payNow !== false) {
      // Patrón Adapter / Facade: cobro desacoplado con pasarela externa
      const payment = await this.paymentGateway.processPayment({
        folio,
        amountMxn: feeBreakdown.finalAmount,
        patientEmail: patient.email,
      });
      paymentStatus = payment.status;
      status = 'CONFIRMED';
      paymentProviderRef = payment.transactionId;
    }

    const meetingRoomUrl =
      dto.mode === 'TELEMEDICINA'
        ? `https://meet.mediconnect.local/sala/${folio.toLowerCase()}`
        : null;

    const created = await this.repository.create({
      folio,
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: doctor.clinicId,
      scheduledAt: scheduledDate,
      durationMinutes: duration,
      mode: dto.mode,
      status,
      reason: dto.reason,
      feeType: feeBreakdown.feeType,
      baseAmount: feeBreakdown.baseAmount,
      finalAmount: feeBreakdown.finalAmount,
      paymentStatus,
      paymentProviderRef,
      meetingRoomUrl,
      isHolidayWarning: isHolidayDate,
    });

    if (status === 'CONFIRMED') {
      // Patrón Observer: dispara eventos asíncronos (Factory Method de notificaciones + Bitácora)
      this.eventEmitter.emit(
        'appointment.confirmed',
        new AppointmentConfirmedEvent(
          created.id,
          created.folio,
          patient.email,
          doctor.user.fullName,
          scheduledDate.toISOString(),
          dto.notificationChannel || 'EMAIL',
        ),
      );
    }

    return {
      appointment: created,
      feeBreakdown,
      patternsApplied: ['Repository', 'Strategy', 'Adapter', 'Observer', 'FactoryMethod'],
    };
  }

  findAllForUser(user: AuthenticatedUser) {
    return this.repository.findManyByRole(user.sub, user.role);
  }

  async updateStatus(id: string, status: string, user: AuthenticatedUser) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Cita no encontrada');

    if (user.role === 'PATIENT' && existing.patientId !== user.sub) {
      throw new ForbiddenException('No puedes modificar citas de otro paciente');
    }
    if (user.role === 'PATIENT' && status !== 'CANCELLED') {
      throw new ForbiddenException('Un paciente únicamente puede cancelar sus propias citas');
    }

    let nextPaymentStatus = existing.paymentStatus;
    if (status === 'CANCELLED' && existing.paymentStatus === 'PAID' && existing.paymentProviderRef) {
      const refund = await this.paymentGateway.refundTransaction(
        existing.paymentProviderRef,
        existing.finalAmount,
      );
      nextPaymentStatus = refund.status;
    }

    return this.repository.updateStatus(id, status, nextPaymentStatus);
  }
}
