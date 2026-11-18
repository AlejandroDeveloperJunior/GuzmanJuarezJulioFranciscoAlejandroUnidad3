import { Module } from '@nestjs/common';
import { MedicalRecordRepository } from './medical-record.repository';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordRepository, MedicalRecordsService],
  exports: [MedicalRecordsService, MedicalRecordRepository],
})
export class MedicalRecordsModule {}
