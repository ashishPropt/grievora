import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '../types';
import { query } from '../db';

interface JwtPayload {
  userId: string;
  role: UserRole;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const result = await query('SELECT id, email, username, role, points FROM users WHERE id = $1', [payload.userId]);
    if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next();

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const result = await query('SELECT id, email, username, role, points FROM users WHERE id = $1', [payload.userId]);
    if (result.rows[0]) req.user = result.rows[0];
  } catch {
    // ignore invalid tokens for optional auth
  }
  next();
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const signToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ userId, role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};
