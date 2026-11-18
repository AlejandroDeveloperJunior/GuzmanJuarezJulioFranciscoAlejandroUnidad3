import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'doc-id-01' })
  @IsString()
  doctorId!: string;

  @ApiProperty({ example: '2026-11-24T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  durationMinutes?: number;

  @ApiProperty({ enum: ['PRESENCIAL', 'TELEMEDICINA'], default: 'PRESENCIAL' })
  @IsIn(['PRESENCIAL', 'TELEMEDICINA'])
  mode!: string;

  @ApiProperty({ example: 'Control de glucosa y revisión cardiovascular' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiProperty({ enum: ['STANDARD', 'INSURANCE', 'CORPORATE'], default: 'STANDARD' })
  @IsIn(['STANDARD', 'INSURANCE', 'CORPORATE'])
  feeType!: 'STANDARD' | 'INSURANCE' | 'CORPORATE';

  @ApiPropertyOptional({ enum: ['EMAIL', 'SMS', 'WHATSAPP'], default: 'EMAIL' })
  @IsOptional()
  @IsIn(['EMAIL', 'SMS', 'WHATSAPP'])
  notificationChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  payNow?: boolean;

  @ApiPropertyOptional({ description: 'Solo ADMIN/RECEPTIONIST para agendar a un paciente específico' })
  @IsOptional()
  @IsString()
  patientId?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] })
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])
  status!: string;
}
