import { InjectRedis } from "@nestjs-modules/ioredis";
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { Request } from "express";
import * as useragent from "express-useragent";
import Redis from "ioredis";
import { RegisterDto } from "../dtos/auth.dto";
import { JwImplem } from "../jwt/jwt.strategy";
import { Auth } from "../models/auth.model";
import { RefreshToken } from "../models/token.model";
import { AuthRepository } from "../repositories/auth.repository";
import { SessionService } from "./session.service";

@Injectable()
export class AuthService {

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtStrategy: JwImplem,
    private config: ConfigService,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
    @InjectRedis() private readonly redis: Redis
  ) { }


  async login(dto: RegisterDto, req?: Request): Promise<{
    access_token: string,
    refresh_token,
    auth: Auth
  }> {
    const user = await this.authRepo.findByUsername(dto.username);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException("errors.invalid_credentials");
    }

    // Generate tokens
    const access_token = this.jwtStrategy.generateAccessToken(user);
    const { token: refresh_token, record: refreshRecord } =
      await this.jwtStrategy.generateRefreshToken(user);

    // Extract metadata
    const ua = req ? useragent.parse(req.headers["user-agent"] || "") : null;
    const ip =
      req?.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req?.socket?.remoteAddress ||
      null;
    const device = ua ? `${ua.browser} on ${ua.platform}` : null;

    if (device && ip) {
      await this.sessionService.createSession(
        user.id,
        device,
        ip,
        req?.headers["user-agent"]?.toString() || "",
        refreshRecord.id
      );
    }
    await this.saveAccessTokenToRedis(
      access_token,
      user.id,
      this.config.get('JWT_ACCESS_EXPIRY') ?? '15'
    );

    return {
      access_token,
      refresh_token,
      auth: user
    };
  }

  async refreshToken(token: string, req?: Request): Promise<{
    access_token: string,
    refresh_token,
    auth: Auth
  }> {
    const stored = await RefreshToken.findOne({ where: { token } });

    if (!stored) throw new UnauthorizedException("errors.session_expired");
    if (stored.expires_at < new Date()) {
      await stored.destroy();
      throw new UnauthorizedException("errors.session_expired");
    }

    const user = await this.authRepo.findById(stored.auth_id);
    if (!user) throw new UnauthorizedException("errors.user_not_found");

    // Generate new tokens
    const access_token = this.jwtStrategy.generateAccessToken(user);
    const { token: refresh_token, record: newRefresh } =
      await this.jwtStrategy.generateRefreshToken(user);

    // Mark previous refresh token as inactive session
    await this.sessionService.updateLastActivity(stored.id);

    // Create new session
    const ua = req ? useragent.parse(req.headers["user-agent"] || "") : null;
    const ip =
      req?.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req?.socket?.remoteAddress ||
      "0.0.0.0";
    const device = ua ? `${ua.browser} on ${ua.platform}` : "Unknown Device";

    if (req?.headers["user-agent"] || device === "Unknown Device") {
      await this.sessionService.createSession(
        user.id,
        device,
        ip,
        req?.headers["user-agent"]?.toString() || "",
        newRefresh.id
      );
    }

    await stored.destroy();

    await this.saveAccessTokenToRedis(
      access_token,
      user.id,
      this.config.get('JWT_ACCESS_EXPIRY') ?? '15m'
    );

    return {
      access_token,
      refresh_token,
      auth: user,
    };
  }

  async logout(userId: string) {
    await RefreshToken.destroy({ where: { auth_id: userId } });
    await this.sessionService.logoutUserSessions(userId);
    return { message: "Successfully logged out" };
  }

  async register(dto: RegisterDto): Promise<Auth> {
    const existing = await this.authRepo.findByUsername(dto.username);
    if (existing) throw new UnauthorizedException("errors.username_taken");
    return this.authRepo.create(dto);
  }

  async validate(userId: string): Promise<Auth | null> {
    return this.authRepo.findById(userId);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const user = await Auth.findOne({ where: { username } });
    return !user;
  }

  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await this.authRepo.findById(userId);
    if (!user) throw new UnauthorizedException("errors.user_not_found");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      throw new BadRequestException("errors.old_password_incorrect");

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await this.authRepo.updatePassword(userId, hashedNew);
  }

  async updateAuth(auth: Partial<Auth>) {
    await this.authRepo.update(auth);
    return { message: 'Auth updated successfully' };
  }

  private async saveAccessTokenToRedis(
    token: string,
    userId: string,
    expiresIn: string
  ) {
    const ttlSeconds = this.parseExpiration(expiresIn); // convert "15m" to seconds
    await this.redis.set(`access:${token}`, userId, "EX", ttlSeconds);
    await this.redis.get(`access:${token}`);
  }

  private async deleteAccessTokenFromRedis(token: string) {
    await this.redis.del(`access:${token}`);
  }

  private parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m
    const [, value, unit] = match;
    const n = Number(value);
    switch (unit) {
      case "s":
        return n;
      case "m":
        return n * 60;
      case "h":
        return n * 3600;
      case "d":
        return n * 86400;
      default:
        return 900;
    }
  }

  async findAuthByUsernameOrEmail(query: string) {
    return this.authRepo.findAuthByUsernameOrEmail(query)
  }

  async findById(id): Promise<Auth | null> {
    return await this.authRepo.findById(id)
  }
  async resetPassword(userId: string, password: string) {
    const hashedNew = await bcrypt.hash(password, 10);
    return this.authRepo.updatePassword(userId, hashedNew)
  }
}
