import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class IntegrationsService {
  constructor(private readonly cache: CacheService) {}

  async searchIcd10(term: string) {
    const clean = (term || 'diabetes').trim();
    const cacheKey = `ext:icd10:${clean.toLowerCase()}`;
    const cached = this.cache.get<unknown>(cacheKey);
    if (cached) return { source: 'cache', ...(cached as object) };

    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(clean)}&maxList=8`;
    const started = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data = (await res.json()) as [number, string[], unknown, [string, string][]];
      const items = (data[3] || []).map(([code, name]) => ({ code, name }));
      const payload = {
        provider: 'NIH National Library of Medicine — Clinical Tables ICD-10-CM API',
        endpoint: url,
        latencyMs: Date.now() - started,
        totalMatches: data[0] || items.length,
        items,
      };
      this.cache.set(cacheKey, payload, 600);
      return { source: 'live-external-api', ...payload };
    } catch (error) {
      return {
        source: 'fallback',
        provider: 'NIH ICD-10-CM API',
        endpoint: url,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Error de red',
        items: [{ code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' }],
      };
    }
  }

  async getWeatherForClinic(lat = 25.5428, lon = -100.9729, city = 'Saltillo / Ramos Arizpe') {
    const cacheKey = `ext:weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = this.cache.get<unknown>(cacheKey);
    if (cached) return { source: 'cache', ...(cached as object) };

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=America%2FMonterrey`;
    const started = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data = (await res.json()) as {
        current?: {
          time: string;
          temperature_2m: number;
          relative_humidity_2m: number;
          wind_speed_10m: number;
          weather_code: number;
        };
      };
      const temp = data.current?.temperature_2m ?? 22;
      const clinicalAdvisory =
        temp >= 32
          ? 'Alerta térmica: recomendar hidratación oral en consulta externa'
          : temp <= 10
            ? 'Alerta respiratoria por frente frío: reforzar triaje respiratorio'
            : 'Condiciones ambientales estables para traslado a sede clínica';

      const payload = {
        provider: 'Open-Meteo Weather REST API',
        endpoint: url,
        city,
        latencyMs: Date.now() - started,
        current: data.current,
        clinicalAdvisory,
      };
      this.cache.set(cacheKey, payload, 300);
      return { source: 'live-external-api', ...payload };
    } catch (error) {
      return {
        source: 'fallback',
        provider: 'Open-Meteo Weather REST API',
        city,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Error de red',
        clinicalAdvisory: 'Telemetría temporalmente no disponible',
      };
    }
  }

  async geocodeLocation(query: string) {
    const clean = (query || 'Ramos Arizpe Coahuila').trim();
    const cacheKey = `ext:nominatim:${clean.toLowerCase()}`;
    const cached = this.cache.get<unknown>(cacheKey);
    if (cached) return { source: 'cache', ...(cached as object) };

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean)}&format=json&limit=5`;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MediConnectPro-UTC-DWI/1.0' },
        signal: AbortSignal.timeout(6000),
      });
      const items = (await res.json()) as Array<{
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
        type: string;
      }>;
      const payload = {
        provider: 'OpenStreetMap Nominatim Geocoding REST API',
        endpoint: url,
        latencyMs: Date.now() - started,
        results: items.map((item) => ({
          placeId: item.place_id,
          displayName: item.display_name,
          lat: Number(item.lat),
          lon: Number(item.lon),
          type: item.type,
        })),
      };
      this.cache.set(cacheKey, payload, 600);
      return { source: 'live-external-api', ...payload };
    } catch (error) {
      return {
        source: 'fallback',
        provider: 'OpenStreetMap Nominatim',
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Error de red',
        results: [],
      };
    }
  }

  async getMexicanHolidays(year = 2026) {
    const cacheKey = `ext:holidays:${year}`;
    const cached = this.cache.get<unknown>(cacheKey);
    if (cached) return { source: 'cache', ...(cached as object) };

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/MX`;
    const started = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const holidays = (await res.json()) as Array<{
        date: string;
        localName: string;
        name: string;
      }>;
      const payload = {
        provider: 'Nager.Date Public Holidays API (México)',
        endpoint: url,
        latencyMs: Date.now() - started,
        year,
        count: holidays.length,
        holidays,
      };
      this.cache.set(cacheKey, payload, 3600);
      return { source: 'live-external-api', ...payload };
    } catch (error) {
      return {
        source: 'fallback',
        provider: 'Nager.Date Public Holidays API',
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Error de red',
        holidays: [],
      };
    }
  }
}
