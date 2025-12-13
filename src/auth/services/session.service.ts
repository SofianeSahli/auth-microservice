import { Injectable, Logger } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { Session } from '../models/session.model';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly sessionRepo: SessionRepository) {}

  async createSession(
    authId: string,
    device: string,
    ip: string,
    userAgent: string,
    refreshTokenId?: string,
    location?: string,
  ): Promise<Session> {
    try {
      // Find existing active session for same refresh token or device+ip combo
      const existing = await this.sessionRepo.findActiveSession(
        authId,
        device,
        ip,
        refreshTokenId,
      );

      if (existing) {
        await this.sessionRepo.updateSession(existing.id, {
          last_activity_at: new Date(),
        });
        return existing;
      }

      // Otherwise, create a new session
      return this.sessionRepo.createSession({
        auth_id: authId,
        device,
        ip,
        user_agent: userAgent,
        location: location || null,
        logged_in_at: new Date(),
        active: true,
        refresh_token_id: refreshTokenId || null,
        last_activity_at: new Date(),
      });
    } catch (err) {
      this.logger.error(`Failed to create session for user ${authId}`, err);
      throw err;
    }
  }

  async updateLastActivity(refreshTokenId: string): Promise<void> {
    try {
      const session = await this.sessionRepo.findByRefreshToken(refreshTokenId);
      if (session) {
        await this.sessionRepo.updateSession(session.id, {
          last_activity_at: new Date(),
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to update last activity for refreshTokenId=${refreshTokenId}`,
        err,
      );
    }
  }

  async endSession(sessionId: string): Promise<void> {
    await this.sessionRepo.deactivateSession(sessionId);
  }

  async logoutUserSessions(authId: string): Promise<void> {
    await this.sessionRepo.deactivateAllUserSessions(authId);
  }
}