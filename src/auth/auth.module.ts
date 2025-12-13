import { Module } from '@nestjs/common'; // Add forwardRef
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport'; // Add this
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthController } from './controllers/auth.controller';
import { JwImplem } from './jwt/jwt.strategy';
import { Auth } from './models/auth.model';
import { Session } from './models/session.model';
import { RefreshToken } from './models/token.model';
import { AuthRepository } from './repositories/auth.repository';
import { SessionRepository } from './repositories/session.repository';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/emails.service';
import { SessionService } from './services/session.service';

@Module({
  imports: [
    // Add PassportModule
    PassportModule,

    // ConfigModule should be global or imported
    ConfigModule,

    SequelizeModule.forFeature([Auth, RefreshToken, Session]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'secretKey',
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [
    AuthService,
    EmailService,
    SessionService,
    AuthRepository,
    SessionRepository,
    JwImplem

  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    SessionService,
    JwtModule,
    PassportModule,
    // Export JwImplem if needed elsewhere
    JwImplem,
  ],
})
export class AuthModule { }