import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { parseHTML } from 'linkedom';
import { createServer } from '../platforms/host/server.mjs';

const root = new URL('..', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

async function close(server) {
  await new Promise(resolve => server.close(resolve));
}

test('platform manifest covers every app target with an honest verification boundary', () => {
  const manifest = JSON.parse(read('platforms/manifest.json'));
  assert.equal(manifest.schema, 'beehive.platforms.v1');
  assert.deepEqual(Object.keys(manifest.targets).sort(), ['android', 'ayeos', 'ios', 'linux', 'macos', 'web']);
  assert.equal(manifest.nativeParityVerified, false);
  for (const [id, target] of Object.entries(manifest.targets)) {
    assert.ok(target.label, id);
    assert.ok(target.entry, id);
    assert.match(target.status, /unverified|not|only|boundary|WebView|browser|canonical/i, id);
    assert.ok(fs.existsSync(new URL(target.entry, root)), `${id} entry missing: ${target.entry}`);
  }
});

test('loopback host serves the UI, health, state, installer and APK without path traversal', async () => {
  const server = createServer({ platform: 'linux' });
  const base = await listen(server);
  try {
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      ok: true, app: 'BeeHive', version: '1.0.0', platform: 'linux', nativeParity: false,
    });

    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    const html = await page.text();
    assert.match(html, /BEEHIVE/);
    assert.match(html, /window\.BeeHiveHostBridge=\{"app":"BeeHive","version":"1\.0\.0","platform":"linux","nativeParity":false\}/);

    const state = await fetch(`${base}/beehive-state.json`);
    assert.equal(state.status, 200);
    assert.ok((await state.json()).digestItems);

    const installer = await fetch(`${base}/install.sh`);
    assert.equal(installer.status, 200);
    assert.match(installer.headers.get('content-type'), /x-shellscript/);
    assert.match(await installer.text(), /curl -fsSL https:\/\/beehive\.vaked\.dev\/install\.sh \| sh/);

    const apk = await fetch(`${base}/BeeHive-v1.0.0-android-universal.apk`);
    assert.equal(apk.status, 200);
    assert.match(apk.headers.get('content-type'), /android\.package-archive/);

    for (const blocked of ['/%2e%2e/package.json', '/package.json', '/web/index.html', '/.git/config']) {
      const res = await fetch(base + blocked);
      assert.equal(res.status, 404, blocked);
    }

    const post = await fetch(`${base}/`, { method: 'POST' });
    assert.equal(post.status, 405);
  } finally {
    await close(server);
  }
});

test('AyeOS host reports its own platform marker, not Android or iOS parity', async () => {
  const server = createServer({ platform: 'ayeos' });
  const base = await listen(server);
  try {
    const health = await (await fetch(`${base}/healthz`)).json();
    assert.equal(health.platform, 'ayeos');
    assert.equal(health.nativeParity, false);
    assert.match(await (await fetch(`${base}/`)).text(), /"platform":"ayeos"/);
  } finally {
    await close(server);
  }
});

