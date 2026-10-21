import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
const html = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function page(navigator = {}, bridge) {
  const { document } = parseHTML(html);
  const storage = new Map();
  const context = vm.createContext({ document, TextEncoder, TextDecoder, URL,
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) },
    navigator, window: { addEventListener() {}, AndroidBeeHiveBridge: bridge } });
  vm.runInContext(source, context);
  vm.runInContext('loadState(); renderFamilyGraph(); renderDigestCards()', context);
  return { document, run: code => vm.runInContext(code, context), text: id => document.getElementById(id).textContent };
}
test('local graph and presence views never report live or Apple-account status', () => {
  const p=page();
  assert.match(p.text('findmy-list'), /UNVERIFIED/);
  assert.doesNotMatch(p.text('findmy-list'), /ONLINE/);
  assert.match(p.text('pill-members'), /LOCAL GRAPH/);
  p.document.getElementById('new-name').value='Example'; p.run('addNewFamilyMember()');
  assert.match(p.text('invite-output'), /Added local record/);
  assert.match(p.text('invite-output'), /No account invite or radio message was sent/);
  assert.equal(p.run('members.at(-1).distM'), null);
  assert.doesNotMatch(p.text('invite-output'), /BYPASSED/);
});
test('FindMy, LoRa and AirPlay actions report local preview/unavailable without invented success', () => {
  const p=page();
  p.run('pingFindMyRing()'); assert.match(p.text('lora-log'), /NOT SENT/);
  assert.doesNotMatch(p.text('lora-log'), /responded|42ms|UWB=LOCKED/);
  p.run('broadcastLoRaHeartbeat()'); assert.match(p.text('lora-log'), /NOT TRANSMITTED/);
  const frame=p.text('lora-log').split('\n')[1];
  assert.equal(p.run(`decodeKompress(${JSON.stringify(frame)}).valid`), true);
  assert.doesNotMatch(p.text('lora-log'), /=OK|920.0 MHz/);
  p.run('triggerAirPlayPicker()'); assert.match(p.text('ble-airplay-log'), /No route picker was opened or audio route changed/);
});
test('unavailable device APIs do not invent cached device observations', async () => {
  const p=page();
  await p.run('connectWebSerialLoRa()'); assert.match(p.text('lora-log'), /unavailable/);
  await p.run('scanBluetoothDevices()'); assert.match(p.text('ble-airplay-log'), /No scan performed or cached devices loaded/);
  assert.doesNotMatch(p.text('ble-airplay-log'), /RSSI|soundcore|ADA:MEDUSA/);
});
test('serial check opens then closes selected port without writing or claiming device identity', async () => {
  const calls=[];
  const port={open: async opts=>calls.push(['open',opts.baudRate]), close: async()=>calls.push(['close']), writable: { getWriter(){throw new Error('must not write');} }};
  const p=page({serial:{requestPort:async()=>{calls.push(['select']);return port;}}});
  await p.run('connectWebSerialLoRa()');
  assert.deepEqual(calls,[['select'],['open',115200],['close']]);
  assert.match(p.text('lora-log'), /API result/); assert.match(p.text('lora-log'), /Device identity and LoRa capability are unverified/);
  assert.doesNotMatch(p.text('lora-log'), /Sending/);
});
test('serial selection, opening and closing failures retain honest outcomes', async () => {
  for (const stage of ['selection','open','close']) {
    const p=page({serial:{requestPort:async()=>{
      if(stage==='selection') throw new Error('cancelled');
      return {open:async()=>{if(stage==='open') throw new Error('busy');},close:async()=>{if(stage==='close')throw new Error('close failed');}};
    }}});
    await p.run('connectWebSerialLoRa()');
    assert.match(p.text('lora-log'), /No bytes sent/);
    assert.doesNotMatch(p.text('lora-log'), /API result|simulation remains active/);
    if(stage==='close') assert.match(p.text('lora-log'), /may still be open/);
  }
});
test('Bluetooth selected-device result does not claim pairing and cancellation does not fabricate cache', async () => {
  const p=page({bluetooth:{requestDevice:async()=>({name:'Example radio',id:'synthetic'})}});
  await p.run('scanBluetoothDevices()');
  assert.match(p.text('ble-airplay-log'), /Selected device: Example radio/);
  assert.match(p.text('ble-airplay-log'), /does not confirm pairing/);
  const cancelled=page({bluetooth:{requestDevice:async()=>{throw new Error('cancelled');}}});
  await cancelled.run('scanBluetoothDevices()');
  assert.match(cancelled.text('ble-airplay-log'), /No new device observation/);
  assert.doesNotMatch(cancelled.text('ble-airplay-log'), /RSSI|Showing cached/);
});
test('Android results label actual source categories and handle absent or malformed results', async () => {
  const p=page({}, {scanRadiosJson:()=>JSON.stringify([{transport:'FindMy/WiFi',name:'fixture-network'}, {transport:'AirPlay/A2DP',bluetoothA2dpOn:true},{transport:'Bluetooth',name:'fixture-radio'}])});
  await p.run('scanBluetoothDevices()');
  for(const label of ['Wi-Fi (cached)','Bluetooth A2DP (system flag)','Bluetooth (bonded)','Not a live scan']) assert.ok(p.text('ble-airplay-log').includes(label));
  assert.doesNotMatch(p.text('ble-airplay-log'), /"transport": "FindMy|"transport": "AirPlay/);
  for(const result of ['[]','not-json','null']) {
    const bad=page({}, {scanRadiosJson:()=>result}); await bad.run('scanBluetoothDevices()');
    assert.match(bad.text('ble-airplay-log'), result==='[]'?/permissions/:/No verified observations/);
  }
});
test('digest fixture cards distinguish local encoding from unevaluated source claims', () => {
  const p=page();const cards=p.document.querySelectorAll('#digest-cards > .member-row');
  assert.equal(cards.length,4);
  for(const card of cards) {
    assert.match(card.textContent,/DEMO FIXTURE · UNASSESSED/);
    assert.match(card.textContent,/Unverified fixture narrative:/);
    assert.match(card.textContent,/not read by this page/);
    assert.doesNotMatch(card.textContent,/STAGE 1–5 VERIFIED|10\/10/);
  }
});
