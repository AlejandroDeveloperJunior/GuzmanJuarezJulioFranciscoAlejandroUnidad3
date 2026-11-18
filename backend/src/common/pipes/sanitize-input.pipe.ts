import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Patrón Middleware / Pipeline: saneamiento recursivo de entradas para mitigar XSS
 * e inyección de scripts HTML antes de alcanzar los controladores de negocio.
 */
@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'custom') return value;
    return this.sanitize(value);
  }

  sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitize(val);
      }
      return sanitized;
    }
    return value;
  }
}
