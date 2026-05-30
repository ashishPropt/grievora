import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import logger from './utils/logger';
import { correlationId } from './middleware/correlationId';
import { apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import grievanceRoutes from './routes/grievances';
import providerRoutes from './routes/providers';
import moderationRoutes from './routes/moderation';
import { scheduleRecurringJobs } from './workers';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(correlationId);
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/grievances', grievanceRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/moderation', moderationRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  logger.info(`Grievora API running on port ${config.port}`, { env: config.nodeEnv });
  scheduleRecurringJobs().catch((err) => logger.error('Failed to schedule jobs', { error: String(err) }));
});

export default app;
