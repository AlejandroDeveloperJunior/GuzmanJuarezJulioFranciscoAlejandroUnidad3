import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public, SkipCsrf } from '../../common/decorators/public.decorator';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CreateApiKeyDto, LoginDto, RegisterDto, ToggleMfaDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Seguridad y Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfGuard: CsrfGuard,
  ) {}

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Genera cookie firmada y token CSRF Double-Submit' })
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const { rawToken, signedCookie } = this.csrfGuard.generateTokenPair();
    res.cookie('mc_csrf', signedCookie, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { csrfToken: rawToken };
  }

  @Public()
  @SkipCsrf()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Registro seguro con bcrypt (salt=12) y validación DTO' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || '127.0.0.1';
    return this.authService.register(dto, ip);
  }

  @Public()
  @SkipCsrf()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @ApiOperation({
    summary: 'Inicio de sesión con JWT, cookie HttpOnly, MFA TOTP y bloqueo tras 5 fallos',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || '127.0.0.1';
    const result = await this.authService.login(dto, ip);
    if ('refreshToken' in result && result.refreshToken) {
      res.cookie('mc_refresh', result.refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });
    }
    const { rawToken, signedCookie } = this.csrfGuard.generateTokenPair();
    res.cookie('mc_csrf', signedCookie, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    if ('refreshToken' in result) {
      const { refreshToken: _rt, ...safePayload } = result;
      return { ...safePayload, csrfToken: rawToken };
    }
    return result;
  }

  @Public()
  @SkipCsrf()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renueva Access Token usando cookie HttpOnly mc_refresh' })
  refresh(@Req() req: Request) {
    const token = req.cookies?.mc_refresh || req.body?.refreshToken || '';
    return this.authService.refresh(token);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierra sesión y revoca el JWT en la lista negra en caché' })
  logout(@Req() req: Request & { user: AuthenticatedUser }, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('mc_refresh', { path: '/api/v1/auth' });
    return this.authService.logout(req.user.jti, req.user.sub, req.user.email, req.ip || '127.0.0.1');
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Devuelve perfil autenticado sin exponer contraseña ni secretos' })
  me(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.authService.getProfile(req.user.sub);
  }

  @ApiBearerAuth()
  @Get('mfa/setup')
  @ApiOperation({ summary: 'Genera secreto TOTP RFC-6238 para autenticación multifactor' })
  setupMfa(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.authService.setupMfa(req.user.sub);
  }

  @ApiBearerAuth()
  @Post('mfa/enable')
  @ApiOperation({ summary: 'Activa MFA verificando código TOTP de 6 dígitos' })
  enableMfa(@Req() req: Request & { user: AuthenticatedUser }, @Body() dto: ToggleMfaDto) {
    return this.authService.enableMfa(req.user.sub, dto.code);
  }

  @ApiBearerAuth()
  @Post('mfa/disable')
  @ApiOperation({ summary: 'Desactiva MFA para la cuenta actual' })
  disableMfa(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.authService.disableMfa(req.user.sub);
  }

  @ApiBearerAuth()
  @Get('api-keys')
  @ApiOperation({ summary: 'Lista las API Keys activas (solo prefijo y metadatos)' })
  listApiKeys(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.authService.listApiKeys(req.user.sub);
  }

  @ApiBearerAuth()
  @Post('api-keys')
  @ApiOperation({ summary: 'Genera una nueva X-API-Key con almacenamiento SHA-256 en BD' })
  createApiKey(@Req() req: Request & { user: AuthenticatedUser }, @Body() dto: CreateApiKeyDto) {
    return this.authService.createApiKey(req.user.sub, dto.name);
  }

  @ApiBearerAuth()
  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Revoca una API Key existente' })
  revokeApiKey(@Req() req: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.authService.revokeApiKey(req.user.sub, id);
  }
}
