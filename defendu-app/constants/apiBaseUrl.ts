/**
 * Base URL for Vercel serverless APIs (password reset, pose ticket, payments, etc.).
 * Set EXPO_PUBLIC_API_BASE_URL in .env for a custom domain or preview deploy.
 */
const DEFAULT_API_BASE = 'https://defendu-app.vercel.app';

export function getExpoApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().replace(/\/$/, '');
  }
  return DEFAULT_API_BASE;
}
