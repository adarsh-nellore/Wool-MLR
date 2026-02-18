import { Request, Response, NextFunction } from 'express';
import { logSecurity } from '../lib/audit';
import { isAuthenticated } from '../replit_integrations/auth';

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

export const requireAuth = isAuthenticated;

export function getUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.claims?.sub;
}
