import type { MessagingAdapter } from './types.js';

export class FcmMessagingAdapter implements MessagingAdapter {
  constructor(private readonly serviceAccountPath: string) {}

  async send(options: {
    to: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    // Firebase Cloud Messaging integration placeholder
    // npm install firebase-admin when ready for production
    throw new Error(
      `FCM adapter not yet implemented. Would send to: ${options.to}`,
    );
  }
}
