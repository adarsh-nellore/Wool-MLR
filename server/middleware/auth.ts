import { Request, Response, NextFunction } from 'express';
import { logSecurity } from '../lib/audit';

export interface AuthenticatedRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    };
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user as any;

  if (!req.isAuthenticated || !req.isAuthenticated() || !user?.expires_at) {
    logSecurity('auth_failed', { reason: 'not_authenticated', path: req.path });
    return res.status(401).json({ error: 'Authentication required' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at) {
    logSecurity('auth_failed', { reason: 'expired', path: req.path });
    return res.status(401).json({ error: 'Token expired' });
  }

  next();
}

export function getUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.claims?.sub;
}
