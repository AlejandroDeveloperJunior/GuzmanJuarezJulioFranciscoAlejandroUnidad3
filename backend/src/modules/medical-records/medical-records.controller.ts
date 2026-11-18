import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AllowApiKey } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CreateMedicalRecordDto } from './medical-records.dto';
import { MedicalRecordsService } from './medical-records.service';

@ApiTags('Expediente Clínico Electrónico (NOM-004)')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @AllowApiKey()
  @Get()
  @ApiOperation({
    summary: 'Consulta expedientes clínicos descifrados al vuelo desde AES-256-GCM (aislado por rol)',
  })
  findAll(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.medicalRecordsService.findAllForUser(req.user);
  }

  @Roles('DOCTOR', 'ADMIN')
  @Post()
  @ApiOperation({
    summary: 'Registra nota clínica NOM-004 con cifrado AES-256-GCM en reposo (solo DOCTOR/ADMIN)',
  })
  create(
    @Body() dto: CreateMedicalRecordDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.medicalRecordsService.create(dto, req.user);
  }
}
