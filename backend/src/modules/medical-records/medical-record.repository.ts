import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateMedicalRecordData {
  appointmentId: string | null;
  patientId: string;
  doctorId: string;
  icd10Code: string;
  icd10Title: string;
  vitalSignsJson: string;
  diagnosisEncrypted: string;
  clinicalNotesEncrypted: string;
  prescriptionEncrypted: string;
  digitalSignatureHash: string;
}

/**
 * Patrón Estructural Repository: aísla el acceso a los expedientes clínicos
 * cifrados bajo NOM-004-SSA3-2012.
 */
@Injectable()
export class MedicalRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDoctorByUserId(userId: string) {
    return this.prisma.doctor.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true } } },
    });
  }

  findAnyDoctor() {
    return this.prisma.doctor.findFirst({
      include: { user: { select: { fullName: true } } },
    });
  }

  findPatientById(patientId: string) {
    return this.prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, fullName: true, email: true },
    });
  }

  create(data: CreateMedicalRecordData) {
    return this.prisma.medicalRecord.create({
      data,
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        doctor: {
          include: { user: { select: { fullName: true } }, clinic: true },
        },
      },
    });
  }

  findManyByRole(userId: string, role: string) {
    const where = role === 'PATIENT' ? { patientId: userId } : {};
    return this.prisma.medicalRecord.findMany({
      where,
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        doctor: {
          include: { user: { select: { fullName: true } }, clinic: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
