import { BadRequestException, Body, Controller, Get, HttpCode, Ip, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthRequest } from './auth.types';
import { Public } from './auth.decorators';
import { ChangePasswordDto, DisableTwoFactorDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, TwoFactorCodeDto, UpdateEmailDto } from './dto';
import{randomBytes}from'node:crypto';
import{CartService}from'../cart/cart.service';

const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cart: CartService,
    private readonly config: ConfigService,
  ) {}
  @Public() @Post('register') @Throttle({ default: { limit: 5, ttl: 60_000 } }) register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Public() @Post('login') @HttpCode(200) @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async login(@Body() body: LoginDto, @Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(body, { ip, userAgent: req.get('user-agent') });
    await this.cart.mergeGuest(tokens.userId, (req.cookies as Record<string, string> | undefined)?.guest_cart);
    this.setCookies(res, tokens);
    res.clearCookie('guest_cart', { path: '/' });
    return { expiresIn: tokens.expiresIn, roles: tokens.roles ?? [] };
  }

  @Public() @Get('google/config')
  googleConfig() {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID') || null;
    return { clientId, enabled: Boolean(clientId) };
  }

  @Public() @Get('google')
  googleRedirect(@Query('returnTo') returnTo: string | undefined, @Res() res: Response) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const appUrl = (this.config.get<string>('APP_URL') || 'https://theburujan.shop').replace(/\/$/, '');
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL') || `${appUrl}/api/v1/auth/google/callback`;

    if (!clientId) {
      return res.redirect(`/login?error=google_not_configured`);
    }

    const state = returnTo ? encodeURIComponent(returnTo) : '/account';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account&state=${state}`;
    return res.redirect(googleAuthUrl);
  }

  @Public() @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string | undefined,
    @Ip() ip: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.redirect(`/login?error=google_code_missing`);
    }
    const appUrl = (this.config.get<string>('APP_URL') || 'https://theburujan.shop').replace(/\/$/, '');
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL') || `${appUrl}/api/v1/auth/google/callback`;

    try {
      const profile = await this.auth.exchangeGoogleCode(code, callbackUrl);
      const tokens = await this.auth.loginOrRegisterWithGoogle(profile, { ip, userAgent: req.get('user-agent') });
      await this.cart.mergeGuest(tokens.userId, (req.cookies as Record<string, string> | undefined)?.guest_cart);
      this.setCookies(res, tokens);
      res.clearCookie('guest_cart', { path: '/' });

      const destination = state && state.startsWith('/') ? state : '/account';
      return res.redirect(destination);
    } catch (err: unknown) {
      const message = err instanceof Error ? encodeURIComponent(err.message) : 'google_auth_failed';
      return res.redirect(`/login?error=${message}`);
    }
  }

  @Public() @Post('google') @HttpCode(200)
  async googlePost(
    @Body() body: { credential?: string; code?: string; redirectUri?: string },
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let profile: { email: string; firstName: string; lastName: string; avatarUrl?: string };
    if (body.credential) {
      profile = await this.auth.verifyGoogleIdToken(body.credential);
    } else if (body.code) {
      const appUrl = (this.config.get<string>('APP_URL') || 'https://theburujan.shop').replace(/\/$/, '');
      const redirectUri = body.redirectUri || this.config.get<string>('GOOGLE_CALLBACK_URL') || `${appUrl}/api/v1/auth/google/callback`;
      profile = await this.auth.exchangeGoogleCode(body.code, redirectUri);
    } else {
      throw new BadRequestException({ code: 'GOOGLE_CREDENTIAL_REQUIRED', message: 'Google credential or authorization code is required' });
    }

    const tokens = await this.auth.loginOrRegisterWithGoogle(profile, { ip, userAgent: req.get('user-agent') });
    await this.cart.mergeGuest(tokens.userId, (req.cookies as Record<string, string> | undefined)?.guest_cart);
    this.setCookies(res, tokens);
    res.clearCookie('guest_cart', { path: '/' });
    return { expiresIn: tokens.expiresIn, roles: tokens.roles ?? [] };
  }
  @Public() @Post('refresh') @HttpCode(200)
  async refresh(@Req() req: Request, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string> | undefined)?.refresh_token; const tokens = await this.auth.refresh(raw ?? '', { ip, userAgent: req.get('user-agent') }); this.setCookies(res, tokens); return { expiresIn: tokens.expiresIn };
  }
  @Public() @Post('logout') @HttpCode(204) async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) { if (req.user?.sessionId) await this.auth.logout(req.user.sessionId); this.clearCookies(res); }
  @Post('logout-all') @HttpCode(204) async logoutAll(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) { await this.auth.logoutAll(req.user.id); this.clearCookies(res); }
  @Public() @Post('verify-email') @HttpCode(204) verify(@Body('token') token: string) { return this.auth.verifyEmail(token); }
  @Public() @Get('verify-email')
  verifyGet(@Query('token') token: string, @Res() res: Response) {
    return res.redirect(`/verify-email?token=${encodeURIComponent(token ?? '')}`);
  }
  @Public() @Post('resend-verification') @HttpCode(202) @Throttle({ default: { limit: 3, ttl: 300_000 } })
  async resendVerification(@Body() body: ForgotPasswordDto) { await this.auth.resendVerification(body.email); return { message: 'If verification is needed, a message has been queued' }; }
  @Public() @Post('forgot-password') @HttpCode(202) @Throttle({ default: { limit: 3, ttl: 60_000 } }) async forgot(@Body() body: ForgotPasswordDto) { const developmentToken = await this.auth.forgotPassword(body.email); return { message: 'If that account exists, a reset message has been queued', ...(developmentToken ? { developmentToken } : {}) }; }
  @Public() @Post('reset-password') @HttpCode(204) reset(@Body() body: ResetPasswordDto) { return this.auth.resetPassword(body); }
  @Post('change-password') @HttpCode(204) change(@Req() req: AuthRequest, @Body() body: ChangePasswordDto) { return this.auth.changePassword(req.user.id, body); }
  @Post('update-email') @HttpCode(202) updateEmail(@Req() req: AuthRequest, @Body() body: UpdateEmailDto) { return this.auth.requestEmailChange(req.user.id, body); }
  @Get('me') me(@Req() req: AuthRequest) { return { user: req.user }; }
  @Post('2fa/setup') setup2fa(@Req() req:AuthRequest){return this.auth.beginTwoFactor(req.user.id)}
  @Post('2fa/confirm') confirm2fa(@Req() req:AuthRequest,@Body() body:TwoFactorCodeDto){return this.auth.confirmTwoFactor(req.user.id,body.code)}
  @Post('2fa/disable') @HttpCode(204) disable2fa(@Req() req:AuthRequest,@Body() body:DisableTwoFactorDto){return this.auth.disableTwoFactor(req.user.id,body.password,body.code)}
  private setCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) { res.cookie('access_token', tokens.accessToken, cookieOptions(15 * 60_000)); res.cookie('refresh_token', tokens.refreshToken, cookieOptions(30 * 86400_000));res.cookie('csrf_token',randomBytes(24).toString('base64url'),{secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*86400_000}); }
  private clearCookies(res: Response) { res.clearCookie('access_token', { path: '/' }); res.clearCookie('refresh_token', { path: '/' });res.clearCookie('csrf_token',{path:'/'}); }
}
