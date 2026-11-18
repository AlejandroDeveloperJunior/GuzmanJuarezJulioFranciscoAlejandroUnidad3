import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateAppointmentRecordInput {
  folio: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  scheduledAt: Date;
  durationMinutes: number;
  mode: string;
  status: string;
  reason: string;
  feeType: string;
  baseAmount: number;
  finalAmount: number;
  paymentStatus: string;
  paymentProviderRef: string | null;
  meetingRoomUrl: string | null;
  isHolidayWarning: boolean;
}

/**
 * Patrón Estructural Repository: encapsula las consultas Prisma de Agenda/Citas
 * desacoplando la lógica de negocio del ORM para facilitar pruebas unitarias con mocks.
 */
@Injectable()
export class AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDoctorById(doctorId: string) {
    return this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true, clinic: true },
    });
  }

  findPatientById(patientId: string) {
    return this.prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, email: true, fullName: true, role: true },
    });
  }

  async findConflictingAppointment(
    doctorId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ) {
    const windowStart = new Date(scheduledAt.getTime() - durationMinutes * 60000 + 1000);
    const windowEnd = new Date(scheduledAt.getTime() + durationMinutes * 60000 - 1000);
    return this.prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { not: 'CANCELLED' },
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      select: { id: true, folio: true, scheduledAt: true },
    });
  }

  create(data: CreateAppointmentRecordInput) {
    return this.prisma.appointment.create({
      data,
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        doctor: {
          include: {
            user: { select: { fullName: true, email: true } },
            clinic: true,
          },
        },
        clinic: true,
      },
    });
  }

  findManyByRole(userId: string, role: string) {
    const where =
      role === 'PATIENT'
        ? { patientId: userId }
        : role === 'DOCTOR'
          ? { doctor: { userId } }
          : {};

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        doctor: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
        clinic: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        doctor: { include: { user: { select: { id: true, fullName: true } } } },
        clinic: true,
      },
    });
  }

  updateStatus(id: string, status: string, paymentStatus?: string) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(paymentStatus ? { paymentStatus } : {}),
      },
    });
  }
}
