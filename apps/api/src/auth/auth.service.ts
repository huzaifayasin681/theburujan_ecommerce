import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateEmailDto } from './dto';
import { newTotpSecret, verifyTotp } from './totp';
import { JobsService } from '../jobs/jobs.service';

type ClientInfo = { ip?: string; userAgent?: string };
type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number; userId:string };
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly jobs:JobsService) {}

  async register(input: RegisterDto): Promise<{ user: object; verificationToken?: string }> {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists' });
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const rawToken = randomBytes(32).toString('base64url');
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, passwordHash, firstName: input.firstName.trim(), lastName: input.lastName.trim(), roles: { create: { role: { connect: { name: 'USER' } } } } }, select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } });
      await tx.verificationToken.create({ data: { userId: created.id, type: 'EMAIL_VERIFY', tokenHash: tokenHash(rawToken), expiresAt: new Date(Date.now() + 24 * 3600_000) } });
      return created;
    });
    await this.jobs.sendEmail({to:user.email,template:'verify',variables:{url:`${this.config.getOrThrow('APP_URL')}/verify-email?token=${encodeURIComponent(rawToken)}`}},`verify:${user.id}:${tokenHash(rawToken).slice(0,12)}`);
    return { user, ...(this.config.get('NODE_ENV') === 'development' ? { verificationToken: rawToken } : {}) };
  }

  async login(input: LoginDto, client: ClientInfo): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() }, select: { id: true, email: true, passwordHash: true, status: true, emailVerifiedAt: true, twoFactorEnabled:true, twoFactorSecret:true } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password)) || user.status !== 'ACTIVE') throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' });
    if (!user.emailVerifiedAt) throw new UnauthorizedException({ code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email address before signing in' });
    if(user.twoFactorEnabled){if(!input.twoFactorCode)throw new UnauthorizedException({code:'TWO_FACTOR_REQUIRED',message:'A two-factor code is required'});let valid=user.twoFactorSecret?verifyTotp(user.twoFactorSecret,input.twoFactorCode):false;if(!valid){const hash=tokenHash(input.twoFactorCode.toUpperCase());const recovery=await this.prisma.twoFactorRecoveryCode.findFirst({where:{userId:user.id,codeHash:hash,usedAt:null}});if(recovery){valid=true;await this.prisma.twoFactorRecoveryCode.update({where:{id:recovery.id},data:{usedAt:new Date()}})}}if(!valid)throw new UnauthorizedException({code:'TWO_FACTOR_INVALID',message:'Two-factor code is invalid'});}
    return this.createSession(user.id, user.email, client);
  }

  async refresh(raw: string, client: ClientInfo): Promise<TokenPair> {
    let payload: { sub: string; sid: string; family: string };
    try { payload = await this.jwt.verifyAsync(raw, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') }); } catch { throw new UnauthorizedException({ code: 'REFRESH_INVALID', message: 'Refresh token is invalid or expired' }); }
    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sid }, include: { user: { select: { email: true, status: true } } } });
    if (!session || session.user.status !== 'ACTIVE' || session.revokedAt || session.expiresAt <= new Date() || !(await argon2.verify(session.refreshTokenHash, raw))) {
      if (session) await this.prisma.userSession.updateMany({ where: { familyId: session.familyId }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException({ code: 'REFRESH_REUSE', message: 'Session is invalid; token family has been revoked' });
    }
    const next = await this.signTokens(payload.sub, session.user.email, session.id, session.familyId);
    await this.prisma.userSession.update({ where: { id: session.id }, data: { refreshTokenHash: await argon2.hash(next.refreshToken), lastUsedAt: new Date(), userAgent: client.userAgent, ipAddress: client.ip } });
    return next;
  }

  async logout(sessionId: string): Promise<void> { await this.prisma.userSession.updateMany({ where: { id: sessionId }, data: { revokedAt: new Date() } }); }
  async logoutAll(userId: string): Promise<void> { await this.prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); }

  async verifyEmail(raw: string): Promise<void> {
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash: tokenHash(raw) } });
    if (!record || !['EMAIL_VERIFY', 'EMAIL_CHANGE'].includes(record.type)) {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Verification token is invalid' });
    }
    if (record.usedAt) {
      if (record.type === 'EMAIL_VERIFY') {
        const user = await this.prisma.user.findUnique({ where: { id: record.userId }, select: { emailVerifiedAt: true } });
        if (user?.emailVerifiedAt) return;
      }
      throw new UnauthorizedException({ code: 'TOKEN_ALREADY_USED', message: 'This verification link has already been used' });
    }
    if (record.expiresAt <= new Date()) {
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Verification link has expired' });
    }
    const changedEmail = record.type === 'EMAIL_CHANGE' && record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata) && typeof record.metadata.email === 'string' ? record.metadata.email : null;
    await this.prisma.$transaction(async (tx) => {
      if (changedEmail && await tx.user.findFirst({ where: { email: changedEmail, id: { not: record.userId } } })) throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists' });
      await tx.user.update({ where: { id: record.userId }, data: { ...(changedEmail ? { email: changedEmail } : {}), emailVerifiedAt: new Date() } });
      await tx.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      if (changedEmail) {
        await tx.userSession.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { actorId: record.userId, action: 'security.email_changed', resourceType: 'User', resourceId: record.userId } });
      }
    });
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true, emailVerifiedAt: true, status: true } });
    if (!user || user.emailVerifiedAt || user.status !== 'ACTIVE') return;
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({ where: { userId: user.id, type: 'EMAIL_VERIFY', usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.verificationToken.create({ data: { userId: user.id, type: 'EMAIL_VERIFY', tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + 24 * 3600_000) } }),
    ]);
    await this.jobs.sendEmail({ to: user.email, template: 'verify', variables: { url: `${this.config.getOrThrow('APP_URL')}/verify-email?token=${encodeURIComponent(raw)}` } }, `verify:${user.id}:${tokenHash(raw).slice(0, 12)}`);
  }

  async requestEmailChange(userId: string, input: UpdateEmailDto): Promise<{ message: string }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, email: true } });
    if (!(await argon2.verify(user.passwordHash, input.password))) throw new UnauthorizedException({ code: 'INVALID_PASSWORD', message: 'Current password is incorrect' });
    if (user.email === email) throw new ConflictException({ code: 'EMAIL_UNCHANGED', message: 'New email must be different' });
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists' });
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({ where: { userId, type: 'EMAIL_CHANGE', usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.verificationToken.create({ data: { userId, type: 'EMAIL_CHANGE', tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + 3600_000), metadata: { email } } }),
      this.prisma.auditLog.create({ data: { actorId: userId, action: 'security.email_change_requested', resourceType: 'User', resourceId: userId } }),
    ]);
    await this.jobs.sendEmail({ to: email, template: 'verify-email-change', variables: { url: `${this.config.getOrThrow('APP_URL')}/verify-email?token=${encodeURIComponent(raw)}` } }, `email-change:${userId}:${tokenHash(raw).slice(0, 12)}`);
    return { message: 'A verification link has been sent to the new email address' };
  }

  async forgotPassword(email: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
    if (!user) return undefined;
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.verificationToken.create({ data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + 3600_000) } });
    await this.jobs.sendEmail({to:email.toLowerCase(),template:'reset',variables:{url:`${this.config.getOrThrow('APP_URL')}/reset-password?token=${encodeURIComponent(raw)}`}},`reset:${user.id}:${tokenHash(raw).slice(0,12)}`);
    return this.config.get('NODE_ENV') === 'development' ? raw : undefined;
  }

  async resetPassword(input: ResetPasswordDto): Promise<void> {
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash: tokenHash(input.token) } });
    if (!record || record.type !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt <= new Date()) throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Reset token is invalid or expired' });
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }), this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), this.prisma.userSession.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } })]);
  }

  async changePassword(userId: string, input: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
    if (!(await argon2.verify(user.passwordHash, input.currentPassword))) throw new UnauthorizedException({ code: 'INVALID_PASSWORD', message: 'Current password is incorrect' });
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(input.newPassword) } }), this.prisma.userSession.updateMany({ where: { userId }, data: { revokedAt: new Date() } })]);
  }

  async beginTwoFactor(userId:string){const secret=newTotpSecret();const user=await this.prisma.user.update({where:{id:userId},data:{twoFactorSecret:secret,twoFactorEnabled:false},select:{email:true}});return{secret,otpauthUrl:`otpauth://totp/Burujan:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Burujan&digits=6&period=30`}}
  async confirmTwoFactor(userId:string,code:string){const user=await this.prisma.user.findUniqueOrThrow({where:{id:userId},select:{twoFactorSecret:true}});if(!user.twoFactorSecret||!verifyTotp(user.twoFactorSecret,code))throw new UnauthorizedException({code:'TWO_FACTOR_INVALID',message:'Authenticator code is invalid'});const recoveryCodes=Array.from({length:10},()=>randomBytes(6).toString('hex').toUpperCase());await this.prisma.$transaction(async tx=>{await tx.twoFactorRecoveryCode.deleteMany({where:{userId}});await tx.twoFactorRecoveryCode.createMany({data:recoveryCodes.map(value=>({userId,codeHash:tokenHash(value)}))});await tx.user.update({where:{id:userId},data:{twoFactorEnabled:true}});await tx.auditLog.create({data:{actorId:userId,action:'security.2fa_enabled',resourceType:'User',resourceId:userId}})});return{recoveryCodes}}
  async disableTwoFactor(userId:string,password:string,code:string){const user=await this.prisma.user.findUniqueOrThrow({where:{id:userId}});if(!(await argon2.verify(user.passwordHash,password))||!user.twoFactorSecret||!verifyTotp(user.twoFactorSecret,code))throw new UnauthorizedException({code:'TWO_FACTOR_INVALID',message:'Password or authenticator code is invalid'});await this.prisma.$transaction([this.prisma.user.update({where:{id:userId},data:{twoFactorEnabled:false,twoFactorSecret:null}}),this.prisma.twoFactorRecoveryCode.deleteMany({where:{userId}}),this.prisma.auditLog.create({data:{actorId:userId,action:'security.2fa_disabled',resourceType:'User',resourceId:userId}})])}

  private async createSession(userId: string, email: string, client: ClientInfo): Promise<TokenPair> {
    const id = randomUUID(); const familyId = randomUUID();
    const tokens = await this.signTokens(userId, email, id, familyId);
    await this.prisma.userSession.create({ data: { id, userId, familyId, refreshTokenHash: await argon2.hash(tokens.refreshToken), userAgent: client.userAgent, ipAddress: client.ip, expiresAt: new Date(Date.now() + 30 * 86400_000) } });
    return tokens;
  }
  private async signTokens(userId: string, email: string, sessionId: string, family: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: sessionId, email }, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '15m' });
    const refreshToken = await this.jwt.signAsync({ sub: userId, sid: sessionId, family }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '30d' });
    return { accessToken, refreshToken, expiresIn: 900, userId };
  }
}
