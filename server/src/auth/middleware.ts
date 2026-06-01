import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JWTPayload } from './jwt.js';

export interface AuthRequest extends Request {
  player: JWTPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  (req as AuthRequest).player = payload;
  next();
}
