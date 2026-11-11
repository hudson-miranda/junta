import { PrismaClient } from '../generated/client';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { processOutbox } from './outbox';
import { config } from './config';
import { createServer } from 'node:http';
config();
const db = new PrismaClient(),
  connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:16379', {
    maxRetriesPerRequest: null,
  });
const queue = new Queue('junta-outbox', { connection });
const worker = new Worker(
  'junta-outbox',
  async () => {
    await processOutbox(db);
    await db.offer.updateMany({
      where: { active: true, endsAt: { lte: new Date() } },
      data: { active: false },
    });
  },
  { connection, concurrency: 1 },
);
worker.on('failed', () =>
  console.error(
    JSON.stringify({ level: 'error', service: 'junta-worker', message: 'Outbox job failed' }),
  ),
);
const server = createServer(async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    await connection.ping();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"status":"ready"}');
  } catch {
    res.writeHead(503);
    res.end('{"status":"unavailable"}');
  }
});
queue
  .upsertJobScheduler(
    'outbox-tick',
    { every: 2000 },
    {
      name: 'process',
      data: {},
      opts: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 10,
        removeOnFail: 20,
      },
    },
  )
  .then(() => server.listen(Number(process.env.WORKER_PORT ?? 4001), '0.0.0.0'))
  .catch(() => process.exit(1));
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close();
  await worker.close();
  await queue.close();
  await connection.quit();
  await db.$disconnect();
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
