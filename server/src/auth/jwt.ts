import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

export interface JWTPayload {
  playerId: string;
  name: string;
}

export function signToken(payload: JWTPayload): string {
  const opts: SignOptions = { expiresIn: config.jwtExpiry as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtSecret, opts);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload & jwt.JwtPayload;
    return { playerId: decoded.playerId, name: decoded.name };
  } catch {
    return null;
  }
}
