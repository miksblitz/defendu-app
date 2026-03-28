/**
 * OPTIONS preflight check for pose + password-reset API routes.
 * Usage: npm run check:api
 *        VERIFY_API_BASE=https://your-app.vercel.app npm run check:api
 */

const base = (process.env.VERIFY_API_BASE || 'https://defendu-app.vercel.app').replace(/\/$/, '');

const paths = ['/api/pose-developer-ticket', '/api/password-reset'];

async function check() {
  console.log('API base:', base, '\n');
  let failed = false;
  for (const path of paths) {
    const url = base + path;
    const r = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:8082',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    const acao = r.headers.get('access-control-allow-origin');
    console.log(path);
    console.log('  OPTIONS status:', r.status);
    console.log('  Access-Control-Allow-Origin:', acao ?? '(missing — browser may block localhost)');
    console.log('');
    if (r.status === 404) {
      console.log(
        '  FAIL: OPTIONS returned 404 (X-Vercel-Error: NOT_FOUND). No serverless route exists at this URL.',
        'Fix: Vercel Project → Settings → Root Directory = defendu-app (folder containing api/ and vercel.json), then redeploy.\n'
      );
      failed = true;
    } else if (r.status !== 200 || !acao) {
      console.log(
        '  FAIL: OPTIONS must return 200 with Access-Control-Allow-Origin so browsers on localhost can call the API.\n'
      );
      failed = true;
    }
  }
  return failed ? 1 : 0;
}

check()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
