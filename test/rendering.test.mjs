import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
const html = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const payload = '<img src=x onerror="globalThis.injected=true"><svg onload="globalThis.injected=true">&"\'🐝';
function page(storage = new Map()) {
  const { document } = parseHTML(html);
  const context = vm.createContext({ document, TextEncoder, TextDecoder, URL,
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    window: { addEventListener() {} }, navigator: {} });
  vm.runInContext(source, context);
  vm.runInContext('loadState(); renderFamilyGraph(); renderDigestCards();', context);
  return { document, context, storage };
}
function assertPassive(root) {
  assert.equal(root.querySelectorAll('script,img,iframe,object,embed,foreignObject').length, 0, 'no injected element');
  for (const el of root.querySelectorAll('*')) for (const a of el.attributes) {
    assert.ok(!/^on/i.test(a.name), `unexpected event attribute ${a.name}`);
    assert.ok(!/javascript:|data:text\/html/i.test(a.value), `unsafe attribute ${a.name}`);
  }
}
test('adding a member renders markup literally and restores it safely from storage', () => {
  const p = page();
  for (const id of ['new-name','new-role','new-symbol']) p.document.getElementById(id).value = payload;
  vm.runInContext('addNewFamilyMember()', p.context);
  const row = p.document.querySelector('#member-list').lastElementChild;
  assert.ok(row.textContent.includes(payload));
  assertPassive(p.document.getElementById('member-list'));
  assertPassive(p.document.getElementById('hive-svg'));
  const before = JSON.stringify([...p.storage]);
  const restored = page(p.storage);
  assert.ok(restored.document.querySelector('#member-list').lastElementChild.textContent.includes(payload));
  assertPassive(restored.document.getElementById('member-list'));
  assertPassive(restored.document.getElementById('hive-svg'));
  assert.equal(JSON.stringify([...p.storage]), before, 'reading must not rewrite stored values');
});
test('stored fields cannot escape SVG, roster, FindMy or color attributes', () => {
  const p = page();
  p.context.attack = payload;
  vm.runInContext(`members[0] = { ...members[0], id: '__proto__', name: attack, handle: attack, role: attack, symbol: attack, loc: attack, freq: attack, distM: attack, transports: [attack], color: '#fff;position:fixed;inset:0" onmouseover="injected=true' }; renderFamilyGraph();`, p.context);
  for (const id of ['hive-svg','member-list','findmy-list']) {
    const el = p.document.getElementById(id); assertPassive(el);
    assert.ok(el.textContent.includes(payload));
    assert.ok(!el.innerHTML.includes('position:fixed'));
  }
});
test('digest titles, summary, stages and frames render as literal text with safe links', () => {
  const p = page();p.context.attack=payload;
  vm.runInContext(`Object.assign(DIGEST_ITEMS[0], { lane: attack, title: attack, summary: attack, stages: attack, score: attack, url: 'javascript:globalThis.injected=true' }); renderDigestCards();`, p.context);
  const card=p.document.querySelector('#digest-cards').firstElementChild;
  assertPassive(card);assert.ok(card.textContent.includes(payload));
  assert.equal(card.querySelector('a[href]'),null);
  for (const link of p.document.querySelectorAll('#digest-cards a[href]')) {
    assert.match(link.getAttribute('href'), /^https?:\/\//);
    assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  }
});
test('default view keeps graph geometry, roster counts, palette, and digest layout', () => {
  const {document}=page();
  assert.equal(document.querySelectorAll('#hive-svg g').length,10);
  assert.equal(document.querySelectorAll('#hive-svg > circle').length,3);
  assert.equal(document.querySelectorAll('#member-list .member-row').length,10);
  assert.equal(document.querySelectorAll('#findmy-list .member-row').length,8);
  assert.equal(document.getElementById('roster-count').textContent,'10');
  assert.equal(document.getElementById('banner-overflow-count').textContent,'4');
  assert.equal(document.querySelector('#hive-svg g circle').getAttribute('stroke'),'#FF6AC1');
  assert.equal(document.querySelectorAll('#digest-cards > .member-row').length,4);
});
