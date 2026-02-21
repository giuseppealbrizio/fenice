import type { EmailAdapter } from './types.js';

export class ResendEmailAdapter implements EmailAdapter {
  constructor(private readonly apiKey: string) {}

  async send(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    // Resend API integration placeholder
    // npm install resend when ready for production
    throw new Error(
      `Resend adapter not yet implemented. Would send to: ${options.to}`,
    );
  }
}
