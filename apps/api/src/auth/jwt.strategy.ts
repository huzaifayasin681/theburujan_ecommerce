import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';

const cookieExtractor = (request: Request): string | null => (request.cookies as Record<string, string> | undefined)?.access_token ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]), secretOrKey: config.getOrThrow('JWT_ACCESS_SECRET') });
  }
  async validate(payload: { sub: string; sid: string; email: string }): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, status: 'ACTIVE', deletedAt: null, sessions: { some: { id: payload.sid, revokedAt: null, expiresAt: { gt: new Date() } } } },
      select: { id: true, email: true, roles: { select: { role: { select: { name: true, permissions: { select: { permission: { select: { key: true } } } } } } } } },
    });
    if (!user) throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Session is no longer valid' });
    const roles = user.roles.map(({ role }) => role.name);
    const permissions = [...new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)))];
    return { id: user.id, sessionId: payload.sid, email: user.email, roles, permissions };
  }
}
