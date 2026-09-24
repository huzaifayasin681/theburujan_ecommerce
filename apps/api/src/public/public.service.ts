import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService, private readonly jobs: JobsService, private readonly config: ConfigService) {}
  async settings() {
    const rows = await this.prisma.setting.findMany({ where: { isPublic: true, NOT: [{ key: { contains: 'secret' } }, { key: { contains: 'password' } }, { key: { contains: 'token' } }, { key: { contains: 'credential' } }] } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
  shippingMethods() {
    return this.prisma.shippingMethod.findMany({
      where: { active: true, zone: { active: true } },
      select: { id: true, name: true, type: true, basePrice: true, freeAbove: true, zone: { select: { name: true, countries: true } } },
      orderBy: { name: 'asc' },
    });
  }
  categories() { return this.prisma.category.findMany({ where: { active: true, parentId: null }, take: 500, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, description: true, imageUrl: true, children: { where: { active: true }, take: 500, orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true } } } }); }
  brands() { return this.prisma.brand.findMany({ where: { active: true }, take: 500, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, logoUrl: true, description: true } }); }
  async subscribe(email: string, ip: string) {
    const subscription = await this.prisma.newsletterSubscription.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), consentedAt: new Date(), consentIp: ip },
      update: { unsubscribedAt: null, consentedAt: new Date(), consentIp: ip },
      select: { id: true, email: true, consentedAt: true, verifiedAt: true },
    });
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([this.prisma.newsletterVerificationToken.updateMany({ where: { subscriptionId: subscription.id, usedAt: null }, data: { usedAt: new Date() } }), this.prisma.newsletterVerificationToken.create({ data: { subscriptionId: subscription.id, tokenHash: createHash('sha256').update(raw).digest('hex'), expiresAt: new Date(Date.now() + 24 * 3_600_000) } })]);
    await this.jobs.sendEmail({ to: subscription.email, template: 'newsletter', variables: { url: `${this.config.getOrThrow('APP_URL')}/newsletter/verify?token=${encodeURIComponent(raw)}` } }, `newsletter:${subscription.id}:${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`);
    return { email: subscription.email, consentedAt: subscription.consentedAt, verificationRequired: !subscription.verifiedAt };
  }
  async verifyNewsletter(raw: string) { const tokenHash = createHash('sha256').update(raw).digest('hex'); const token = await this.prisma.newsletterVerificationToken.findUnique({ where: { tokenHash } }); if (!token || token.usedAt || token.expiresAt <= new Date()) throw new UnauthorizedException({ code: 'NEWSLETTER_TOKEN_INVALID', message: 'Newsletter verification token is invalid or expired' }); await this.prisma.$transaction([this.prisma.newsletterVerificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }), this.prisma.newsletterSubscription.update({ where: { id: token.subscriptionId }, data: { verifiedAt: new Date(), unsubscribedAt: null } })]); return { verified: true }; }
  async unsubscribe(email: string) {
    await this.prisma.newsletterSubscription.updateMany({
      where: { email: email.toLowerCase() },
      data: { unsubscribedAt: new Date() },
    });
  }
  async contact(data: { name: string; email: string; phone?: string; subject: string; message: string }) {
    const message = await this.prisma.contactMessage.create({
      data: { ...data, email: data.email.toLowerCase() },
      select: { id: true, createdAt: true },
    });
    const variables = { name: data.name, email: data.email.toLowerCase(), subject: data.subject, message: data.message };
    await Promise.all([
      this.jobs.sendEmail({ to: this.config.getOrThrow('SMTP_FROM'), template: 'contact', variables }, `contact:${message.id}:admin`),
      this.jobs.sendEmail({ to: data.email.toLowerCase(), template: 'contact-received', variables }, `contact:${message.id}:customer`),
    ]);
    return message;
  }
}
