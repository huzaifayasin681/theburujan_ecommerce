import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MediaVisibility } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Permissions } from '../auth/auth.decorators';
import type { AuthRequest } from '../auth/auth.types';
import type { Response } from 'express';
import { MediaService } from './media.service';
const imageUpload = FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
class MediaUpdateDto { @IsOptional() @IsString() @MaxLength(255) altText?: string; @IsOptional() @IsEnum(MediaVisibility) visibility?: MediaVisibility; }
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Permissions('products.update') @Post() @UseInterceptors(imageUpload) upload(@Req() request: AuthRequest, @UploadedFile() file: Express.Multer.File) { return this.media.upload(request.user.id, file); }
  @Post('customer') @Throttle({ default: { limit: 10, ttl: 60_000 } }) @UseInterceptors(imageUpload) customerUpload(@Req() request: AuthRequest, @UploadedFile() file: Express.Multer.File) { return this.media.upload(request.user.id, file, MediaVisibility.PRIVATE); }
  @Permissions('products.update') @Delete(':id') @HttpCode(204) remove(@Req() request: AuthRequest, @Param('id') id: string) { return this.media.remove(request.user.id, id); }
  @Permissions('products.update') @Patch(':id') update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: MediaUpdateDto) { return this.media.update(request.user.id, id, body); }
  @Get(':id/content') async content(@Req() request: AuthRequest, @Param('id') id: string, @Res() response: Response) { const result = await this.media.read(request.user, id); response.setHeader('Content-Type', result.media.mimeType); response.setHeader('Cache-Control', result.media.visibility === MediaVisibility.PRIVATE ? 'private,no-store' : 'public,max-age=31536000,immutable'); response.send(result.body); }
}
