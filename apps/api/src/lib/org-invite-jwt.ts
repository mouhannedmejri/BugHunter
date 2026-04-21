import jwt from 'jsonwebtoken';
import { OrgRole } from '@bughuntr/db';
import { UnauthorizedError } from '@bughuntr/shared';

export type OrgInviteJwtPayload = {
  sub: string;
  orgId: string;
  email: string;
  role: OrgRole;
  /** When set, invite is bound to this user account (SA-initiated). */
  userId?: string;
  typ: 'org_invite';
};

export function signOrgInviteToken(
  payload: Omit<OrgInviteJwtPayload, 'typ'>,
  secret: string,
): string {
  const body: OrgInviteJwtPayload = { ...payload, typ: 'org_invite' };
  return jwt.sign(body, secret, { expiresIn: '7d', algorithm: 'HS256' });
}

export function verifyOrgInviteToken(
  token: string,
  secret: string,
): OrgInviteJwtPayload {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') throw new Error('invalid');
    const o = decoded as Record<string, unknown>;
    if (o['typ'] !== 'org_invite' || typeof o['sub'] !== 'string') {
      throw new Error('invalid');
    }
    return {
      sub: o['sub'] as string,
      orgId: o['orgId'] as string,
      email: o['email'] as string,
      role: o['role'] as OrgRole,
      userId: typeof o['userId'] === 'string' ? o['userId'] : undefined,
      typ: 'org_invite',
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired invite token');
  }
}
