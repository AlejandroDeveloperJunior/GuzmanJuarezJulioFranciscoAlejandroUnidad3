import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'paciente.nuevo@mediconnect.mx' })
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  email!: string;

  @ApiProperty({ example: 'Paciente2026!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir al menos una mayúscula y un número',
  })
  password!: string;

  @ApiProperty({ example: 'Ana Sofía Martínez' })
  @IsString()
  @MinLength(3)
  fullName!: string;

  @ApiPropertyOptional({ example: '844-123-4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['PATIENT', 'DOCTOR', 'RECEPTIONIST'] })
  @IsOptional()
  @IsIn(['PATIENT', 'DOCTOR', 'RECEPTIONIST'])
  role?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'paciente@mediconnect.mx' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MediConnect2026!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: '123456', description: 'Código TOTP MFA de 6 dígitos (si MFA está activo)' })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Cliente Móvil / Postman QA' })
  @IsString()
  @MinLength(3)
  name!: string;
}

export class ToggleMfaDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código MFA debe ser de 6 dígitos numéricos' })
  code!: string;
}
