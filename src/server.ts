import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { app, injectWebSocket } from './index.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './utils/logger.js';
import { MockDeltaProducer } from './services/mock-delta-producer.js';
import { getWorldWsManager, getProjectionService } from './routes/world-ws.routes.js';
import { initBuilderService } from './routes/builder.routes.js';
import type { WorldModel } from './schemas/world.schema.js';
import { seedAdminUser } from './utils/seed.js';

dotenv.config();

const env = loadEnv();
const logger = createLogger(env.SERVICE_NAME, env.LOG_LEVEL);

async function start(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    await seedAdminUser();

    const server = serve(
      {
        fetch: app.fetch,
        port: env.PORT,
        hostname: env.HOST,
      },
      (info) => {
        logger.info(`FENICE is running on http://${env.HOST}:${info.port}`);
      }
    );

    injectWebSocket(server);
    logger.info('WebSocket support enabled');

    // Wire world WebSocket manager into builder service for real-time progress
    const worldMgr = getWorldWsManager();
    initBuilderService(worldMgr);
    logger.info('Builder service initialized with world notifier');

    // Delta producer — singleton, started once at boot
    const projectionSvc = getProjectionService();
    const deltaProducer = new MockDeltaProducer(worldMgr, projectionSvc, {
      metricsIntervalMs: env.DELTA_METRICS_INTERVAL_MS,
      diffIntervalMs: env.DELTA_DIFF_INTERVAL_MS,
    });

    const fetchSpec = async (): Promise<WorldModel> => {
      const res = await app.request('/openapi');
      const spec: unknown = await res.json();
      return projectionSvc.buildWorldModel(spec);
    };

    deltaProducer.start(fetchSpec);
    logger.info('Delta producer started');

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Received shutdown signal, closing gracefully...');
      try {
        deltaProducer.stop();
        logger.info('Delta producer stopped');
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
      } catch (err) {
        logger.error({ error: err }, 'Error during shutdown');
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

void start();
