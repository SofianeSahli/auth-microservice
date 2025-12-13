import { Injectable } from '@nestjs/common';
import { Session } from '../models/session.model';

@Injectable()
export class SessionRepository {
  async createSession(data: Partial<Session>): Promise<Session> {
    return Session.create(data as Session);
  }

  async findActiveSession(
    authId: string,
    device?: string,
    ip?: string,
    refreshTokenId?: string,
  ): Promise<Session | null> {
    const where: any = { auth_id: authId, active: true };
    where.logged_out_at = null;
    if (refreshTokenId) {
      where.refresh_token_id = refreshTokenId;
    } else if (device && ip) {
      where.device = device;
      where.ip = ip;
    }

    return Session.findOne({ where });
  }

  async findByRefreshToken(refreshTokenId: string): Promise<Session | null> {
    return Session.findOne({
      where: { refresh_token_id: refreshTokenId, active: true },
    });
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Session>,
  ): Promise<void> {
    await Session.update(updates, { where: { id: sessionId } });
  }

  async deactivateSession(sessionId: string): Promise<void> {
    await Session.update(
      { active: false, logged_out_at: new Date() },
      { where: { id: sessionId } },
    );
  }

  async deactivateAllUserSessions(authId: string): Promise<void> {
    await Session.update(
      { active: false, logged_out_at: new Date() },
      { where: { auth_id: authId } },
    );
  }
}