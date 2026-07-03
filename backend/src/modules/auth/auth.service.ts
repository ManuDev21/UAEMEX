import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { AuthResponse } from './dto/auth-response.type';
import { LoginInput } from './dto/login.input';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private async buildTokens(payload: JwtUserPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpires'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpires'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async login(input: LoginInput, ip?: string): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };
    const tokens = await this.buildTokens(payload);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    await this.usersService.updateLastLogin(user.id);
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: 'auth',
      details: `Inicio de sesion: ${user.email}`,
      ipAddress: ip,
    });

    const safeUser = await this.usersService.findOne(user.id);
    return { ...tokens, user: safeUser };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let decoded: JwtUserPayload;
    try {
      decoded = await this.jwtService.verifyAsync<JwtUserPayload>(
        refreshToken,
        { secret: this.config.get<string>('jwt.refreshSecret') },
      );
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const user = await this.usersService.getWithRefreshToken(decoded.sub);
    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new ForbiddenException('Acceso denegado');
    }
    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new ForbiddenException('Acceso denegado');
    }

    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };
    const tokens = await this.buildTokens(payload);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
    const safeUser = await this.usersService.findOne(user.id);
    return { ...tokens, user: safeUser };
  }

  async logout(userId: number): Promise<boolean> {
    await this.usersService.setRefreshToken(userId, null);
    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
      entity: 'auth',
      details: 'Cierre de sesion',
    });
    return true;
  }
}
