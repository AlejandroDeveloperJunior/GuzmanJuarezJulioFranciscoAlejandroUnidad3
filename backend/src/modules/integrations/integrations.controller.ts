import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { IntegrationsService } from './integrations.service';

@ApiTags('Web Services de Terceros')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Public()
  @Get('icd10')
  @ApiQuery({ name: 'term', example: 'diabetes' })
  @ApiOperation({ summary: 'Consulta en vivo de diagnósticos CIE-10 / ICD-10-CM vía NIH Clinical Tables API' })
  searchIcd10(@Query('term') term = 'diabetes') {
    return this.integrations.searchIcd10(term);
  }

  @Public()
  @Get('weather')
  @ApiQuery({ name: 'lat', required: false, example: 25.5428 })
  @ApiQuery({ name: 'lon', required: false, example: -100.9729 })
  @ApiQuery({ name: 'city', required: false, example: 'Ramos Arizpe / Saltillo' })
  @ApiOperation({ summary: 'Telemetría climática en vivo vía Open-Meteo REST API' })
  getWeather(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('city') city?: string,
  ) {
    return this.integrations.getWeatherForClinic(
      lat ? Number(lat) : 25.5428,
      lon ? Number(lon) : -100.9729,
      city || 'Saltillo / Ramos Arizpe',
    );
  }

  @Public()
  @Get('geocode')
  @ApiQuery({ name: 'q', example: 'Universidad Tecnológica de Coahuila Ramos Arizpe' })
  @ApiOperation({ summary: 'Geocodificación en vivo vía OpenStreetMap Nominatim API' })
  geocode(@Query('q') q = 'Ramos Arizpe Coahuila') {
    return this.integrations.geocodeLocation(q);
  }

  @Public()
  @Get('holidays')
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  @ApiOperation({ summary: 'Consulta de días feriados oficiales en México vía Nager.Date API' })
  holidays(@Query('year') year = '2026') {
    return this.integrations.getMexicanHolidays(Number(year) || 2026);
  }
}
