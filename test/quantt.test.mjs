import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const html = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const engine = source.slice(source.indexOf('const QUANTT_KEY'), source.indexOf('// 4. 8b-is/music'));

function engineContext() {
  const context = vm.createContext({ TextEncoder, TextDecoder, localStorage: { getItem: () => null, setItem() {} } });
  vm.runInContext(engine, context);
  return context;
}

function page({ fetchImpl } = {}) {
  const { document } = parseHTML(html);
  const storage = new Map();
  const context = vm.createContext({
    document,
    TextEncoder,
    TextDecoder,
    URL,
    fetch: fetchImpl,
    AbortController,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    navigator: {},
    window: { addEventListener() {} },
  });
  vm.runInContext(source, context);
  vm.runInContext('loadState(); renderFamilyGraph(); renderDigestCards(); renderQuantT()', context);
  return {
    document,
    storage,
    run: code => vm.runInContext(code, context),
    text: id => document.getElementById(id).textContent,
  };
}

const ANCHORS = [
  { name: 'Kitchen', x: 0, y: 0, vector: { A: -40, B: -70, C: -82 }, trits: '100000000', capturedAt: 1 },
  { name: 'Desk', x: 4, y: 0, vector: { A: -68, B: -41, C: -80 }, trits: '010000000', capturedAt: 2 },
  { name: 'Door', x: 0, y: 4, vector: { A: -69, B: -80, C: -42 }, trits: '001000000', capturedAt: 3 },
];
const TELEMETRY = {
  nodes: [{ node: 'MAC:MEDUSA' }, { node: 'ADA:MEDUSA' }],
  beacons: [
    { bssid: 'A', ssid: 'alpha', rssi: -41, lat: 35.6895, lon: 139.6917 },
    { bssid: 'B', ssid: 'beta', rssi: -69, lat: 35.6895, lon: 139.6917 },
    { bssid: 'C', ssid: 'gamma', rssi: -81, lat: 35.6895, lon: 139.6917 },
  ],
};

test('QuantT RSSI quantization uses balanced ternary and bounded weights', () => {
  const context = engineContext();
  const quantize = vm.runInContext('quantizeRssi', context);
  assert.equal(quantize(-40).trit, 1);
  assert.equal(quantize(-65).trit, 0);
  assert.equal(quantize(-90).trit, -1);
  assert.equal(quantize(-40).weight, 1);
  assert.ok(quantize(-90).weight > 0);
  assert.equal(quantize('nope').trit, 0);
  assert.equal(quantize('nope').weight, 0);
});

test('QuantT fingerprint deduplicates BSSIDs, caps at nine trits, and rejects bad values', () => {
  const context = engineContext();
  const fingerprint = vm.runInContext('triadFingerprint', context)({
    nodes: [{ node: 'ADA:MEDUSA' }, { node: 12 }],
    beacons: [
      { bssid: 'aa', rssi: -80 },
      { bssid: 'AA', rssi: -40 },
      { bssid: 'bb', rssi: '-65' },
      { bssid: '', rssi: -30 },
      { bssid: 'cc', rssi: 20 },
      { bssid: 'dd', rssi: 'x' },
      ...Array.from({ length: 12 }, (_, i) => ({ bssid: `z${i}`, rssi: -90 - i })),
    ],
  });
  assert.equal(fingerprint.vector.AA, -40);
  assert.equal(fingerprint.beaconCount, 14);
  assert.equal(fingerprint.trits.length, 9);
  assert.equal(fingerprint.trits[0], '1');
  assert.deepEqual(fingerprint.nodes, ['ADA:MEDUSA']);
});

test('QuantT k-NN estimate, quantization and bearing are deterministic', () => {
  const context = engineContext();
  const fingerprint = vm.runInContext('triadFingerprint', context)(TELEMETRY);
  const estimate = vm.runInContext('estimateQuantTLocalization', context)(fingerprint, ANCHORS);
  assert.equal(estimate.tile, '0,0');
  assert.equal(estimate.x, 0);
  assert.equal(estimate.y, 0);
  assert.equal(estimate.nearest, 'Kitchen');
  assert.ok(estimate.confidence > 0.5);
  assert.equal(estimate.matches, 3);

  const bearing = vm.runInContext('quantTBearing', context)(0, 0, 4, 0);
  assert.equal(bearing.distance, 4);
  assert.equal(bearing.bearing, 90);
  assert.equal(vm.runInContext('quantTCardinal', context)(bearing.bearing), 'E');
  const none = vm.runInContext('estimateQuantTLocalization', context)(fingerprint, []);
  assert.equal(none, null);
});

