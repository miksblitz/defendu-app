import type { VercelRequest } from '@vercel/node';

/** Vercel sometimes leaves `req.body` as a string; normalize for JSON POST bodies. */
export function getJsonBody(req: VercelRequest): Record<string, unknown> {
  const raw = req.body as unknown;
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(raw)) {
    try {
      const p = JSON.parse(raw.toString('utf8')) as unknown;
      return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/** Query/body values may be string or string[] (e.g. Expo web). */
export function bodyStr(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0].trim();
  return '';
}
