/**
 * Local API server that mimics Vercel serverless functions.
 * Run with: npx tsx scripts/local-api-server.ts
 * Serves api/*.ts handlers on http://localhost:3001/api/*
 */
import * as dotenv from 'dotenv';
import * as http from 'http';
import * as path from 'path';
import { pathToFileURL } from 'url';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PORT = 3001;

// Dynamically import API handlers
async function loadHandler(name: string) {
  const filePath = path.resolve(__dirname, '..', 'api', `${name}.ts`);
  const fileUrl = pathToFileURL(filePath).href;
  const mod = await import(fileUrl);
  return mod.default;
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const routeName = url.pathname.replace('/api/', '').replace(/\/$/, '');

  if (!url.pathname.startsWith('/api/') || !routeName) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const handler = await loadHandler(routeName);
    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `No handler for /api/${routeName}` }));
      return;
    }

    // Parse body for POST requests
    let body: any = {};
    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const raw = Buffer.concat(chunks).toString('utf8');
      try { body = JSON.parse(raw); } catch { body = {}; }
    }

    // Build mock VercelRequest/VercelResponse
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { query[k] = v; });

    const mockReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
      query,
    };

    let statusCode = 200;
    const responseHeaders: Record<string, string> = {};
    let responseBody: any = null;
    let ended = false;

    const mockRes = {
      setHeader(name: string, value: string) { responseHeaders[name] = value; return mockRes; },
      status(code: number) { statusCode = code; return mockRes; },
      json(data: any) {
        if (ended) return mockRes;
        ended = true;
        responseHeaders['Content-Type'] = 'application/json';
        for (const [k, v] of Object.entries(responseHeaders)) res.setHeader(k, v);
        res.writeHead(statusCode);
        res.end(JSON.stringify(data));
        return mockRes;
      },
      send(data: any) {
        if (ended) return mockRes;
        ended = true;
        for (const [k, v] of Object.entries(responseHeaders)) res.setHeader(k, v);
        res.writeHead(statusCode);
        res.end(typeof data === 'string' ? data : JSON.stringify(data));
        return mockRes;
      },
      end(data?: any) {
        if (ended) return mockRes;
        ended = true;
        for (const [k, v] of Object.entries(responseHeaders)) res.setHeader(k, v);
        res.writeHead(statusCode);
        res.end(data);
        return mockRes;
      },
      redirect(url: string) {
        if (ended) return mockRes;
        ended = true;
        res.writeHead(302, { Location: url });
        res.end();
        return mockRes;
      },
    };

    await handler(mockReq, mockRes);
  } catch (err: any) {
    console.error(`Error handling /api/${routeName}:`, err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: err?.message }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Local API server running at http://localhost:${PORT}`);
  console.log(`  Routes: /api/create-payment, /api/payment-success, etc.\n`);
});
