import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.active) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    await this.auditService.log({
      actorId: admin.id,
      actorType: 'ADMIN_USER',
      action: 'LOGIN',
      entityType: 'AdminUser',
      entityId: admin.id,
    });

    return this.generateTokens({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      tokenVersion: admin.tokenVersion,
    });
  }

  async refreshToken(token: string) {
    let payload: JwtPayload;
    try {
      const secret = this.configService.get<string>('jwt.refreshSecret', 'sevagan-refresh-secret-change-in-prod');
      payload = this.jwtService.verify<JwtPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.active) throw new UnauthorizedException('Invalid refresh token');
    if (admin.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Rotation: bump tokenVersion so the presented refresh token (and any other
    // outstanding access token) can never be reused after this point.
    const rotated = await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { tokenVersion: { increment: 1 } },
    });

    return this.generateTokens({
      sub: rotated.id,
      email: rotated.email,
      role: rotated.role,
      tokenVersion: rotated.tokenVersion,
    });
  }

  async logout(adminId: string) {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  private generateTokens(payload: JwtPayload) {
    const secret = this.configService.get<string>('jwt.secret', 'sevagan-jwt-secret-change-in-prod');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret', 'sevagan-refresh-secret-change-in-prod');

    const accessToken = this.jwtService.sign(payload, { secret, expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { secret: refreshSecret, expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
}
