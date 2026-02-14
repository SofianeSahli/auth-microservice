import { RedisModule, RedisModuleOptions } from "@nestjs-modules/ioredis";
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import { join } from 'path';
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisModuleOptions => ({
        type: "single",
        url: configService.get<string>("REDIS_URL", "redis://localhost:6379"),
      }),
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
          port: configService.get<number>('MAIL_PORT', 587),
          secure: configService.get<boolean>('MAIL_SECURE', false),
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
          pool: true,
          maxConnections: 5,
        },
        defaults: {
          from: `"${configService.get<string>('MAIL_FROM_NAME', 'Your App')}" <${configService.get<string>('MAIL_FROM')}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new PugAdapter({
            inlineCssEnabled: true,
          }),
          options: {
            strict: true,
          },
        },
      }),
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        logging: false,

        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<number>('DB_PORT', 3306)),

        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'auth_ms'),

        autoLoadModels: true,

        // ⚠️ Never enable in production
        synchronize: configService.get('NODE_ENV') !== 'production',

        // Recommended MySQL options
        define: {
          charset: 'utf8mb4',
          collate: 'utf8mb4_unicode_ci',
        },

        dialectOptions: {
          timezone: 'Z', // store dates in UTC
        },
      }),
    }),

    AuthModule,
  ],
})
export class AppModule { }