import { OpenAPIHono } from '@hono/zod-openapi';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';
import { handleError } from './middleware/errorHandler.js';

export const app = new OpenAPIHono();

// Global middleware
app.use('*', requestId);
app.use('*', requestLogger);

// Error handler
app.onError(handleError);

// Auth middleware — applied to protected routes only
app.use('/api/v1/users/*', authMiddleware);

// Mount API routes
app.route('/api/v1', healthRouter);
app.route('/api/v1', authRouter);
app.route('/api/v1', userRouter);

// Default export for server
export default app;
