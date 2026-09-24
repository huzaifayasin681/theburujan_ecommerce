import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JobsModule } from '../jobs/jobs.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [ConfigModule, JobsModule, CartModule, PassportModule, JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow('JWT_ACCESS_SECRET') }) })],
  controllers: [AuthController], providers: [AuthService, JwtStrategy], exports: [AuthService],
})
export class AuthModule {}
