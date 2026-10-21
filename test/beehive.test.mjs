import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  encodeKompressSuperUltra,
  decodeKompressSuperUltra,
  buildInitialMultiGraphFamily,
  evaluateBerkshireMoatAndCompounding,
} from '../pipeline/beehive-pipeline.mjs';

test('MultiGraphFamily creates 10+ local fixture nodes without modifying Apple accounts', () => {
  const g = buildInitialMultiGraphFamily();
  assert.equal(g.appleFamilyMaxLimit, 6);
  assert.equal(g.appleFamilyModified, false);
  assert.equal(g.presenceVerified, false);
  assert.ok(g.activeCount >= 10);
  assert.ok(g.overflowCountBeyondAppleCap >= 4);
});

test('<~~0o0 v2 preserves payload and reports actual frame bytes', () => {
  const msg = 'MultiGraphFamily {<3,<3,<3}+1 from Peter-beerusSan over FindMy LoRa Bluetooth AirPlay';
  const enc = encodeKompressSuperUltra(msg, { tag: 'TEST_HIVE' });
  assert.ok(enc.frame.startsWith('<~~0o0|v2|TEST_HIVE:{<3,<3,<3}+1|b3:'));
  assert.equal(enc.frameBytes, Buffer.byteLength(enc.frame, 'utf8'));
  assert.equal(enc.loraPackedBytes, undefined);
  const dec = decodeKompressSuperUltra(enc.frame);
  assert.equal(dec.valid, true);
  assert.equal(dec.restored, msg);
});

test('Warren Buffett Berkshire Moat & Compounding evaluator computes 40-year compounding and moat verdict', () => {
  const r = evaluateBerkshireMoatAndCompounding({
    initialCapitalUsd: 114,
    annualReturnRate: 0.20,
    years: 40,
    switchingCostNodes: 10,
    appleCapLimit: 6,
  });
  assert.equal(r.compoundedValueUsd, 167553.96);
  assert.equal(r.marginOfSafetyVerdict, 'WIDE_MOAT_FOREVER_HOLD');
  assert.ok(r.moatScore >= 90);
});

test('5-stage pipeline emits a checked bundle in an isolated temporary root', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'beehive-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const modulePath = path.join(root, 'repo', 'pipeline', 'beehive-pipeline.mjs');
  fs.mkdirSync(path.dirname(modulePath), { recursive: true });
  fs.copyFileSync(new URL('../pipeline/beehive-pipeline.mjs', import.meta.url), modulePath);
  const { runPipeline: isolatedRun } = await import(pathToFileURL(modulePath).href);
  const bundle = isolatedRun({ force: true });
  assert.equal(bundle.digestItems.length, 4);
  assert.equal(bundle.llmInvoked, false);
  assert.equal(bundle.radioTransmissionAttempted, false);
  for (const item of bundle.digestItems) {
    assert.equal(item.kompressVerified, true);
    assert.equal(item.score, null);
    assert.equal(item.scoreStatus, 'not-evaluated');
    assert.equal(item.platformParityVerified, false);
    assert.equal(item.kompressVerificationScope, 'frame-integrity-only');
  }
  const cachedPath = path.join(root, 'repo', bundle.digestItems[0].stageFiles.parsed);
  const responsePath = path.join(root, 'repo', bundle.digestItems[0].stageFiles.response);
  const multiline = '  literal |0o0~~>\n日本語 §MGF  ';
  fs.writeFileSync(responsePath, `## Summary\nfixture\n\n## KompressFrame\n${encodeKompressSuperUltra(multiline).frame}\n\n## ActionablePoints\n- fixture`);
  fs.unlinkSync(cachedPath);
  const reparsed = isolatedRun({ force: false });
  assert.equal(reparsed.digestItems[0].kompressVerified, true);
  assert.equal(decodeKompressSuperUltra(reparsed.digestItems[0].kompressFrame).restored, multiline);
  const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
  cached.score = 10;
  delete cached.reportedScore;
  delete cached.scoreStatus;
  cached.platformParityVerified = true;
  cached.kompressFrame = 'legacy or damaged';
  cached.kompressVerified = true;
  fs.writeFileSync(cachedPath, JSON.stringify(cached));
  const resumed = isolatedRun({ force: false });
  assert.equal(resumed.digestItems[0].kompressVerified, false);
  assert.equal(resumed.digestItems[0].score, null);
  assert.equal(resumed.digestItems[0].reportedScore, 10);
  assert.equal(resumed.digestItems[0].platformParityVerified, false);
  assert.equal(JSON.parse(fs.readFileSync(cachedPath, 'utf8')).score, 10, 'historical cache must be preserved');
  assert.match(resumed.digestItems[0].kompressVerificationError, /legacy/);
});
