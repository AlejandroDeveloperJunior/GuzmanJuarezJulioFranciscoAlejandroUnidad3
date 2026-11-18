import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotificationChannel,
  NotificationReceipt,
  NotificationSenderFactory,
} from './notification.factory';

export class AppointmentConfirmedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly folio: string,
    public readonly patientEmail: string,
    public readonly doctorName: string,
    public readonly scheduledAt: string,
    public readonly channel: NotificationChannel = 'EMAIL',
  ) {}
}

/**
 * Patrón Observer (Event-Driven / Pub-Sub): escucha el evento appointment.confirmed
 * y despacha notificaciones de forma desacoplada sin bloquear la respuesta HTTP.
 */
@Injectable()
export class NotificationEventListener {
  constructor(
    private readonly factory: NotificationSenderFactory,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('appointment.confirmed')
  async handleAppointmentConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
    const sender = this.factory.create(event.channel);
    const receipt = sender.send({
      recipient: event.patientEmail,
      subject: `Confirmación de Cita ${event.folio} — MediConnect Pro`,
      body: `Tu consulta con ${event.doctorName} quedó confirmada para ${event.scheduledAt}.`,
    });

    const recent = this.cache.get<NotificationReceipt[]>('notifications:recent') || [];
    recent.unshift(receipt);
    this.cache.set('notifications:recent', recent.slice(0, 20), 3600);

    await this.prisma.auditLog
      .create({
        data: {
          userEmail: event.patientEmail,
          action: 'EVENT_APPOINTMENT_CONFIRMED',
          resource: `/appointments/${event.appointmentId}`,
          status: 'SUCCESS',
          details: `Observer -> ${receipt.channel} (${receipt.provider}) folio ${event.folio}`,
        },
      })
      .catch(() => undefined);
  }
}
