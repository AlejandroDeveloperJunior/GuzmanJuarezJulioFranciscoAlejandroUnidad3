import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Clínicas y Sedes')
@Controller('clinics')
export class ClinicsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista las sedes clínicas con caché de segundo nivel' })
  async findAll() {
    const cached = this.cache.get<unknown[]>('clinics:all');
    if (cached) {
      return { source: 'singleton-cache', data: cached };
    }
    const data = await this.prisma.clinic.findMany({
      include: {
        _count: { select: { doctors: true, appointments: true } },
      },
      orderBy: { name: 'asc' },
    });
    this.cache.set('clinics:all', data, 60);
    return { source: 'database', data };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una clínica y sus médicos adscritos' })
  async findOne(@Param('id') id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        doctors: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });
    if (!clinic) throw new NotFoundException('Clínica no encontrada');
    return clinic;
  }
}
