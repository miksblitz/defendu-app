#!/usr/bin/env node
// scripts/setup-vercel-env.js
// Automates adding environment variables to Mikel's Vercel project.
//
// Usage:
//   1. Get a Vercel token: https://vercel.com/account/tokens  (create one with full access)
//   2. Get your project ID: Vercel Dashboard > Project > Settings > General > "Project ID"
//   3. Run:
//      node scripts/setup-vercel-env.js \
//        --token YOUR_VERCEL_TOKEN \
//        --project YOUR_PROJECT_ID
//
//   It will prompt for each missing env var value interactively.

const https = require('https');
const readline = require('readline');

// ---- Configuration ----
const ENV_VARS = [
  {
    key: 'PAYMONGO_SECRET_KEY',
    description: 'PayMongo API secret key (starts with sk_test_ or sk_live_)',
    type: 'sensitive',
    target: ['production', 'preview'],
  },
  {
    key: 'PAYMONGO_WEBHOOK_SECRET',
    description: 'PayMongo webhook signing secret (from Webhooks dashboard)',
    type: 'sensitive',
    target: ['production', 'preview'],
  },
  {
    key: 'PAYMONGO_MONITOR_KEY',
    description: 'Custom key for /api/paymongo-monitor auth (generate a random string)',
    type: 'sensitive',
    target: ['production', 'preview'],
  },
  {
    key: 'APP_BASE_URL',
    description: 'Your Vercel deployment URL (e.g. https://defendu.vercel.app)',
    type: 'plain',
    target: ['production', 'preview'],
    default: 'https://defendu.vercel.app',
  },
  {
    key: 'FIREBASE_SERVICE_ACCOUNT_KEY_BASE64',
    description: 'Base64-encoded Firebase service account JSON',
    type: 'sensitive',
    target: ['production', 'preview'],
  },
  {
    key: 'FIREBASE_DATABASE_URL',
    description: 'Firebase Realtime Database URL',
    type: 'plain',
    target: ['production', 'preview'],
    default: 'https://defendu-e7970-default-rtdb.asia-southeast1.firebasedatabase.app',
  },
];

// ---- Helpers ----
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' && args[i + 1]) result.token = args[++i];
    if (args[i] === '--project' && args[i + 1]) result.projectId = args[++i];
    if (args[i] === '--team' && args[i + 1]) result.teamId = args[++i];
  }
  return result;
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function vercelApi(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let result = '';
      res.on('data', (chunk) => (result += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(result) });
        } catch {
          resolve({ status: res.statusCode, data: result });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getExistingEnvVars(token, projectId, teamQuery) {
  const res = await vercelApi('GET', `/v9/projects/${projectId}/env${teamQuery}`, token);
  if (res.status !== 200) return [];
  return (res.data.envs || []).map((e) => e.key);
}

async function createEnvVar(token, projectId, teamQuery, envVar) {
  const res = await vercelApi('POST', `/v10/projects/${projectId}/env${teamQuery}`, token, {
    type: envVar.type === 'sensitive' ? 'sensitive' : 'plain',
    key: envVar.key,
    value: envVar.value,
    target: envVar.target,
  });
  return res;
}

// ---- Main ----
async function main() {
  const { token, projectId, teamId } = parseArgs();

  if (!token || !projectId) {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  Defendu - Vercel Environment Variable Setup        ║
╚══════════════════════════════════════════════════════╝

Usage:
  node scripts/setup-vercel-env.js --token <VERCEL_TOKEN> --project <PROJECT_ID> [--team <TEAM_ID>]

Steps:
  1. Create a Vercel API token at: https://vercel.com/account/tokens
  2. Find your Project ID at: Vercel Dashboard > Project > Settings > General
  3. (Optional) If using a team, find your Team ID in team settings
  4. Run this script with those values
`);
    process.exit(1);
  }

  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  console.log('\n🔍 Checking existing environment variables...\n');
  const existing = await getExistingEnvVars(token, projectId, teamQuery);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let created = 0;
  let skipped = 0;

  for (const envDef of ENV_VARS) {
    if (existing.includes(envDef.key)) {
      console.log(`  ✅ ${envDef.key} — already set, skipping`);
      skipped++;
      continue;
    }

    console.log(`\n  ❌ ${envDef.key} — NOT SET`);
    console.log(`     ${envDef.description}`);

    let value;
    if (envDef.default) {
      const answer = await ask(rl, `     Value [${envDef.default}]: `);
      value = answer.trim() || envDef.default;
    } else {
      value = (await ask(rl, '     Value: ')).trim();
    }

    if (!value) {
      console.log('     ⚠️  Skipped (no value provided)');
      continue;
    }

    const result = await createEnvVar(token, projectId, teamQuery, { ...envDef, value });
    if (result.status === 200 || result.status === 201) {
      console.log(`     ✅ Created successfully`);
      created++;
    } else {
      console.log(`     ❌ Failed: ${JSON.stringify(result.data?.error || result.data)}`);
    }
  }

  rl.close();

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Created: ${created} | Skipped (already set): ${skipped}`);
  console.log(`${'═'.repeat(50)}`);

  if (created > 0) {
    console.log('\n⚠️  IMPORTANT: You must redeploy for changes to take effect!');
    console.log('   Go to Vercel Dashboard > Deployments > Redeploy latest\n');
  } else {
    console.log('\n✅ All environment variables are already set!\n');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
