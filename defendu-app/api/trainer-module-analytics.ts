// POST /api/trainer-module-analytics — Trainer sales aggregates (Firebase Admin; not for browser RTDB rules).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (!adminApp) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set');
    }
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8'));
    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app';
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL,
    });
  }
  return adminApp;
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    setCors(res);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  setCors(res);

  try {
    const authHeader = req.headers.authorization;
    const raw = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!raw) {
      return res.status(401).json({ success: false, error: 'Missing Authorization Bearer token' });
    }

    const app = getAdminApp();
    const decoded = await app.auth().verifyIdToken(raw);
    const uid = decoded.uid;

    const db = app.database();
    const userSnap = await db.ref(`users/${uid}`).once('value');
    const me = userSnap.val();
    if (!me || me.role !== 'trainer' || me.trainerApproved !== true) {
      return res.status(403).json({ success: false, error: 'Trainer access required' });
    }

    const modulesSnap = await db.ref('modules').once('value');
    const allModules = modulesSnap.val() || {};
    const trainerModuleIds: string[] = [];
    const moduleMeta: Record<
      string,
      { moduleTitle?: string; category?: string; thumbnailUrl?: string }
    > = {};

    for (const [moduleId, m] of Object.entries(allModules)) {
      const row = m as Record<string, unknown>;
      if (row?.trainerId === uid && row?.status === 'approved') {
        trainerModuleIds.push(moduleId);
        moduleMeta[moduleId] = {
          moduleTitle: typeof row.moduleTitle === 'string' ? row.moduleTitle : undefined,
          category: typeof row.category === 'string' ? row.category : undefined,
          thumbnailUrl: typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl : undefined,
        };
      }
    }

    const stats: Record<string, { buyers: number; creditsGross: number; lastPurchasedAt: number }> = {};
    for (const id of trainerModuleIds) {
      stats[id] = { buyers: 0, creditsGross: 0, lastPurchasedAt: 0 };
    }

    const usersSnap = await db.ref('users').once('value');
    const usersVal = usersSnap.val() || {};
    const uniqueBuyerUids = new Set<string>();
    let totalCreditsGross = 0;

    for (const [userId, u] of Object.entries(usersVal)) {
      const purchased = (u as Record<string, unknown>)?.purchasedModules as Record<string, Record<string, unknown>> | null;
      if (!purchased || typeof purchased !== 'object') continue;

      let userBoughtAny = false;
      for (const mid of trainerModuleIds) {
        const rec = purchased[mid];
        if (!rec || typeof rec !== 'object') continue;
        userBoughtAny = true;
        const s = stats[mid];
        s.buyers += 1;
        const credits =
          typeof rec.pricePaidCredits === 'number' && Number.isFinite(rec.pricePaidCredits)
            ? rec.pricePaidCredits
            : 50;
        s.creditsGross += credits;
        totalCreditsGross += credits;
        const ts = typeof rec.purchasedAt === 'number' ? rec.purchasedAt : 0;
        if (ts > s.lastPurchasedAt) s.lastPurchasedAt = ts;
      }
      if (userBoughtAny) uniqueBuyerUids.add(userId);
    }

    const rows = trainerModuleIds.map((moduleId) => {
      const s = stats[moduleId];
      const meta = moduleMeta[moduleId] || {};
      const buyers = s.buyers;
      const avg = buyers > 0 ? s.creditsGross / buyers : 0;
      return {
        moduleId,
        moduleTitle: meta.moduleTitle || moduleId,
        category: meta.category,
        thumbnailUrl: meta.thumbnailUrl,
        buyers,
        creditsGross: s.creditsGross,
        avgCreditsPerBuyer: Math.round(avg * 100) / 100,
        lastPurchasedAt: s.lastPurchasedAt,
      };
    });

    rows.sort((a, b) => b.creditsGross - a.creditsGross);

    return res.status(200).json({
      success: true,
      trainerUid: uid,
      totals: {
        modules: trainerModuleIds.length,
        buyers: uniqueBuyerUids.size,
        creditsGross: totalCreditsGross,
      },
      modules: rows,
      phpEarnings: {
        available: false,
        note: 'PHP payout reporting is not available yet.',
        payoutSplit: undefined,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('trainer-module-analytics:', message);
    if (!res.writableEnded) {
      return res.status(500).json({ success: false, error: message });
    }
  }
}
