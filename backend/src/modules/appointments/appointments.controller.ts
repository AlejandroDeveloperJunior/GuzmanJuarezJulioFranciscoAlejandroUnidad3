import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AllowApiKey } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { FeeCalculatorContext, FeeType } from '../billing/fee-strategy';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './appointments.dto';
import { AppointmentsService } from './appointments.service';

@ApiTags('Agenda Inteligente y Citas')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @AllowApiKey()
  @Get()
  @ApiOperation({ summary: 'Lista las citas filtradas por rol (RBAC anti-IDOR)' })
  findAll(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.appointmentsService.findAllForUser(req.user);
  }

  @Get('quote')
  @ApiOperation({ summary: 'Cotiza honorarios aplicando el patrón Strategy (STANDARD/INSURANCE/CORPORATE)' })
  quote(
    @Query('baseAmount') baseAmount = '650',
    @Query('feeType') feeType: FeeType = 'STANDARD',
  ) {
    const amount = Number(baseAmount) || 650;
    return FeeCalculatorContext.calculate(amount, feeType);
  }

  @AllowApiKey()
  @Post()
  @ApiOperation({
    summary: 'Agenda cita médica con control anti-colisión, Strategy de tarifas, Adapter de pago y Observer',
  })
  async create(
    @Body() dto: CreateAppointmentDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    const isHoliday = await this.checkMexicanHoliday(dto.scheduledAt);
    return this.appointmentsService.create(dto, req.user, isHoliday);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualiza el estado de una cita (con reembolso vía Adapter si se cancela)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.appointmentsService.updateStatus(id, dto.status, req.user);
  }

  private async checkMexicanHoliday(isoDate: string): Promise<boolean> {
    try {
      const dayPrefix = isoDate.slice(0, 10);
      const year = dayPrefix.slice(0, 4);
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MX`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) return false;
      const holidays = (await res.json()) as Array<{ date: string }>;
      return holidays.some((h) => h.date === dayPrefix);
    } catch {
      return false;
    }
  }
}
