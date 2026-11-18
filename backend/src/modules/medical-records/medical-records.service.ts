import { Injectable, NotFoundException } from '@nestjs/common';
import { AesGcmService } from '../../common/crypto/aes-gcm.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { MedicalRecordRepository } from './medical-record.repository';
import { CreateMedicalRecordDto } from './medical-records.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly repository: MedicalRecordRepository,
    private readonly aesGcm: AesGcmService,
  ) {}

  async create(dto: CreateMedicalRecordDto, actor: AuthenticatedUser) {
    const patient = await this.repository.findPatientById(dto.patientId);
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const doctor =
      (await this.repository.findDoctorByUserId(actor.sub)) ||
      (await this.repository.findAnyDoctor());
    if (!doctor) throw new NotFoundException('No hay perfil médico asignado');

    const diagnosisEncrypted = this.aesGcm.encrypt(dto.diagnosis);
    const clinicalNotesEncrypted = this.aesGcm.encrypt(dto.clinicalNotes);
    const prescriptionEncrypted = this.aesGcm.encrypt(dto.prescription);
    const digitalSignatureHash = this.aesGcm.sha256(
      `${patient.id}|${doctor.id}|${dto.icd10Code}|${dto.diagnosis}|${new Date().toISOString()}`,
    );

    const record = await this.repository.create({
      appointmentId: dto.appointmentId ?? null,
      patientId: patient.id,
      doctorId: doctor.id,
      icd10Code: dto.icd10Code,
      icd10Title: dto.icd10Title,
      vitalSignsJson: dto.vitalSigns,
      diagnosisEncrypted,
      clinicalNotesEncrypted,
      prescriptionEncrypted,
      digitalSignatureHash,
    });

    return this.presentRecord(record);
  }

  async findAllForUser(user: AuthenticatedUser) {
    const rows = await this.repository.findManyByRole(user.sub, user.role);
    return rows.map((row) => this.presentRecord(row));
  }

  private presentRecord(record: {
    id: string;
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
    createdAt: Date;
    patient: { id: string; fullName: string; email: string };
    doctor: { specialty: string; licenseNumber: string; user: { fullName: string }; clinic: { name: string } };
  }) {
    return {
      id: record.id,
      appointmentId: record.appointmentId,
      icd10Code: record.icd10Code,
      icd10Title: record.icd10Title,
      vitalSigns: record.vitalSignsJson,
      diagnosis: this.aesGcm.decrypt(record.diagnosisEncrypted),
      clinicalNotes: this.aesGcm.decrypt(record.clinicalNotesEncrypted),
      prescription: this.aesGcm.decrypt(record.prescriptionEncrypted),
      encryptedSample: `${record.diagnosisEncrypted.slice(0, 44)}... [AES-256-GCM]`,
      digitalSignatureHash: record.digitalSignatureHash,
      createdAt: record.createdAt,
      patient: record.patient,
      doctor: {
        fullName: record.doctor.user.fullName,
        specialty: record.doctor.specialty,
        licenseNumber: record.doctor.licenseNumber,
        clinicName: record.doctor.clinic.name,
      },
    };
  }
}
