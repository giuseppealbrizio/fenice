import type { EmailAdapter } from './types.js';

export class ConsoleEmailAdapter implements EmailAdapter {
  async send(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    console.warn(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    console.warn(`[EMAIL] From: ${options.from ?? 'noreply@fenice.dev'}`);
    console.warn(`[EMAIL] Body: ${options.html.substring(0, 200)}...`);
  }
}
