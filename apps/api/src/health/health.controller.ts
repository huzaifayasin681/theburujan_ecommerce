import { Controller, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import Redis from 'ioredis';
import { Public } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  @Get() async check(@Query('deep') deep?: string) {
    if (deep !== 'true') { try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', timestamp: new Date().toISOString(), services: { application: 'up', database: 'up' } }; } catch { throw new ServiceUnavailableException({ code: 'SERVICE_UNAVAILABLE', message: 'A required service is unavailable' }); } }
    const redis = new Redis(this.config.getOrThrow('REDIS_URL'), { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 0 });
    const s3 = new S3Client({ endpoint: this.config.getOrThrow('S3_ENDPOINT'), region: this.config.getOrThrow('S3_REGION'), forcePathStyle: this.config.get('S3_FORCE_PATH_STYLE', 'true') === 'true', credentials: { accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY'), secretAccessKey: this.config.getOrThrow('S3_SECRET_KEY') } });
    try {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, redis.connect().then(() => redis.ping()), s3.send(new HeadBucketCommand({ Bucket: this.config.getOrThrow('S3_BUCKET') }))]);
      return { status: 'ok', timestamp: new Date().toISOString(), services: { application: 'up', database: 'up', redis: 'up', storage: 'up' } };
    } catch { throw new ServiceUnavailableException({ code: 'SERVICE_UNAVAILABLE', message: 'A required service is unavailable' }); }
    finally { redis.disconnect(); s3.destroy(); }
  }
}
