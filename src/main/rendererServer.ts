import { readFile } from 'node:fs/promises';
import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, join, normalize, sep } from 'node:path';

/*
  Packaged builds serve the renderer from a fixed loopback origin instead of file://:
  - API calls stay same-origin (/api/v1) and are proxied like vercel.json does for the web build.
  - Google Identity Services only works on an http(s) origin listed in the Google OAuth client,
    so this origin (http://127.0.0.1:<port>) must be added to its Authorized JavaScript origins.
  - localStorage (auth session) is scoped to the origin, so the port must stay stable across launches.
*/
export const RENDERER_SERVER_HOST = '127.0.0.1';
export const RENDERER_SERVER_PORT = 41731;

const CHAT_API_TARGET = 'https://buddy-ai-api-710178903619.asia-south1.run.app';
const NODE_API_TARGET = 'https://buddy-node-backend-scz7pyp3ha-el.a.run.app';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const resolveApiTarget = (pathname: string) => {
  if (pathname.startsWith('/api/v1/chat') || pathname.startsWith('/api/v1/speech')) {
    return CHAT_API_TARGET;
  }
  return pathname.startsWith('/api/') ? NODE_API_TARGET : null;
};

const proxyRequest = (req: IncomingMessage, res: ServerResponse, target: string) => {
  const targetUrl = new URL(req.url ?? '/', target);
  const headers = { ...req.headers, host: targetUrl.host };
  // Server-to-server call: drop the loopback Origin so backend CORS allow-lists do not reject it.
  delete headers.origin;
  delete headers.referer;

  const send = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = send(targetUrl, { method: req.method, headers }, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });

  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ success: false, message: 'Unable to reach KukuNotes servers.' }));
  });

  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
};

const serveStatic = async (res: ServerResponse, rootDir: string, pathname: string) => {
  let relativePath: string;
  try {
    relativePath = normalize(decodeURIComponent(pathname)).replace(/^[\\/]+/, '');
  } catch {
    res.writeHead(400).end();
    return;
  }

  const filePath = join(rootDir, relativePath || 'index.html');
  if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
    res.writeHead(403).end();
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch {
    // SPA fallback for client-side routes; real missing assets get a 404.
    if (extname(relativePath)) {
      res.writeHead(404).end();
      return;
    }
    const index = await readFile(join(rootDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'], 'Cache-Control': 'no-cache' });
    res.end(index);
  }
};

export const startRendererServer = (rootDir: string) =>
  new Promise<{ server: Server; url: string }>((resolve, reject) => {
    const root = normalize(rootDir);
    const server = createServer((req, res) => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      const apiTarget = resolveApiTarget(pathname);

      if (apiTarget) {
        proxyRequest(req, res, apiTarget);
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end();
        return;
      }

      void serveStatic(res, root, pathname);
    });

    server.once('error', reject);
    server.listen(RENDERER_SERVER_PORT, RENDERER_SERVER_HOST, () => {
      server.off('error', reject);
      resolve({ server, url: `http://${RENDERER_SERVER_HOST}:${RENDERER_SERVER_PORT}/` });
    });
  });
