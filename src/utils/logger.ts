import pino from 'pino';

// Redact sensitive keys from log output — prevents API keys and tokens from leaking
const REDACT_PATHS = [
  'apiKey',
  'token',
  'password',
  'secret',
  'ANTHROPIC_API_KEY',
  'GITHUB_TOKEN',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

export function createLogger(serviceName: string, logLevel: string): pino.Logger {
  const options: pino.LoggerOptions = {
    level: logLevel,
    redact: REDACT_PATHS,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: serviceName,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    options.transport = { target: 'pino-pretty', options: { colorize: true } };
  }

  return pino(options);
}
