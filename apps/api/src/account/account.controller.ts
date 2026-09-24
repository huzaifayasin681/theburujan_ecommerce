import { Body, Controller, Delete, Get, HttpCode, Ip, Param, Patch, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type { AuthRequest } from '../auth/auth.types';
import { AccountService } from './account.service';

class ProfileDto {
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
}
class AddressDto {
  @IsString() @Length(1, 120) name!: string;
  @IsString() @Length(5, 32) phone!: string;
  @IsString() @Length(2, 2) country!: string;
  @IsString() @Length(1, 100) state!: string;
  @IsString() @Length(1, 100) city!: string;
  @IsString() @Length(1, 24) postalCode!: string;
  @IsString() @Length(1, 255) line1!: string;
  @IsOptional() @IsString() @MaxLength(255) line2?: string;
  @IsOptional() @IsString() @MaxLength(500) instructions?: string;
  @IsBoolean() isDefaultShipping!: boolean;
  @IsBoolean() isDefaultBilling!: boolean;
}
class ConsentDto { @IsString() @Length(2, 80) type!: string; @IsString() @Length(1, 40) version!: string; @IsBoolean() accepted!: boolean; }

@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}
  @Get('profile') profile(@Req() req: AuthRequest) {
    return this.account.profile(req.user.id);
  }
  @Patch('profile') update(@Req() req: AuthRequest, @Body() body: ProfileDto) {
    return this.account.updateProfile(req.user.id, body);
  }
  @Post('avatar') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 4 * 1024 * 1024 } })) avatar(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File) { return this.account.updateAvatar(req.user.id, file); }
  @Get('addresses') addresses(@Req() req: AuthRequest) {
    return this.account.addresses(req.user.id);
  }
  @Post('addresses') addAddress(@Req() req: AuthRequest, @Body() body: AddressDto) {
    return this.account.addAddress(req.user.id, body);
  }
  @Patch('addresses/:id') editAddress(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: AddressDto,
  ) {
    return this.account.editAddress(req.user.id, id, body);
  }
  @Delete('addresses/:id') @HttpCode(204) removeAddress(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.account.removeAddress(req.user.id, id);
  }
  @Get('sessions') sessions(@Req() req: AuthRequest) {
    return this.account.sessions(req.user.id);
  }
  @Delete('sessions/:id') @HttpCode(204) session(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.account.revokeSession(req.user.id, id);
  }
  @Get('export') export(@Req() req: AuthRequest) {
    return this.account.exportData(req.user.id);
  }
  @Get('coupons') coupons(@Req() req: AuthRequest) { return this.account.coupons(req.user.id); }
  @Get('refunds') refunds(@Req() req: AuthRequest) { return this.account.refunds(req.user.id); }
  @Post('delete') @HttpCode(202) delete(@Req() req: AuthRequest) {
    return this.account.requestDeletion(req.user.id);
  }
  @Get('consents') consents(@Req() req: AuthRequest) { return this.account.consents(req.user.id); }
  @Post('consents') consent(@Req() req: AuthRequest, @Ip() ip: string, @Body() body: ConsentDto) { return this.account.recordConsent(req.user.id, ip, req.headers['user-agent'], body); }
}
