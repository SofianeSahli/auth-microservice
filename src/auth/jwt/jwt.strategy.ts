import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Auth } from '../models/auth.model';
import { RefreshToken } from '../models/token.model';

@Injectable()
export class JwImplem extends PassportStrategy(Strategy) {

  constructor(private config: ConfigService, private readonly jwtService: JwtService
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET must be defined');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }
  async validate(payload: any) {
    // Retourne simplement le payload si vous faites confiance au token
    return {
      userId: payload.sub,
      email: payload.email,
      // ... autres données du payload
    };
  }

  /**
 * Generate email confirmation token (one-time use)
 * Valid for 24 hours
 */
  async generateEmailConfirmationToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'email_confirmation',
      oneTimeUse: true,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_EMAIL_CONFIRMATION_SECRET'),
      expiresIn: this.config.get('JWT_EMAIL_CONFIRMATION_EXPIRES_IN') ?? '24h',
      jwtid: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique token ID
    });
  }

  /**
   * Generate password reset token (one-time use)
   * Valid for 1 hour
   */
  async generatePasswordResetToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'password_reset',
      oneTimeUse: true,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_PASSWORD_RESET_SECRET'),
      expiresIn: this.config.get('JWT_PASSWORD_RESET_EXPIRES_IN'),
      jwtid: `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  /**
   * Verify email confirmation token
   */
  async verifyEmailConfirmationToken(token: string): Promise<{
    userId?: string;
    email?: string;
    isValid: boolean;
  }> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_EMAIL_CONFIRMATION_SECRET'),
      });

      // Check token type
      if (payload.type !== 'email_confirmation') {
        return { isValid: false };
      }

      return {
        userId: payload.sub,
        email: payload.email,
        isValid: true,
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<{
    userId?: string;
    email?: string;
    isValid: boolean;
  }> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_PASSWORD_RESET_SECRET'),
      });

      if (payload.type !== 'password_reset') {
        return { isValid: false };
      }

      return {
        userId: payload.sub,
        email: payload.email,
        isValid: true,
      };
    } catch (error) {
      return { isValid: false };
    }
  }
  public generateAccessToken(user: Auth) {
    return this.jwtService.sign(
      { sub: user.id, email: user.username },
      { expiresIn: this.config.get('JWT_ACCESS_EXPIRY') ?? '15m' }
    );
  }

  public async generateRefreshToken(user: Auth) {
    const refreshExpiry = this.config.get('JWT_REFRESH_EXPIRY') ?? '7d';

    // Parse manuellement la durée
    const expiresInMs = this.parseDurationToMs(refreshExpiry);

    const token = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: refreshExpiry }
    );

    const record = await RefreshToken.create({
      token,
      auth_id: user.id,
      expires_at: new Date(Date.now() + expiresInMs),
    } as RefreshToken);

    return { token, record };
  }

  private parseDurationToMs(duration: string): number {
    const regex = /^(\d+)([dhms])$/;
    const match = duration.match(regex);

    if (!match) {
      throw new Error(`Invalid duration format: ${duration}. Use format like 7d, 24h, 30m`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000; // jours
      case 'h': return value * 60 * 60 * 1000;      // heures
      case 'm': return value * 60 * 1000;           // minutes
      case 's': return value * 1000;                // secondes
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }
  /**
   * Quick utility to check if token is one-time use
   */
  isOneTimeUseToken(payload: any): boolean {
    return payload.oneTimeUse === true;
  }

}