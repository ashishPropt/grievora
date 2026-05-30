import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db';
import { authenticate, signToken } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';
import { UserRole } from '../types';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  login: z.string(), // email or username
  password: z.string(),
});

router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { username, email, password } = parsed.data;

  const existing = await query(
    `SELECT id FROM users WHERE username = $1 OR (email IS NOT NULL AND email = $2)`,
    [username, email || null]
  );
  if (existing.rows.length) return res.status(409).json({ error: 'Username or email already taken' });

  const password_hash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, points`,
    [username, email || null, password_hash, UserRole.USER]
  );

  const user = result.rows[0];
  const token = signToken(user.id, user.role);
  res.status(201).json({ token, user });
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { login, password } = parsed.data;

  const result = await query(
    `SELECT * FROM users WHERE email = $1 OR username = $1`,
    [login]
  );
  const user = result.rows[0];
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user.id, user.role);
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
