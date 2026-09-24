import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import type { AuthRequest } from '../auth/auth.types';
import { ReviewsService } from './reviews.service';
class ReviewDto { @IsUUID() productId!: string; @IsUUID() orderItemId!: string; @IsInt() @Min(1) @Max(5) rating!: number; @IsString() @Length(2, 150) title!: string; @IsString() @Length(10, 5000) body!: string; @IsOptional() @IsArray() @ArrayMaxSize(5) @ArrayUnique() @IsUUID('4', { each: true }) mediaIds?: string[]; }
class VoteDto { @IsInt() @Min(0) @Max(1) helpful!: number; }
@Controller('reviews')
export class ReviewsController { constructor(private readonly reviews: ReviewsService) {} @Get('mine') mine(@Req() request: AuthRequest, @Query('page') page?: string) { return this.reviews.mine(request.user.id, Number(page) || 1); } @Post() @Throttle({ default: { limit: 5, ttl: 3_600_000 } }) create(@Req() request: AuthRequest, @Body() body: ReviewDto) { return this.reviews.create(request.user.id, body); } @Post(':id/vote') vote(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: VoteDto) { return this.reviews.vote(request.user.id, id, Boolean(body.helpful)); } }
