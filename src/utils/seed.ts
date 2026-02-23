import { UserModel } from '../models/user.model.js';
import { createLogger } from './logger.js';

const logger = createLogger('fenice', process.env['LOG_LEVEL'] ?? 'info');

const SEED_ADMIN = {
  email: 'admin@formray.io',
  username: 'admin',
  fullName: 'Formray Admin',
  password: 'fenice2026',
  role: 'admin' as const,
  active: true,
  emailVerified: true,
};

/**
 * Ensure the default admin user exists. Idempotent — skips if already present.
 * Runs on every server start after MongoDB connects.
 */
export async function seedAdminUser(): Promise<void> {
  const existing = await UserModel.findOne({ email: SEED_ADMIN.email });
  if (existing) {
    logger.debug({ email: SEED_ADMIN.email }, 'Seed admin already exists, skipping');
    return;
  }

  await UserModel.create(SEED_ADMIN);
  logger.info({ email: SEED_ADMIN.email }, 'Seed admin user created');
}