test('host proxies wigle-triad telemetry and refuses unsafe upstream URLs', async () => {
  const upstream = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, beacons: [{ bssid: 'AA:BB', rssi: -50 }], nodes: [{ node: 'MAC:MEDUSA' }] }));
  });
  const upstreamBase = await listen(upstream);
  const server = createServer({ platform: 'linux', triad: `${upstreamBase}/api/triad.json` });
  const base = await listen(server);
  try {
    const response = await fetch(`${base}/api/triad.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-beehive-source'), 'wigle-triad');
    const payload = await response.json();
    assert.equal(payload.beacons[0].bssid, 'AA:BB');
    assert.throws(() => createServer({ triad: 'http://example.com/api/triad.json' }), /loopback/);
    assert.throws(() => createServer({ triad: 'file:///tmp/triad.json' }), /HTTP/);
  } finally {
    await close(server);
    await close(upstream);
  }
});

test('host reports a 502 when triad telemetry is unavailable', async () => {
  const upstream = http.createServer((req, res) => {
    res.writeHead(503, { 'content-type': 'text/plain' });
    res.end('down');
  });
  const upstreamBase = await listen(upstream);
  const server = createServer({ platform: 'linux', triad: `${upstreamBase}/api/triad.json` });
  const base = await listen(server);
  try {
    const response = await fetch(`${base}/api/triad.json`);
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.match(payload.error, /unavailable/);
  } finally {
    await close(server);
    await close(upstream);
  }
});

test('web platform badge names the host and never claims native parity', () => {
  const html = read('web/index.html');
  const source = html.slice(html.indexOf('function detectPlatform()'), html.indexOf('window.addEventListener(\'DOMContentLoaded\''));
  const cases = [
    [{ AndroidBeeHiveBridge: {} }, /ANDROID BRIDGE PRESENT · RESULTS REQUIRE VALIDATION/],
    [{ BeeHiveHostBridge: { platform: 'ios' } }, /IOS HOST · BROWSER UI · NATIVE PARITY UNVERIFIED/],
    [{ BeeHiveHostBridge: { platform: 'macos' } }, /MACOS HOST · BROWSER UI · NATIVE PARITY UNVERIFIED/],
    [{ BeeHiveHostBridge: { platform: 'linux' } }, /LINUX HOST · BROWSER UI · NATIVE PARITY UNVERIFIED/],
    [{ BeeHiveHostBridge: { platform: 'ayeos' } }, /AYEOS HOST · BROWSER UI · HARDWARE UNVERIFIED/],
    [{}, /WEB PROTOTYPE · NATIVE PARITY UNVERIFIED/],
  ];
  for (const [window, expected] of cases) {
    const { document } = parseHTML(html);
    const context = vm.createContext({ document, window });
    vm.runInContext(source, context);
    const platform = vm.runInContext('applyPlatformBadge()', context);
    assert.match(platform.text, expected);
    assert.match(document.getElementById('pill-platform').textContent, expected);
  }
});

test('Apple app targets are declared for iOS and macOS with a SwiftUI guard', () => {
  const packageSwift = read('apple/Package.swift');
  assert.match(packageSwift, /executableTarget\(\s*name: "beehive-app"/);
  const project = read('apple/project.yml');
  for (const scheme of ['BeeHive-iOS', 'BeeHive-macOS']) assert.match(project, new RegExp(scheme));
  assert.match(project, /product: BeeHiveKit/);
  assert.match(project, /\.\.\/web\/index\.html/);
  const appMain = read('apple/Sources/BeeHiveApp/BeeHiveAppMain.swift');
  assert.match(appMain, /#if canImport\(SwiftUI\)/);
  assert.match(appMain, /@main/);
  const ui = read('apple/Sources/BeeHiveApp/BeeHiveSwiftUI.swift');
  assert.match(ui, /BeeHiveDashboardView/);
  assert.match(ui, /import BeeHiveKit/);
  const web = read('apple/Sources/BeeHiveApp/BeeHiveWebView.swift');
  assert.match(web, /WKWebView/);
  assert.match(web, /loadFileURL/);
  assert.match(web, /BeeHiveHostBridge/);
});

test('generated dist carries the QuantT UI and the one-line installer', () => {
  const web = read('web/index.html');
  const dist = read('dist/index.html');
  const installer = read('dist/install.sh');
  assert.match(web, /tab-loc/);
  assert.match(dist, /tab-loc/);
  assert.match(dist, /quanttEndpoint/);
  assert.match(dist, /Queries a relative Wi-Fi fingerprint|RELATIVE WI-FI FINGERPRINT/);
  assert.match(installer, /BEEHIVE_ARCHIVE_URL/);
  assert.match(installer, /beehive.vaked.dev\/install.sh/);
});

test('Android wrapper keeps permissions explicit and the build script portable', () => {
  const manifest = read('android/AndroidManifest.xml');
  for (const permission of ['BLUETOOTH_CONNECT', 'BLUETOOTH_SCAN', 'ACCESS_FINE_LOCATION', 'ACCESS_WIFI_STATE']) {
    assert.match(manifest, new RegExp(`android:name="android\\.permission\\.${permission}"`));
  }
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android:allowBackup="false"/);
  const script = read('android/build_apk.sh');
  assert.match(script, /ANDROID_BUILD_TOOLS/);
  assert.match(script, /ANDROID_PLATFORM_JAR/);
  assert.match(script, /apksigner" verify/);
  const syntax = spawnSync('bash', ['-n', path.join(root.pathname, 'android/build_apk.sh')], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test('installer extracts a local archive and writes a working launcher that can be removed', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'beehive-src-'));
  const prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'beehive-prefix-'));
  const archive = path.join(fixture, 'beehive.tar.gz');
  try {
    for (const dir of ['platforms/host', 'platforms/ayeos', 'web', 'data', 'dist']) {
      fs.cpSync(new URL(dir, root), path.join(fixture, 'src', dir), { recursive: true });
    }
    fs.copyFileSync(new URL('install.sh', root), path.join(fixture, 'src', 'install.sh'));
    const tar = spawnSync('tar', ['-czf', archive, '-C', path.join(fixture, 'src'), '.'], { encoding: 'utf8' });
    assert.equal(tar.status, 0, tar.stderr);

    const install = spawnSync('sh', [path.join(root.pathname, 'install.sh'), '--platform', 'linux', '--prefix', prefix], {
      encoding: 'utf8',
      env: { ...process.env, BEEHIVE_ARCHIVE_URL: `file://${archive}` },
    });
    assert.equal(install.status, 0, install.stderr);
    assert.match(install.stdout, /Installed:/);

    const launcher = path.join(prefix, 'bin', 'beehive');
    assert.ok(fs.existsSync(launcher));
    assert.match(fs.readFileSync(launcher, 'utf8'), /server\.mjs" --platform linux/);
    assert.ok(fs.existsSync(path.join(prefix, 'share', 'beehive', 'host', 'server.mjs')));
    assert.ok(fs.existsSync(path.join(prefix, 'share', 'beehive', 'web', 'index.html')));

    const uninstall = spawnSync('sh', [path.join(root.pathname, 'install.sh'), '--uninstall', '--prefix', prefix], { encoding: 'utf8' });
    assert.equal(uninstall.status, 0, uninstall.stderr);
    assert.equal(fs.existsSync(launcher), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
    fs.rmSync(prefix, { recursive: true, force: true });
  }
});

