import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
}
export class LoginDto { @IsEmail() email!: string; @IsString() @MaxLength(128) password!: string; @IsOptional() @IsString() @Length(6,32) twoFactorCode?:string; }
export class ForgotPasswordDto { @IsEmail() email!: string; }
export class ResetPasswordDto { @IsString() @Length(32, 256) token!: string; @IsString() @MinLength(12) @MaxLength(128) password!: string; }
export class ChangePasswordDto { @IsString() @MaxLength(128) currentPassword!: string; @IsString() @MinLength(12) @MaxLength(128) newPassword!: string; }
export class TwoFactorCodeDto { @IsString() @Length(6,32) code!:string; }
export class DisableTwoFactorDto extends TwoFactorCodeDto { @IsString() @MaxLength(128) password!:string; }
export class UpdateEmailDto {
  @IsEmail() email!: string;
  @IsString() @MaxLength(128) password!: string;
}
