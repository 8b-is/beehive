import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeKompressSuperUltra,
  decodeKompressSuperUltra,
  buildInitialMultiGraphFamily,
  evaluateBerkshireMoatAndCompounding,
  runPipeline,
} from '../pipeline/beehive-pipeline.mjs';

test('MultiGraphFamily bypasses Apple Family 6-member limit with 10+ nodes', () => {
  const g = buildInitialMultiGraphFamily();
  assert.equal(g.appleFamilyMaxLimit, 6);
  assert.ok(g.activeCount >= 10);
  assert.ok(g.overflowCountBeyondAppleCap >= 4);
});

test('<~~0o0 kompress-super-ultra roundtrips payload and verifies ternary signature', () => {
  const msg = 'MultiGraphFamily {<3,<3,<3}+1 from Peter-beerusSan over FindMy LoRa Bluetooth AirPlay';
  const enc = encodeKompressSuperUltra(msg, { tag: 'TEST_HIVE' });
  assert.ok(enc.frame.startsWith('<~~0o0|TEST_HIVE:{<3,<3,<3}+1|b3:'));
  assert.ok(enc.loraPackedBytes < enc.rawBytes);
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

test('5-stage /project-development pipeline emits verified state bundle', () => {
  const bundle = runPipeline({ force: false });
  assert.equal(bundle.digestItems.length, 4);
  for (const item of bundle.digestItems) {
    assert.equal(item.kompressVerified, true);
    assert.equal(item.score, 10);
  }
});