test('one-line installer is valid POSIX shell and supports dry-run targets', () => {
  const syntax = spawnSync('sh', ['-n', path.join(root.pathname, 'install.sh')], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);

  const help = spawnSync('sh', [path.join(root.pathname, 'install.sh'), '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /curl -fsSL https:\/\/beehive\.vaked\.dev\/install\.sh \| sh/);

  const prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'beehive-install-'));
  try {
    for (const platform of ['linux', 'macos', 'ayeos']) {
      const run = spawnSync('sh', [path.join(root.pathname, 'install.sh'), '--dry-run', '--platform', platform, '--prefix', prefix], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
      assert.match(run.stdout, new RegExp(`BeeHive ${platform} host`));
      assert.match(run.stdout, /\[dry-run\] download https:\/\/codeload\.github\.com\/8b-is\/beehive\/tar\.gz\/refs\/heads\/main/);
    }
    const android = spawnSync('sh', [path.join(root.pathname, 'install.sh'), '--android', '--dry-run'], { encoding: 'utf8' });
    assert.equal(android.status, 0, android.stderr);
    assert.match(android.stdout, /BeeHive-v1\.0\.0-android-universal\.apk/);
    assert.deepEqual(fs.readdirSync(prefix), [], 'dry-run must not write to the prefix');
  } finally {
    fs.rmSync(prefix, { recursive: true, force: true });
  }
});
