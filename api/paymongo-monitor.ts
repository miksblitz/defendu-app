// api/paymongo-monitor.ts
// Lightweight PayMongo diagnostics endpoint for live verification.
// Returns webhook events, payment state snapshots, and setup checklist flags.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import {
    getMissingEnvResponse,
    getReadinessReport,
    hasEnvVar,
    REQUIRED_MONITOR_ENV_VARS,
    validateEnvVars,
} from './_lib/envConfig';

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set');
  }
  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL,
  });
}

type WebhookEventItem = {
  eventId: string;
  eventType?: string;
  status?: string;
  reason?: string;
  uid?: string;
  sessionId?: string;
  receivedAt?: number;
  updatedAt?: number;
};

function parseLimit(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value || 20);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 100);
}

function parseUid(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = (value || '').trim();
  return trimmed || undefined;
}

function getAuthToken(req: VercelRequest): string {
  const bearer = (req.headers.authorization || '').toString();
  if (bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }

  const direct = (req.headers['x-monitor-key'] || '').toString().trim();
  return direct;
}

function checkAuthorization(req: VercelRequest): { ok: boolean; reason?: string } {
  const monitorKey = (process.env.PAYMONGO_MONITOR_KEY || '').trim();
  if (!monitorKey) return { ok: false, reason: 'missing_server_monitor_key' };
  const token = getAuthToken(req);
  if (!token) return { ok: false, reason: 'missing_client_token' };
  if (token !== monitorKey) return { ok: false, reason: 'token_mismatch' };
  return { ok: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-monitor-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = checkAuthorization(req);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized monitor access', reason: auth.reason });
  }

  // Validate required monitor env vars before Firebase access
  const envValidation = validateEnvVars(REQUIRED_MONITOR_ENV_VARS);
  if (!envValidation.valid) {
    // Still return readiness report even if Firebase can't be accessed
    const readiness = getReadinessReport();
    return res.status(503).json({
      ...getMissingEnvResponse(envValidation.missing),
      readiness,
    });
  }

  try {
    const dbAdmin = admin.database(getAdminApp());
    const limit = parseLimit(req.query.limit);
    const uid = parseUid(req.query.uid);

    // Comprehensive readiness report using centralized config
    const readiness = getReadinessReport();

    // Legacy checklist format for backwards compatibility
    const checklist = {
      hasPaymongoSecretKey: hasEnvVar('PAYMONGO_SECRET_KEY'),
      hasPaymongoWebhookSecret: hasEnvVar('PAYMONGO_WEBHOOK_SECRET'),
      hasMonitorKey: hasEnvVar('PAYMONGO_MONITOR_KEY'),
      hasAppBaseUrl: hasEnvVar('APP_BASE_URL'),
      hasFirebaseServiceAccount: hasEnvVar('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64'),
      hasFirebaseDatabaseUrl: hasEnvVar('FIREBASE_DATABASE_URL'),
    };

    // Recent webhook events
    const eventsSnap = await dbAdmin.ref('paymongoWebhookEvents').once('value');
    const rawEvents = eventsSnap.exists() ? (eventsSnap.val() as Record<string, any>) : {};

    const events: WebhookEventItem[] = Object.values(rawEvents).map((item: any) => ({
      eventId: item.eventId,
      eventType: item.eventType,
      status: item.status,
      reason: item.reason,
      uid: item.uid,
      sessionId: item.sessionId,
      receivedAt: item.receivedAt,
      updatedAt: item.updatedAt,
    }));

    events.sort((a, b) => {
      const aTs = Number(a.updatedAt || a.receivedAt || 0);
      const bTs = Number(b.updatedAt || b.receivedAt || 0);
      return bTs - aTs;
    });

    const recentEvents = events.slice(0, limit);

    // Optional per-user pending payment snapshot for easy troubleshooting
    let pendingPayments: Record<string, any> | null = null;
    let pendingSummary: Record<string, number> | null = null;

    if (uid) {
      const pendingSnap = await dbAdmin.ref(`pendingPayments/${uid}`).once('value');
      const pendingRaw = pendingSnap.exists() ? (pendingSnap.val() as Record<string, any>) : {};
      pendingPayments = pendingRaw;

      const summary: Record<string, number> = {};
      for (const session of Object.values(pendingRaw)) {
        const status = (session as any)?.status || 'unknown';
        summary[status] = (summary[status] || 0) + 1;
      }
      pendingSummary = summary;
    }

    return res.status(200).json({
      ok: true,
      generatedAt: Date.now(),
      readiness,
      checklist,
      usage: {
        tip: 'Pass ?uid=<firebase_uid> to include pending payment snapshots for a specific user.',
        auth: 'Use Authorization: Bearer <PAYMONGO_MONITOR_KEY> or x-monitor-key header.',
      },
      events: recentEvents,
      totalEventCount: events.length,
      pendingSummary,
      pendingPayments,
    });
  } catch (error: any) {
    console.error('PayMongo monitor error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
