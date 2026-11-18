import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AppointmentRepository } from './appointment.repository';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [BillingModule],
  controllers: [AppointmentsController],
  providers: [AppointmentRepository, AppointmentsService],
  exports: [AppointmentsService, AppointmentRepository],
})
export class AppointmentsModule {}
