import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { AllowApiKey, Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

export class CreateDoctorDto {
  @IsString()
  fullName!: string;

  @IsString()
  email!: string;

  @IsString()
  clinicId!: string;

  @IsString()
  specialty!: string;

  @IsString()
  licenseNumber!: string;

  @IsNumber()
  @Min(100)
  consultationFee!: number;

  @IsOptional()
  @IsString()
  scheduleSummary?: string;
}

@ApiTags('Directorio Médico')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'specialty', required: false })
  @ApiQuery({ name: 'clinicId', required: false })
  @ApiOperation({ summary: 'Consulta el directorio médico filtrable por especialidad o sede' })
  findAll(
    @Query('specialty') specialty?: string,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.prisma.doctor.findMany({
      where: {
        ...(clinicId ? { clinicId } : {}),
        ...(specialty ? { specialty: { contains: specialty } } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        clinic: true,
      },
      orderBy: { specialty: 'asc' },
    });
  }

  @ApiBearerAuth()
  @AllowApiKey()
  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Registra un médico especialista (solo rol ADMIN - RBAC)' })
  async create(@Body() dto: CreateDoctorDto) {
    const passwordHash = await bcrypt.hash('DoctorTemp2026!', 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName,
        role: 'DOCTOR',
      },
    });
    return this.prisma.doctor.create({
      data: {
        userId: user.id,
        clinicId: dto.clinicId,
        specialty: dto.specialty,
        licenseNumber: dto.licenseNumber,
        consultationFee: dto.consultationFee,
        scheduleSummary: dto.scheduleSummary || 'Lun-Vie 09:00-18:00',
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        clinic: true,
      },
    });
  }
}
