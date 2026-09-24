import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { renderEmailTemplate } from './email-templates';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly transport;
  private readonly from: string;
  constructor(config: ConfigService) {
    super();
    this.from = config.getOrThrow('SMTP_FROM');
    this.transport = nodemailer.createTransport({
      host: config.getOrThrow('SMTP_HOST'),
      port: Number(config.get('SMTP_PORT', 587)),
      secure: Number(config.get('SMTP_PORT', 587)) === 465,
      auth: config.get('SMTP_USER') ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASSWORD') } : undefined,
    });
  }
  async process(job: Job<{ to: string; template: string; variables: Record<string, string> }>) {
    const rendered = renderEmailTemplate(job.data.template, job.data.variables);
    await this.transport.sendMail({
      from: this.from,
      to: job.data.to,
      subject: rendered.subject,
      text: rendered.plainText,
      html: rendered.html,
    });
    return { sent: true };
  }
}


@Processor('maintenance')
export class MaintenanceProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) { super(); }
  async process(job: Job) { if (job.name === 'release-reservations') return this.release(); if (job.name === 'expire-promotions') return this.prisma.coupon.updateMany({ where: { active: true, expiresAt: { lte: new Date() } }, data: { active: false } }); if (job.name === 'abandoned-carts') return this.abandoned(); if (job.name === 'low-stock-alerts') return this.lowStock(); if (job.name === 'process-account-deletions') return this.processDeletions(); throw new Error(`Unknown maintenance job: ${job.name}`); }
  private async processDeletions() { const cutoff = new Date(Date.now() - 30 * 86_400_000); const users = await this.prisma.user.findMany({ where: { status: 'PENDING_DELETION', deletedAt: { lte: cutoff } }, select: { id: true } }); let processed = 0; for (const user of users) { await this.prisma.$transaction(async (tx) => { await tx.address.deleteMany({ where: { userId: user.id } }); await tx.cart.deleteMany({ where: { userId: user.id } }); await tx.wishlist.deleteMany({ where: { userId: user.id } }); const reviews = await tx.review.findMany({ where: { userId: user.id }, select: { id: true } }); for (const review of reviews) { await tx.reviewMedia.deleteMany({ where: { reviewId: review.id } }); await tx.review.update({ where: { id: review.id }, data: { body: '[review removed by account deletion]', title: 'Removed review' } }); } await tx.user.update({ where: { id: user.id }, data: { email: `deleted+${user.id}@invalid.local`, firstName: 'Deleted', lastName: 'Customer', phone: null, avatarUrl: null, passwordHash: 'ACCOUNT_DELETED', emailVerifiedAt: null, twoFactorSecret: null, twoFactorEnabled: false } }); await tx.auditLog.create({ data: { actorId: null, action: 'account.deletion_completed', resourceType: 'User', resourceId: user.id } }); }); processed++; } return { processed }; }
  private async release() { const reservations = await this.prisma.inventoryReservation.findMany({ where: { expiresAt: { lte: new Date() }, releasedAt: null, convertedAt: null }, take: 100 }); let count = 0; for (const row of reservations) await this.prisma.$transaction(async (tx) => { const claim = await tx.inventoryReservation.updateMany({ where: { id: row.id, releasedAt: null, convertedAt: null }, data: { releasedAt: new Date() } }); if (!claim.count) return; await tx.inventory.update({ where: { id: row.inventoryId }, data: { available: { increment: row.quantity }, reserved: { decrement: row.quantity }, version: { increment: 1 } } }); await tx.inventoryTransaction.create({ data: { inventoryId: row.inventoryId, reason: 'RELEASE', availableDelta: row.quantity, reservedDelta: -row.quantity, referenceType: 'ORDER', referenceId: row.orderId } }); count++; }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); return { released: count }; }
  private async abandoned() { const carts = await this.prisma.cart.findMany({ where: { userId: { not: null }, updatedAt: { lte: new Date(Date.now() - 24 * 3_600_000) }, items: { some: {} } }, select: { id: true, userId: true, updatedAt: true }, take: 100 }); let created = 0; for (const cart of carts) { const prior = await this.prisma.notification.findFirst({ where: { userId: cart.userId, type: 'ABANDONED_CART', createdAt: { gte: cart.updatedAt } } }); if (!prior) { await this.prisma.notification.create({ data: { userId: cart.userId!, channel: 'IN_APP', type: 'ABANDONED_CART', subject: 'Your cart is waiting', body: 'Items in your cart may sell out.', data: { cartId: cart.id } } }); created++; } } return { identified: carts.length, created }; }
  private async lowStock() { const candidates = await this.prisma.inventory.findMany({ take: 500, include: { variant: { select: { sku: true, product: { select: { name: true } } } } } }); const rows = candidates.filter((row) => row.available <= row.lowStockThreshold); const admins = await this.prisma.user.findMany({ where: { status: 'ACTIVE', roles: { some: { role: { OR: [{ name: 'SUPER_ADMIN' }, { permissions: { some: { permission: { key: 'inventory.read' } } } }] } } } }, select: { id: true } }); let created = 0; for (const row of rows) for (const admin of admins) { const prior = await this.prisma.notification.findFirst({ where: { userId: admin.id, type: 'LOW_STOCK', createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) }, data: { path: '$.inventoryId', equals: row.id } } }); if (!prior) { await this.prisma.notification.create({ data: { userId: admin.id, channel: 'IN_APP', type: 'LOW_STOCK', subject: `Low stock: ${row.variant.sku}`, body: `${row.variant.product.name} has ${row.available} available.`, data: { inventoryId: row.id } } }); created++; } } return { checked: rows.length, created }; }
}
