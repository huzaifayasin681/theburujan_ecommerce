import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaVisibility } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
const signatures = [
  {
    mime: 'image/jpeg',
    test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    ext: '.jpg',
  },
  {
    mime: 'image/png',
    test: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ext: '.png',
  },
  {
    mime: 'image/webp',
    test: (b: Buffer) =>
      b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
    ext: '.webp',
  },
];
@Injectable()
export class MediaService {
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow('S3_BUCKET');
    this.client = new S3Client({
      endpoint: config.getOrThrow('S3_ENDPOINT'),
      region: config.get('S3_REGION', 'us-east-1'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: {
        accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow('S3_SECRET_KEY'),
      },
    });
  }
  async upload(userId: string, file?: Express.Multer.File, visibility: MediaVisibility = MediaVisibility.PUBLIC) {
    if (!file)
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'An image file is required',
      });
    const signature = signatures.find(
      (item) => item.mime === file.mimetype && item.test(file.buffer),
    );
    if (!signature)
      throw new BadRequestException({
        code: 'FILE_TYPE_INVALID',
        message: 'Only valid JPEG, PNG, and WebP images are allowed',
      });
    const key = `media/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${signature.ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: signature.mime,
        CacheControl: 'public,max-age=31536000,immutable',
      }),
    );
    const endpoint = this.client.config.endpoint ? await this.client.config.endpoint() : null;
    const url = endpoint
      ? `${endpoint.protocol}//${endpoint.hostname}${endpoint.port ? `:${endpoint.port}` : ''}/${this.bucket}/${key}`
      : key;
    const media = await this.prisma.media.create({
      data: {
        key,
        url,
        mimeType: signature.mime,
        sizeBytes: file.size,
        originalName: Array.from(file.originalname).filter((character) => character.charCodeAt(0) >= 32).join('').slice(0, 255),
        uploadedById: userId,
        visibility,
      },
    });
    return visibility === MediaVisibility.PRIVATE ? { ...media, url: `/api/v1/media/${media.id}/content` } : media;
  }
  async remove(userId: string, id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media)
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media was not found' });
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: media.key }));
    await this.prisma.$transaction([
      this.prisma.media.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: { actorId: userId, action: 'media.deleted', resourceType: 'Media', resourceId: id },
      }),
    ]);
  }
  async update(userId: string, id: string, input: { altText?: string; visibility?: MediaVisibility }) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media was not found' });
    const updated = await this.prisma.media.update({ where: { id }, data: { altText: input.altText?.trim().slice(0, 255), visibility: input.visibility }, select: { id: true, url: true, altText: true, visibility: true } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'media.updated', resourceType: 'Media', resourceId: id, metadata: { fields: Object.keys(input) } } });
    return updated;
  }
  async read(user: AuthUser, id: string) {
    const media = await this.prisma.media.findUnique({ where: { id }, include: { reviewLinks: { include: { review: { select: { userId: true } } } }, returnLinks: { include: { request: { select: { userId: true } } } } } });
    if (!media) throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media was not found' });
    const admin = user.roles.includes('SUPER_ADMIN') || user.permissions.includes('products.read');
    const owner = media.uploadedById === user.id || media.reviewLinks.some((link) => link.review.userId === user.id) || media.returnLinks.some((link) => link.request.userId === user.id);
    if (media.visibility === MediaVisibility.PRIVATE && !admin && !owner) throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media was not found' });
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: media.key }));
    if (!result.Body) throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media content was not found' });
    return { media, body: Buffer.from(await result.Body.transformToByteArray()) };
  }
}
