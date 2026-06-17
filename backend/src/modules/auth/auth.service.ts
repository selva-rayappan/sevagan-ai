import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.active) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens({ sub: admin.id, email: admin.email, role: admin.role });
  }

  async refreshToken(token: string) {
    try {
      const secret = this.configService.get<string>('jwt.refreshSecret', 'sevagan-refresh-secret-change-in-prod');
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
      if (!admin || !admin.active) throw new UnauthorizedException();
      return this.generateTokens({ sub: admin.id, email: admin.email, role: admin.role });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(payload: JwtPayload) {
    const secret = this.configService.get<string>('jwt.secret', 'sevagan-jwt-secret-change-in-prod');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret', 'sevagan-refresh-secret-change-in-prod');

    const accessToken = this.jwtService.sign(payload, { secret, expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { secret: refreshSecret, expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
}
