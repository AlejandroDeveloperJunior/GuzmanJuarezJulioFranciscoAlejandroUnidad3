import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Servicio criptográfico para cumplimiento NOM-004-SSA3-2012:
 * - Cifrado simétrico AES-256-GCM en reposo para diagnósticos, notas y recetas.
 * - Firma SHA-256 de integridad clínica.
 * - Generación y verificación TOTP (RFC 6238) para MFA sin dependencias frágiles.
 */
@Injectable()
export class AesGcmService {
  private readonly key: Buffer;

  constructor() {
    const hex =
      process.env.ENCRYPTION_KEY_HEX ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    this.key = Buffer.from(hex.slice(0, 64), 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de texto cifrado AES-256-GCM inválido');
    }
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  generateTotpSecret(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = crypto.randomBytes(20);
    let secret = '';
    for (let i = 0; i < bytes.length; i += 1) {
      secret += alphabet[bytes[i] % alphabet.length];
    }
    return secret;
  }

  generateTotpCode(secret: string, windowOffset = 0): string {
    const key = this.decodeBase32(secret);
    const step = Math.floor(Date.now() / 1000 / 30) + windowOffset;
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(step / 0x100000000), 0);
    buf.writeUInt32BE(step >>> 0, 4);

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    return String(binary % 1_000_000).padStart(6, '0');
  }

  verifyTotpCode(secret: string, code: string): boolean {
    const clean = code.trim();
    if (!/^\d{6}$/.test(clean)) return false;
    return [-1, 0, 1].some((offset) => this.generateTotpCode(secret, offset) === clean);
  }

  private decodeBase32(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const ch of clean) {
      const idx = alphabet.indexOf(ch);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(out);
  }
}
