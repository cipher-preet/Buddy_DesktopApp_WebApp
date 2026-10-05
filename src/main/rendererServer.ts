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
export const NODE_API_TARGET = 'https://buddy-node-backend-scz7pyp3ha-el.a.run.app';

/** The backend's browser-based Google login redirects here (fixed on the backend as DESKTOP_LOGIN_RETURN_URL). */
const GOOGLE_LOGIN_COMPLETE_PATH = '/auth/google/complete';

export type GoogleLoginCompletion = { code?: string; error?: string };

type RendererServerOptions = {
  /** Returns false when no sign-in is pending, e.g. a stale or replayed link. */
  onGoogleLoginComplete?: (completion: GoogleLoginCompletion) => boolean;
};

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

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const sendGoogleLoginPage = (res: ServerResponse, title: string, message: string) => {
  res.writeHead(200, {
    'Content-Type': MIME_TYPES['.html'],
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    'Referrer-Policy': 'no-referrer',
  });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KukuNotes</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8fb;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#101828}
main{max-width:420px;padding:32px;border:1px solid #e4e7ec;border-radius:16px;background:#fff;text-align:center}
h1{margin:0 0 8px;font-size:20px}p{margin:0;color:#475467;line-height:1.5}</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></main></body></html>`);
};

const handleGoogleLoginComplete = (
  res: ServerResponse,
  searchParams: URLSearchParams,
  onComplete: RendererServerOptions['onGoogleLoginComplete'],
) => {
  const code = searchParams.get('code') ?? undefined;
  const error = searchParams.get('error') ?? undefined;
  const accepted = Boolean(onComplete?.({ code, error }));

  if (!accepted) {
    sendGoogleLoginPage(res, 'Sign-in link expired', 'Start again from KukuNotes by choosing Continue with Google.');
  } else if (code) {
    sendGoogleLoginPage(res, 'You are signed in', 'You can close this tab and return to KukuNotes.');
  } else {
    sendGoogleLoginPage(res, 'Sign-in did not complete', error || 'Return to KukuNotes and try again.');
  }
};

export const startRendererServer = (rootDir: string, options: RendererServerOptions = {}) =>
  new Promise<{ server: Server; url: string }>((resolve, reject) => {
    const root = normalize(rootDir);
    const server = createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', 'http://localhost');
      const { pathname } = requestUrl;

      if (pathname === GOOGLE_LOGIN_COMPLETE_PATH && req.method === 'GET') {
        handleGoogleLoginComplete(res, requestUrl.searchParams, options.onGoogleLoginComplete);
        return;
      }

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