test('QuantT page renders a relative estimate, anchors, target and navigation without GPS claims', () => {
  const p = page();
  p.run(`quanttAnchors = ${JSON.stringify(ANCHORS)}`);
  p.run(`applyQuantTTelemetry(${JSON.stringify(TELEMETRY)})`);
  assert.match(p.text('quantt-status'), /RELATIVE WI-FI FINGERPRINT · NOT GPS/);
  assert.match(p.text('quantt-status'), /tile 0,0/);
  assert.match(p.text('quantt-trit'), /Live 9-trit Wi-Fi signature: 1/);
  assert.equal(p.document.getElementById('quantt-anchor-count').textContent, '3');
  assert.equal(p.document.querySelectorAll('#quantt-anchors .member-row').length, 3);
  assert.equal(p.document.querySelectorAll('#quantt-target option').length, 4);
  assert.ok(p.document.getElementById('quantt-map').children.length > 20);
  assert.doesNotMatch(p.text('quantt-status'), /GPS LOCKED|MEASURED COORDINATE|FindMy verified/i);
  assert.doesNotMatch(p.document.getElementById('tab-loc').textContent, /35\.6895|139\.6917/);

  p.run("document.querySelectorAll('#quantt-target option')[2].selected = true");
  p.run('renderQuantT()');
  assert.match(p.text('quantt-nav'), /Target Desk \(4, 0\) m · distance 4\.0 m · bearing 90° E/);
  assert.match(p.text('quantt-nav'), /Bearings assume \+y is north/);
});

test('QuantT live polling consumes wigle-triad telemetry and stops cleanly', async () => {
  const urls = [];
  const p = page({
    fetchImpl: async url => {
      urls.push(String(url));
      return { ok: true, json: async () => TELEMETRY };
    },
  });
  p.run(`quanttAnchors = ${JSON.stringify(ANCHORS)}`);
  p.run('toggleQuantT()');
  await new Promise(resolve => setTimeout(resolve, 30));
  p.run('toggleQuantT()');
  assert.deepEqual(urls, ['https://esp32.vaked.dev/api/triad.json']);
  assert.equal(p.run('quanttLatest.beaconCount'), 3);
  assert.equal(p.run('quanttRunning'), false);
  assert.equal(p.run('quanttTimer'), null);
  assert.equal(p.run('quanttEstimate.tile'), '0,0');
  assert.match(p.text('quantt-status'), /IDLE/);
  assert.match(p.text('quantt-status'), /Telemetry: 3 beacons/);
});

test('QuantT anchors can be captured, persisted, removed and cleared', () => {
  const p = page();
  p.run(`applyQuantTTelemetry(${JSON.stringify(TELEMETRY)})`);
  p.document.getElementById('quantt-anchor-name').value = '<img src=x onerror=alert(1)>';
  p.document.getElementById('quantt-anchor-x').value = '3.4';
  p.document.getElementById('quantt-anchor-y').value = '-2.6';
  p.run('captureQuantTAnchor()');
  const saved = JSON.parse(p.storage.get('beehive_quantt_anchors_v1'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, '<img src=x onerror=alert(1)>');
  assert.equal(saved[0].x, 3);
  assert.equal(saved[0].y, -3);
  assert.equal(p.document.querySelector('#quantt-anchors .m-title').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(p.document.querySelectorAll('#quantt-anchors img').length, 0);

  p.run('removeQuantTAnchor(0)');
  assert.equal(JSON.parse(p.storage.get('beehive_quantt_anchors_v1')).length, 0);
  p.run(`quanttAnchors = ${JSON.stringify(ANCHORS)}; clearQuantTAnchors()`);
  assert.equal(p.document.getElementById('quantt-anchor-count').textContent, '0');
  assert.equal(JSON.parse(p.storage.get('beehive_quantt_anchors_v1')).length, 0);
});
