#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const VERSION = '1.0.0';
const PLATFORMS = new Set(['android', 'ios', 'macos', 'linux', 'ayeos', 'web']);
const DEFAULT_TRIAD_UPSTREAM = process.env.BEEHIVE_TRIAD_UPSTREAM || 'https://esp32.vaked.dev/api/triad.json';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.apk': 'application/vnd.android.package-archive',
  '.sh': 'text/x-shellscript; charset=utf-8',
};

function readIfFile(file) {
  try {
    return fs.readFileSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function hostBridge(platform) {
  const bridge = JSON.stringify({ app: 'BeeHive', version: VERSION, platform, nativeParity: false });
  return `<script>window.BeeHiveHostBridge=${bridge};</script>`;
}

function page(platform) {
  const source = readIfFile(path.join(ROOT, 'web', 'index.html'));
  if (!source) return null;
  const html = source.toString('utf8');
  const marker = '</body>';
  if (!html.includes(marker)) return null;
  return html.replace(marker, `${hostBridge(platform)}\n${marker}`);
}

function routes(platform) {
  const index = page(platform);
  return new Map([
    ['/', { body: index, type: MIME['.html'] }],
    ['/index.html', { body: index, type: MIME['.html'] }],
    ['/beehive-state.json', { file: path.join(ROOT, 'data', 'beehive-state.json'), type: MIME['.json'] }],
    ['/BeeHive-v1.0.0-android-universal.apk', { file: path.join(ROOT, 'dist', 'BeeHive-v1.0.0-android-universal.apk'), type: MIME['.apk'] }],
    ['/install.sh', { file: path.join(ROOT, 'install.sh'), type: MIME['.sh'] }],
  ]);
}

function triadUpstream(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Triad upstream must be HTTP(S)');
  if (url.protocol === 'http:' && !['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)) {
    throw new Error('Plain-HTTP triad upstream must be loopback');
  }
  return url;
}

async function proxyTriad(res, upstream) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(upstream, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`upstream returned ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-beehive-source': 'wigle-triad',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: false, error: 'triad telemetry unavailable', detail: error.name }));
  } finally {
    clearTimeout(timeout);
  }
}

export function createServer({
  platform = process.env.BEEHIVE_PLATFORM || 'linux',
  triad = DEFAULT_TRIAD_UPSTREAM,
} = {}) {
  if (!PLATFORMS.has(platform)) throw new Error(`Unknown platform: ${platform}`);
  const table = routes(platform);
  const triadURL = triadUpstream(triad);

  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' });
      res.end('method not allowed\n');
      return;
    }
    if (pathname === '/api/triad.json') {
      proxyTriad(res, triadURL);
      return;
    }
    if (pathname === '/healthz') {
      const body = JSON.stringify({ ok: true, app: 'BeeHive', version: VERSION, platform, nativeParity: false });
      res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }

    const route = table.get(pathname);
    const body = route ? (route.body ?? readIfFile(route.file)) : null;
    if (!route || body === null) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('not found\n');
      return;
    }
    res.writeHead(200, { 'content-type': route.type, 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
}

export function startServer({
  platform = process.env.BEEHIVE_PLATFORM || 'linux',
  port = 8787,
  host = '127.0.0.1',
  triad = DEFAULT_TRIAD_UPSTREAM,
} = {}) {
  const server = createServer({ platform, triad });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

function argValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const platform = argValue(args, '--platform', process.env.BEEHIVE_PLATFORM || 'linux');
  const port = Number(argValue(args, '--port', process.env.BEEHIVE_PORT || '8787'));
  const host = argValue(args, '--host', '127.0.0.1');
  const triad = argValue(args, '--triad-upstream', DEFAULT_TRIAD_UPSTREAM);
  try {
    const server = await startServer({ platform, port, host, triad });
    const address = server.address();
    console.log(`[beehive] platform=${platform} listening on http://${address.address}:${address.port}/ (loopback only)`);
  } catch (error) {
    console.error(`[beehive] failed to start: ${error.message}`);
    process.exit(1);
  }
}
