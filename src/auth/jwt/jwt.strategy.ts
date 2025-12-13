import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Auth } from '../models/auth.model';
import { RefreshToken } from '../models/token.model';

@Injectable()
export class JwImplem extends PassportStrategy(Strategy) {

  constructor(private config: ConfigService, private readonly jwtService: JwtService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET must be defined');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
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
    const token = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: `${this.config.get('JWT_REFRESH_EXPIRY') ?? '7d'}` }
    );

    const record = await RefreshToken.create({
      token,
      auth_id: user.id,
      expires_at: new Date(
        Date.now() + `${this.config.get('JWT_REFRESH_EXPIRY') ?? '7d'}`
      ),
    } as RefreshToken);

    return { token, record };
  }
  /**
   * Quick utility to check if token is one-time use
   */
  isOneTimeUseToken(payload: any): boolean {
    return payload.oneTimeUse === true;
  }
}