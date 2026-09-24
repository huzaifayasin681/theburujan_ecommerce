import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';
import type { AuthRequest } from '../auth/auth.types';
import { ReturnsService } from './returns.service';
class ReturnItemDto { @IsUUID() orderItemId!: string; @IsInt() @Min(1) @Max(999) quantity!: number; }
class ReturnDto { @IsUUID() orderId!: string; @IsString() @Length(2, 100) reason!: string; @IsString() @Length(10, 5000) explanation!: string; @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReturnItemDto) items!: ReturnItemDto[]; @IsOptional() @IsArray() @ArrayMaxSize(8) @ArrayUnique() @IsUUID('4', { each: true }) mediaIds?: string[]; }
class MoreInfoDto { @IsString() @Length(10, 5000) explanation!: string; @IsOptional() @IsArray() @ArrayMaxSize(8) @ArrayUnique() @IsUUID('4', { each: true }) mediaIds?: string[]; }
@Controller('returns')
export class ReturnsController { constructor(private readonly returns: ReturnsService) {} @Get() list(@Req() request: AuthRequest) { return this.returns.list(request.user.id); } @Get(':id') get(@Req() request: AuthRequest, @Param('id') id: string) { return this.returns.get(request.user.id, id); } @Post() create(@Req() request: AuthRequest, @Body() body: ReturnDto) { return this.returns.create(request.user.id, body); } @Patch(':id/information') information(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: MoreInfoDto) { return this.returns.provideInformation(request.user.id, id, body); } }
