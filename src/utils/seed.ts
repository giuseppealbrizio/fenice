import { UserModel } from '../models/user.model.js';
import { createLogger } from './logger.js';

const logger = createLogger('fenice', process.env['LOG_LEVEL'] ?? 'info');

/**
 * Ensure the default admin user exists. Idempotent — skips if already present.
 * Runs on every server start after MongoDB connects.
 *
 * Credentials come from env vars SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.
 * Defaults are safe for local development only — override in production.
 */
export async function seedAdminUser(): Promise<void> {
  const email = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@formray.io';
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? 'change-me-in-production';

  const existing = await UserModel.findOne({ email });
  if (existing) {
    logger.debug({ email }, 'Seed admin already exists, skipping');
    return;
  }

  await UserModel.create({
    email,
    username: 'admin',
    fullName: 'Formray Admin',
    password,
    role: 'admin' as const,
    active: true,
    emailVerified: true,
  });
  logger.info({ email }, 'Seed admin user created');
}
