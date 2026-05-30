import rateLimit from 'express-rate-limit';
import { config } from '../config';

const window = 15 * 60 * 1000; // 15 minutes

export const grievanceLimiter = rateLimit({
  windowMs: window,
  max: config.rateLimit.grievance,
  message: { error: 'Too many grievance submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: window,
  max: config.rateLimit.login,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: window,
  max: config.rateLimit.register,
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: window,
  max: 300,
  message: { error: 'Rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});
