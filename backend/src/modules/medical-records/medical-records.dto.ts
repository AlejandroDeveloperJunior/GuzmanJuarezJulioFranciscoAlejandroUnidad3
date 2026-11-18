import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 'user-patient-01' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiProperty({ example: 'E11.9' })
  @IsString()
  @MinLength(2)
  icd10Code!: string;

  @ApiProperty({ example: 'Type 2 diabetes mellitus without complications' })
  @IsString()
  @MinLength(3)
  icd10Title!: string;

  @ApiProperty({ example: '120/80 mmHg | 72 lpm | 36.6 °C' })
  @IsString()
  vitalSigns!: string;

  @ApiProperty({ example: 'Paciente con control glucémico estable; continuar seguimiento.' })
  @IsString()
  @MinLength(5)
  diagnosis!: string;

  @ApiProperty({ example: 'Se revisa bitácora metabólica y adherencia nutricional.' })
  @IsString()
  @MinLength(5)
  clinicalNotes!: string;

  @ApiProperty({ example: 'Metformina 850 mg VO cada 12 horas por 30 días.' })
  @IsString()
  @MinLength(5)
  prescription!: string;
}
