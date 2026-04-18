/**
 * Base URL for Vercel serverless APIs (password reset, pose ticket, etc.).
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

/** True when the app is running on the local Expo web dev server (no /api routes). */
export function isLocalhostWebDev(): boolean {
  if (typeof window === 'undefined' || !window.location?.hostname) return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

/**
 * Base URL for serverless APIs when the client must not use `window.location.origin`
 * (Expo web dev serves no `/api/*`; use env or production default).
 */
export function getServerlessApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  const pay = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL;
  if (typeof pay === 'string' && pay.trim().length > 0) {
    return pay.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin && !isLocalhostWebDev()) {
    return window.location.origin.replace(/\/$/, '');
  }
  return DEFAULT_API_BASE;
}
