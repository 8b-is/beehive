import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { encodeKompressSuperUltra as encode, decodeKompressSuperUltra as decode, ternaryHash9 } from '../pipeline/beehive-pipeline.mjs';
const html = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const browser = vm.createContext({ TextEncoder, TextDecoder });
vm.runInContext(html.slice(html.indexOf('const GLYPH_DICT'), html.indexOf('// 2. MultiGraphFamily State')), browser);
const vectors = JSON.parse(fs.readFileSync(new URL('./codec-vectors.json', import.meta.url), 'utf8'));
const repairCRC = frame => frame.replace(/\|crc32:[0-9a-f]{8}\|0o0~~>$/, `|crc32:${browser.crc32(frame.slice(7, frame.lastIndexOf('|crc32:')))}|0o0~~>`);

test('published v2 vectors agree byte-for-byte in Node and the actual browser codec', () => {
  for (const v of vectors) {
    const result = encode(v.raw, { tag: v.tag, sender: v.sender });
    assert.equal(result.frame, v.frame);
    assert.equal(browser.encodeKompressSuperUltra(v.raw, { tag: v.tag, sender: v.sender }).frame, v.frame);
    for (const dec of [decode(v.frame), browser.decodeKompress(v.frame)]) {
      assert.equal(dec.valid, true); assert.equal(dec.restored, v.raw);
      assert.equal(dec.tag, v.tag); assert.equal(dec.sender, v.sender);
      assert.equal(dec.authenticated, false);
    }
    assert.equal(result.frameBytes, Buffer.byteLength(v.frame));
    assert.equal(result.compressionRatio, Number((Buffer.byteLength(v.raw) / Buffer.byteLength(v.frame)).toFixed(2)));
  }
});

test('CRC32 uses the standard check value and b3 uses UTF-8', () => {
  assert.equal(browser.crc32('123456789'), 'cbf43926');
  assert.equal(ternaryHash9('日本語 🐝').signature, '000T11110');
});

test('every single-character corruption in an ASCII frame is rejected', () => {
  const frame = encode('hello integrity', { tag: 'TEST', sender: 'sender' }).frame;
  for (let i = 0; i < frame.length; i++) {
    const changed = frame.slice(0, i) + (frame[i] === 'x' ? 'y' : 'x') + frame.slice(i + 1);
    assert.equal(decode(changed).valid, false, `offset ${i}`);
    assert.equal(browser.decodeKompress(changed).valid, false, `browser offset ${i}`);
  }
});

test('checks payload checksum, canonical metadata, escape syntax, and complete envelope', () => {
  const frame = encode('hello integrity').frame;
  const invalid = [
    repairCRC(frame.replace(/b3:[T01]{9}/, 'b3:000000000')),
    repairCRC(frame.replace(/\([+-]?\d+\)/, '(+99)')),
    repairCRC(frame.replace('hello integrity', '§UNKNOWN')),
    repairCRC(frame.replace('by:Peter', 'by:%50eter')),
    repairCRC(frame.replace('by:Peter', 'by:%XXPeter')),
    frame + '\n', frame + 'extra', frame.slice(0, -1),
    '<~~0o0|TEST:{<3,<3,<3}+1|b3:000000000(+0)|by:sender|legacy|0o0~~>',
    frame.replace('|v2|', '|v3|'), '', null,
  ];
  for (const text of invalid) {
    assert.equal(decode(text).valid, false, String(text));
    assert.equal(browser.decodeKompress(text).valid, false, String(text));
  }
});

test('escaped dictionary tokens remain exact across repeated encode/decode cycles', () => {
  const chunks = ['§', '§MGF', '§§', 'MultiGraphFamily', '\n\t ', '|0o0~~>', '|crc32:12345678', '🐝', 'e\u0301', '\u0000', '\uFEFF'];
  let seed = 41;
  for (let i = 0; i < 250; i++) {
    let raw = '';
    for (let j = 0; j < 16; j++) { seed = (seed * 1664525 + 1013904223) >>> 0; raw += chunks[seed % chunks.length]; }
    for (let round = 0; round < 3; round++) {
      const frame = encode(raw).frame;
      assert.equal(decode(frame).restored, raw);
      assert.equal(browser.decodeKompress(frame).restored, raw);
      assert.equal(browser.encodeKompress(raw).frame, frame);
    }
  }
});

test('JSON remains exact and unpaired surrogate inputs are rejected', () => {
  const value = { text: '  §MGF\n日本語  ', empty: '' };
  assert.deepEqual(JSON.parse(decode(encode(value).frame).restored), value);
  for (const raw of ['\uD800', '\uDC00']) assert.throws(() => encode(raw), /Unicode/);
  assert.throws(() => encode(undefined), /serializable/);
});

test('live codec view verifies the complete multiline frame', () => {
  const elements = {
    'kompress-input': { value: '  multiline\n日本語 §MGF  ' },
    'kompress-output': { textContent: '', dataset: {} },
    'kompress-decoded': { textContent: '' },
  };
  browser.document = { getElementById: id => elements[id] };
  vm.runInContext(html.slice(html.indexOf('function runLiveKompress()'), html.indexOf('function switchTab(')), browser);
  browser.runLiveKompress();
  const result = JSON.parse(elements['kompress-decoded'].textContent);
  assert.equal(result.valid, true);
  assert.equal(result.restored, elements['kompress-input'].value);
  assert.match(elements['kompress-output'].textContent, /UTF-8 frame:/);
  assert.doesNotMatch(elements['kompress-output'].textContent, /undefined|airtime|6-bit/);
});
