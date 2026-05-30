import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import { computeProviderScore, recomputeAllScores } from '../services/scoring';
import { resolveProvider } from '../services/providerResolver';
import { summarizeGrievance } from '../services/llm';
import { query } from '../db';
import logger from '../utils/logger';

const connection = { url: config.redis.url };

export const grievanceQueue = new Queue('grievance-processing', { connection });
export const scoringQueue = new Queue('scoring', { connection });

// Worker: process new grievances (summarize, resolve provider)
const grievanceWorker = new Worker(
  'grievance-processing',
  async (job: Job) => {
    const { grievanceId } = job.data;
    logger.info('Processing grievance', { grievanceId });

    const result = await query(`SELECT * FROM grievances WHERE id = $1`, [grievanceId]);
    const grievance = result.rows[0];
    if (!grievance) return;

    // If not already summarized
    if (!grievance.summary && grievance.raw_text) {
      const summary = await summarizeGrievance(grievance.raw_text);
      await query(
        `UPDATE grievances SET summary = $1, category = $2, updated_at = NOW() WHERE id = $3`,
        [summary.summary, summary.category, grievanceId]
      );
    }
  },
  { connection, concurrency: 2 }
);

// Worker: recompute provider scores periodically
const scoringWorker = new Worker(
  'scoring',
  async (job: Job) => {
    if (job.name === 'recompute-all') {
      await recomputeAllScores();
      logger.info('All provider scores recomputed');
    } else if (job.name === 'recompute-one') {
      await computeProviderScore(job.data.providerId);
    }
  },
  { connection, concurrency: 1 }
);

grievanceWorker.on('failed', (job, err) => {
  logger.error('Grievance worker failed', { job: job?.id, error: err.message });
});

scoringWorker.on('failed', (job, err) => {
  logger.error('Scoring worker failed', { job: job?.id, error: err.message });
});

// Schedule periodic score recomputation (every hour)
export async function scheduleRecurringJobs() {
  await scoringQueue.add('recompute-all', {}, {
    repeat: { every: 60 * 60 * 1000 },
    jobId: 'periodic-score-recompute',
  });
  logger.info('Recurring scoring job scheduled');
}

export { grievanceWorker, scoringWorker };
