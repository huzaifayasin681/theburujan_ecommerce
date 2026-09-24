import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
@Injectable()
export class JobsService implements OnModuleInit {
  constructor(@InjectQueue('email') private readonly email: Queue, @InjectQueue('maintenance') private readonly maintenance: Queue) {}
  async onModuleInit() {
    await this.maintenance.add('release-reservations', {}, { jobId: 'release-reservations', repeat: { every: 60_000 }, removeOnComplete: 100, removeOnFail: 500 });
    await this.maintenance.add('expire-promotions', {}, { jobId: 'expire-promotions', repeat: { every: 300_000 }, removeOnComplete: 100, removeOnFail: 500 });
    await this.maintenance.add('abandoned-carts', {}, { jobId: 'abandoned-carts', repeat: { every: 3_600_000 }, removeOnComplete: 100, removeOnFail: 500 });
    await this.maintenance.add('low-stock-alerts', {}, { jobId: 'low-stock-alerts', repeat: { every: 3_600_000 }, removeOnComplete: 100, removeOnFail: 500 });
    await this.maintenance.add('process-account-deletions', {}, { jobId: 'process-account-deletions', repeat: { every: 86_400_000 }, removeOnComplete: 100, removeOnFail: 500 });
  }
  sendEmail(input: { to: string; template: string; variables: Record<string, string> }, jobId: string) { return this.email.add('transactional', input, { jobId, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 }); }
}
