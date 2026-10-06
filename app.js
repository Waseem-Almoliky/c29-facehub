import {C29, supported, rgb565Background} from './c29ble.js';
import * as face from './face.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const SWATCHES = ['#B3AE5E', '#8A8E4A', '#F2C14E', '#E66942', '#E34A42', '#4FA3E0', '#5CC8A8', '#C77DDB', '#FFFFFF'];
const watch = new C29();
let tab = 'watch', catalog = null, storeTag = 1, storeShown = 36, busy = false;
const urls = new Map(); // face key -> object URL of its preview

// ---------- storage (IndexedDB: one record per face) ----------
const dbp = new Promise((res, rej) => {
  const r = indexedDB.open('facehub', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('faces', {keyPath: 'key'});
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function tx(mode, fn) {
  const db = await dbp;
  return new Promise((res, rej) => {
    const t = db.transaction('faces', mode), s = t.objectStore('faces'), r = fn(s);
    t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error);
  });
}
const allFaces = async () => (await tx('readonly', s => s.getAll())).sort((a, b) => b.added - a.added);
const getFace = key => tx('readonly', s => s.get(key));
const putFace = f => tx('readwrite', s => s.put(f));
const delFace = key => tx('readwrite', s => s.delete(key));
const pref = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } };

async function addFace(bytes, name, id, key) {
  const d = new Uint8Array(bytes);
  if (!face.isFace(d)) throw new Error(`${name} is not a C29 (tpls 72) face file`);
  const f = {key: key || `f${Date.now()}${Math.random().toString(36).slice(2, 6)}`, name, id: id || null,
             data: d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength), preview: await face.previewBlob(d), added: Date.now()};
  await putFace(f);
  return f;
}
function previewUrl(f) {
  if (!urls.has(f.key)) urls.set(f.key, URL.createObjectURL(f.preview));
  return urls.get(f.key);
}

// ---------- UI helpers ----------
function toast(msg, warn) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast' + (warn ? ' warn' : ''); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
}
function sheet(html) {
  closeSheet();
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  bg.onclick = e => { if (e.target === bg && !busy) closeSheet(); };
  document.body.appendChild(bg);
  return bg.firstChild;
}
const closeSheet = () => document.querySelectorAll('.sheet-bg').forEach(s => s.remove());
function card(img, name, sub, onclick, sel) {
  const el = document.createElement('div'); el.className = 'card' + (sel ? ' sel' : '');
  el.innerHTML = `<div class="dial"></div><div class="nm">${esc(name)}</div><div class="sub">${sub || ''}</div>`;
  if (img) dialImage(el.firstChild, img);
  el.onclick = onclick; return el;
}
// Preview with automatic retries (store images sometimes fail on flaky connections), then a retry button.
function dialImage(dial, src, tries = 0) {
  dial.classList.add('loading'); dial.classList.remove('err');
  const im = new Image(); im.alt = ''; im.decoding = 'async';
  // Some requests hang instead of failing; after 12 s cancel and treat it as an error.
  const timer = setTimeout(() => { im.onload = null; im.src = ''; fail(); }, 12000);
  im.onload = () => { clearTimeout(timer); dial.classList.remove('loading'); dial.replaceChildren(im); };
  const fail = () => {
    clearTimeout(timer); im.onerror = null;
    if (tries < 2) return setTimeout(() => dialImage(dial, src, tries + 1), 1000 * (tries + 1));
    dial.classList.remove('loading'); dial.classList.add('err'); previewFailed();
    const b = document.createElement('button'); b.className = 'retry'; b.innerHTML = `↻<span>${t('Retry')}</span>`;
    b.onclick = e => { e.stopPropagation(); dialImage(dial, src); };
    dial.replaceChildren(b);
  };
  im.onerror = fail;
  im.src = src;
}

// ---------- watch connection ----------
watch.onDisconnect = () => { updateConn(); if (tab === 'watch') render(); };
function updateConn() {
  const b = $('#conn');
  b.textContent = watch.connected ? '● ' + (watch.device.name || 'C29') : t('Connect watch');
  b.classList.toggle('on', watch.connected);
}
async function ensureConnected() {
  if (watch.connected) return true;
  if (!supported()) {
    toast(t(window.isSecureContext ? 'This browser has no Web Bluetooth. Use Chrome on Android.' : 'Bluetooth needs HTTPS or localhost.'), true);
    return false;
  }
  try {
    toast(t("Turn off Bluetooth in the Da Fit app (or the phone's pairing with Da Fit) if connecting fails."));
    await watch.connect(); updateConn();
    pref('current', await watch.currentFace());
    return true;
  } catch (e) {
    if (e.name !== 'NotFoundError') toast(t('Could not connect: {e}', {e: e.message}), true);
    return false;
  }
}
$('#conn').onclick = async () => {
  if (watch.connected) { watch.disconnect(); updateConn(); }
  else if (await ensureConnected() && tab === 'watch') render();
};

async function install(f) {
  if (busy) return;
  if (!f.id) { toast(t('Set the face\'s store ID first (see "Face ID" below).'), true); return; }
  if (!await ensureConnected()) return;
  busy = true;
  const box = [...document.querySelectorAll('#job')].pop(); // the open sheet's, if any
  const lines = [];
  watch.log = m => { lines.push(m); draw(); };
  let pct = 0;
  const draw = () => box && (box.innerHTML = `<div class="box"><b>${t('Installing… {p}%', {p: pct})}</b><div class="bar"><i style="width:${pct}%"></i></div><pre>${esc(lines.slice(-5).join('\n'))}</pre></div>`);
  draw();
  try {
    const ok = await watch.upload(new Uint8Array(f.data), f.id, p => { pct = p; draw(); });
    if (ok) { pref('installed', f.key); pref('current', 8); toast(t('Face installed ✓')); }
    else toast(t('The watch did not accept the face. Try again.'), true);
  } catch (e) {
    toast(t('Install failed: {e}', {e: e.message}), true);
  } finally {
    busy = false; watch.log = () => {};
    if (box) box.innerHTML = '';
    if (tab === 'watch') render();
  }
}

// ---------- tabs ----------
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

async function render() {
  const m = $('#main');
  if (tab === 'watch') return renderWatch(m);
  if (tab === 'library') return renderLibrary(m);
  return renderStore(m);
}

async function renderWatch(m) {
  const faces = await allFaces();
  const inst = faces.find(f => f.key === pref('installed'));
  const cur = pref('current');
  m.innerHTML = `
    ${supported() ? '' : `<div class="box warn"><p class="hint" style="margin:0">${t(window.isSecureContext
      ? 'This browser has no Web Bluetooth. Open FaceHub in <b>Chrome on Android</b>.'
      : 'Web Bluetooth needs a secure page (HTTPS or localhost).')}</p></div>`}
    <h2>${t('On the watch')}</h2>
    <p class="hint">${t('Faces 1–7 are built in. Slot 8 holds one custom face; installing replaces it (about 20 s).')}
      ${t(watch.connected ? 'Tap a slot to show it.' : 'Connect to switch faces.')}</p>
    <div class="grid" id="slots"></div>
    <div id="job" style="margin-top:14px"></div>
    <button class="btn ghost" id="bg" style="margin-top:14px">${t('🖼 Put your photo on face 2')}</button>
    <h2>${t('Quick install')}</h2><div class="grid" id="quick"></div>`;
  const slots = $('#slots');
  for (let n = 1; n <= 8; n++) {
    const img = n === 8 && inst ? previewUrl(inst) : n === 2 ? pref('bgThumb') || '' : '';
    const el = card(img, n === 8 ? (inst ? inst.name : t('Custom')) : n === 2 ? t('Your photo') : t('Built-in {n}', {n}), cur === n ? t('showing') : '', async () => {
      if (busy || !await ensureConnected()) return;
      busy = true;
      try { const now = await watch.showFace(n); pref('current', now); if (now !== n) toast(t('Watch stayed on face {n}', {n: now}), true); }
      catch (e) { toast(e.message, true); }
      busy = false; render();
    }, cur === n);
    if (!img) el.querySelector('.dial').textContent = n;
    slots.appendChild(el);
  }
  $('#bg').onclick = openBackground;
  const quick = $('#quick');
  const list = faces.filter(f => f.fav).concat(faces.filter(f => !f.fav)).slice(0, 9);
  if (!list.length) quick.outerHTML = `<div class="empty">${t('No faces yet.<br>Get some from the Store, or import .bin files in My faces.')}</div>`;
  list.forEach(f => quick.appendChild(card(previewUrl(f), f.name, (f.fav ? '★ ' : '') + (f.key === pref('installed') ? t('in slot 8') : ''), () => openFace(f))));
}

async function renderLibrary(m) {
  const faces = await allFaces();
  m.innerHTML = `<div class="chips"><button class="chip" id="imp">${t('＋ Import .bin')}</button>${location.protocol.startsWith('http') && await hasPc() ? `<button class="chip" id="pc">${t('⇣ From PC FaceHub')}</button>` : ''}</div>
    <div class="grid" id="g"></div>`;
  $('#imp').onclick = () => $('#file').click();
  if ($('#pc')) $('#pc').onclick = importFromPc;
  const g = $('#g');
  if (!faces.length) g.outerHTML = `<div class="empty">${t('Your faces live here, stored on this phone.')}</div>`;
  faces.sort((a, b) => (b.fav | 0) - (a.fav | 0)).forEach(f =>
    g.appendChild(card(previewUrl(f), f.name, (f.fav ? '★ ' : '') + (f.key === pref('installed') ? t('on watch') : t('{kb} KB', {kb: Math.round(f.data.byteLength / 1024)})), () => openFace(f))));
}

$('#file').onchange = async e => {
  let n = 0;
  for (const file of e.target.files) {
    try {
      const digits = file.name.match(/\d{4,6}/);
      await addFace(await file.arrayBuffer(), file.name.replace(/\.bin$/i, '').replace(/_/g, ' '), digits ? +digits[0] : null);
      n++;
    } catch (err) { toast(err.message, true); }
  }
  e.target.value = '';
  if (n) { toast(t('Imported {n} face{s}', {n, s: n > 1 ? 's' : ''})); render(); }
};

// When this page is served by FaceHub on the PC, it can pull faces (with their IDs) from it.
let pcCheck;
const hasPc = () => pcCheck ??= fetch('../api/library').then(r => r.ok, () => false);
async function importFromPc() {
  const list = await (await fetch('../api/library')).json();
  const have = new Set((await allFaces()).map(f => f.key));
  let n = 0;
  for (const i of list) {
    const key = 'pc:' + i.lib + '/' + i.file;
    if (have.has(key) || !i.id) continue;
    const r = await fetch(`../api/file/${i.lib}/${encodeURIComponent(i.file)}`);
    if (r.ok) { await addFace(await r.arrayBuffer(), i.name, i.id, key); n++; }
  }
  toast(n ? t('Copied {n} face{s} from the PC', {n, s: n > 1 ? 's' : ''}) : t('Nothing new on the PC'));
  render();
}

async function renderStore(m) {
  if (!catalog) {
    m.innerHTML = `<div class="empty">${t('Loading store…')}</div>`;
    try { catalog = await (await fetch('catalog.json')).json(); }
    catch { m.innerHTML = `<div class="empty">${t('Store catalog unavailable offline.')}</div>`; return; }
  }
  const have = new Set((await allFaces()).map(f => f.key));
  const list = catalog.faces.filter(f => f.tags.includes(storeTag));
  m.innerHTML = `<div class="chips">${catalog.tags.map(g => `<button class="chip ${g.id === storeTag ? 'on' : ''}" data-t="${g.id}">${t(g.name)}</button>`).join('')}</div>
    <div class="grid" id="g"></div>${list.length > storeShown ? `<button class="btn ghost" id="more" style="margin-top:18px">${t('Show more')}</button>` : ''}`;
  m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { storeTag = +b.dataset.t; storeShown = 36; render(); });
  if ($('#more')) $('#more').onclick = () => { storeShown += 36; render(); };
  const g = $('#g');
  pcStore = location.protocol.startsWith('http') && await hasPc();
  list.slice(0, storeShown).forEach(f => g.appendChild(card(storePreview(f), f.name, have.has('store:' + f.id) ? t('✓ saved') : '', () => openStore(f))));
}

// Streams the file so the progress bar shows real bytes received (size from the CDN, else the catalog).
// Served by PC FaceHub: get previews through it (it reaches MoYoung on a working IP and keeps them on disk).
let pcStore = false;
const storePreview = f => pcStore ? `../api/store/preview/${f.id}?url=${encodeURIComponent(f.preview)}` : f.preview;
// Some home ISPs' DNS sends parts of MoYoung's CDN to a dead address; say how to fix it, once.
let dnsHinted = false, failedPreviews = 0;
function previewFailed() {
  if (++failedPreviews < 3 || dnsHinted || pcStore) return;
  dnsHinted = true;
  toast(t('Some previews will not load on this network. Fix: phone Settings → Private DNS → dns.google'), true);
}

async function downloadStore(f, onProgress = () => {}) {
  const r = await fetch(f.file);
  if (!r.ok) throw new Error('download failed (' + r.status + ')');
  const total = +r.headers.get('Content-Length') || f.size || 0;
  let data;
  if (r.body) {
    const reader = r.body.getReader(), parts = [];
    let got = 0;
    onProgress(0, total);
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      parts.push(value); got += value.length; onProgress(got, total);
    }
    data = new Uint8Array(got);
    let o = 0; for (const p of parts) { data.set(p, o); o += p.length; }
  } else data = new Uint8Array(await r.arrayBuffer());
  return addFace(data, f.name, f.id, 'store:' + f.id);
}
function dlProgress(box, got, total) {
  if (!box) return;
  const pct = total ? Math.min(100, Math.round(got / total * 100)) : 0, kb = n => Math.round(n / 1024);
  box.innerHTML = `<div class="box"><b>${t('Downloading… {p}%', {p: pct})}</b>
    <div class="bar${total ? '' : ' busy'}"><i style="width:${pct}%"></i></div>
    <p class="hint" style="margin:0">${t('{got} of {total} KB', {got: kb(got), total: kb(total)})}</p></div>`;
}

function openStore(f) {
  const s = sheet(`<div class="big"><div class="dial" style="background-image:url('${storePreview(f)}')"></div></div>
    <div class="title">${esc(f.name)}</div><div class="meta">${t('Store face #{id}', {id: f.id})} · ${t('{kb} KB', {kb: Math.round(f.size / 1024)})}</div>
    <button class="btn primary" id="di">${t('Download &amp; install')}</button>
    <button class="btn ghost" id="d">${t('Save to My faces')}</button><div id="dlp"></div><div id="job"></div>`);
  const dlp = s.querySelector('#dlp'), btns = s.querySelectorAll('#d, #di');
  const get = async () => (await getFace('store:' + f.id)) || downloadStore(f, (got, total) => dlProgress(dlp, got, total));
  const go = (btn, then) => async () => {
    btns.forEach(b => b.disabled = true); btn.textContent = t('Downloading…');
    try { await then(await get()); }
    catch (err) { dlp.innerHTML = ''; toast(t('Download failed: {e}', {e: err.message}), true); }
    btns.forEach(b => b.disabled = false);
    s.querySelector('#di').innerHTML = t('Download &amp; install'); s.querySelector('#d').textContent = t('Save to My faces');
  };
  s.querySelector('#d').onclick = go(s.querySelector('#d'), x => { closeSheet(); openFace(x); });
  s.querySelector('#di').onclick = go(s.querySelector('#di'), async x => { dlp.innerHTML = ''; await install(x); closeSheet(); });
}

// Built-in face 2 is customisable: background photo, time colour/position, two info lines.
function openBackground() {
  const INFO = ['none', 'date', 'sleep', 'heart rate', 'steps'];
  const opts = sel => INFO.map((x, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${t(x)}</option>`).join('');
  const L = pref('bgLayout') || {pos: 0, top: 1, bottom: 4, colour: '#FFFFFF'};
  const s = sheet(`<div class="title">${t('Face 2: your photo')}</div>
    <div class="meta">${t('Background, time colour and info lines for built-in face 2')}</div>
    <div class="big"><canvas id="bgc" width="360" height="360" class="dial" style="display:block"></canvas></div>
    <label class="btn ghost" style="text-align:center">${t('Choose a photo…')}<input type="file" id="bgf" accept="image/*" hidden></label>
    <div class="box"><b>${t('Time colour')}</b>
      <div class="sw" style="margin-top:10px">${SWATCHES.map(c => `<i data-c="${c}" style="background:${c}"></i>`).join('')}<input type="color" id="tc" value="${L.colour}"></div>
      <button class="btn ghost" id="tpick">${t('📷 Pick colour from a photo')}</button>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center">
        <span>${t('Time at')}</span><select id="pos"><option value="0">${t('top')}</option><option value="1" ${L.pos === 1 ? 'selected' : ''}>${t('bottom')}</option></select>
        <span>${t('Above')}</span><select id="top">${opts(L.top)}</select>
        <span>${t('Below')}</span><select id="bot">${opts(L.bottom)}</select></div></div>
    <div id="job"></div>
    <button class="btn primary" id="send" disabled>${t('Send photo + layout')}</button>
    <button class="btn ghost" id="lay">${t('Update layout only')}</button>`);
  s.querySelectorAll('select').forEach(x => Object.assign(x.style, {background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px', font: 'inherit'}));
  const cv = s.querySelector('#bgc'), ctx = cv.getContext('2d');
  const photo = document.createElement('canvas'); photo.width = photo.height = 360;
  let hasPhoto = false, colour = L.colour;
  const layout = () => ({pos: +s.querySelector('#pos').value, top: +s.querySelector('#top').value, bottom: +s.querySelector('#bot').value, colour});
  const draw = () => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 360, 360);
    if (hasPhoto) ctx.drawImage(photo, 0, 0);
    const l = layout(), y = l.pos === 0 ? 150 : 270, lab = ['', 'SEP 28', '7h 20m', '♥ 72', '8421'];
    ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.font = 'bold 84px system-ui'; ctx.fillText('10:09', 180, y);
    ctx.font = '24px system-ui'; ctx.fillText(lab[l.top], 180, y - 92); ctx.fillText(lab[l.bottom], 180, y + 40);
  };
  draw();
  s.querySelector('#bgf').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const im = new Image();
    im.onload = () => {
      const side = Math.min(im.width, im.height);
      photo.getContext('2d').drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 360, 360);
      hasPhoto = true; s.querySelector('#send').disabled = false; draw();
    };
    im.src = URL.createObjectURL(f);
  };
  s.querySelectorAll('select').forEach(x => x.onchange = draw);
  s.querySelectorAll('.sw i').forEach(i => i.onclick = () => { colour = i.dataset.c; s.querySelector('#tc').value = colour; draw(); });
  s.querySelector('#tc').oninput = e => { colour = e.target.value; draw(); };
  s.querySelector('#tpick').onclick = async () => {
    const c = await pickColour({title: t('Time colour from a photo')}); if (!c) return;
    colour = c; s.querySelector('#tc').value = c.toLowerCase(); draw(); };

  const go = async withPhoto => {
    if (busy || !await ensureConnected()) return;
    busy = true;
    const box = s.querySelector('#job');
    let pct = 0;
    const show = msg => { box.innerHTML = `<div class="box"><b>${msg}</b>${withPhoto ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div>`; };
    show(t('Connecting…'));
    try {
      const info = await watch.queryLayout();
      if (!info) throw new Error(t('the watch did not report a customisable face'));
      let tag = info.md5;
      if (withPhoto) {
        const data = rgb565Background(photo, info.w || 360, info.thumbW || 200);
        tag = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
        if (!await watch.uploadBackground(data, p => { pct = p; show(t('Sending photo… {p}%', {p})); })) throw new Error(t('the watch rejected the photo (checksum)'));
        const th = document.createElement('canvas'); th.width = th.height = 120;
        th.getContext('2d').drawImage(photo, 0, 0, 120, 120);
        pref('bgThumb', th.toDataURL('image/jpeg', 0.8));
      }
      const l = layout(), [r, g, b] = face.hexRgb(colour);
      await watch.setLayout({...l, colour: (r >> 3) << 11 | (g >> 2) << 5 | (b >> 3)}, tag);
      pref('bgLayout', l);
      const now = await watch.showFace(2); pref('current', now);
      toast(t(withPhoto ? 'Photo face updated ✓' : 'Layout updated ✓'));
      closeSheet();
    } catch (e) {
      toast(t('Failed: {e}', {e: e.message}), true); box.innerHTML = '';
    } finally {
      busy = false; if (tab === 'watch') render();
    }
  };
  s.querySelector('#send').onclick = () => go(true);
  s.querySelector('#lay').onclick = () => go(false);
}

function openFace(f) {
  let colour = '#B3AE5E';
  const s = sheet(`<div class="big"><div class="dial" style="background-image:url('${previewUrl(f)}')"></div></div>
    <div class="pvbar" id="pv" hidden><span>${t('Preview')} <b dir="ltr"></b> · <small>${t('not saved yet')}</small></span><button class="chip" id="pvt">${t('Show original')}</button></div>
    <div class="title">${esc(f.name)}</div><div class="meta">${f.key === pref('installed') ? t('On the watch (slot 8)') : t('{kb} KB', {kb: Math.round(f.data.byteLength / 1024)})}</div>
    <button class="btn primary" id="in">${t('Install on watch')}</button>
    <div id="job"></div>
    <button class="btn ghost" id="fav">${t(f.fav ? '★ Favourite' : '☆ Add to favourites')}</button>
    <div class="box"><div class="pvhead"><b>${t('Recolour')}</b><div class="dial mini" id="pvmini" hidden></div></div><p class="hint" style="margin-top:6px">${t("Shifts the face's accent colour and saves a copy.")}</p>
      <div class="sw">${SWATCHES.map(c => `<i data-c="${c}" style="background:${c}"></i>`).join('')}<input type="color" id="cc" value="${colour}"></div>
      <button class="btn ghost" id="cpick">${t('📷 Pick colour from a photo')}</button>
      <button class="btn ghost" id="rc" style="margin:0">${t('Make recoloured copy')}</button></div>
    <div class="box"><b>${t('Face ID')}</b><p class="hint" style="margin-top:6px">${t("The store ID the watch is told after installing. Copies keep the original's ID. Without a valid ID the watch shows a dark screen and goes back to a built-in face.")}</p>
      <input type="number" id="fid" value="${f.id || ''}" placeholder="${t('e.g. 26096')}"></div>
    <button class="btn ghost" id="share">${t('Share .bin file')}</button>
    <button class="btn danger" id="del">${t('Delete')}</button>`);
  s.querySelector('#in').onclick = async e => { e.target.disabled = true; await install(f); e.target.disabled = false; };
  s.querySelector('#fav').onclick = async () => { f.fav = !f.fav; await putFace(f); openFace(f); render(); };
  // Live preview: recolour just the preview picture as soon as a colour is chosen.
  const dial = s.querySelector('.big .dial'), pv = s.querySelector('#pv'), mini = s.querySelector('#pvmini');
  let prev = null, chosen = false, showOrig = false, raf = 0;
  const im = new Image(); im.onload = () => { prev = face.previewer(im); if (chosen) preview(); }; im.src = previewUrl(f);
  const preview = () => {
    chosen = true; if (!prev) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const url = `url('${prev(colour)}')`;
      dial.style.backgroundImage = showOrig ? `url('${previewUrl(f)}')` : url; mini.style.backgroundImage = url;
      pv.hidden = mini.hidden = false; pv.querySelector('b').textContent = colour.toUpperCase();
      pv.querySelector('b').style.color = colour;
    });
  };
  s.querySelector('#pvt').onclick = e => { showOrig = !showOrig; e.target.textContent = t(showOrig ? 'Show preview' : 'Show original'); preview(); };
  s.querySelectorAll('.sw i').forEach(i => i.onclick = () => {
    colour = i.dataset.c; s.querySelector('#cc').value = colour;
    s.querySelectorAll('.sw i').forEach(x => x.classList.toggle('on', x === i)); preview(); });
  s.querySelector('#cc').oninput = e => { colour = e.target.value; s.querySelectorAll('.sw i').forEach(x => x.classList.remove('on')); preview(); };
  s.querySelector('#cpick').onclick = async () => {
    const c = await pickColour({title: t('Recolour from a photo')}); if (!c) return;
    colour = c; s.querySelector('#cc').value = c.toLowerCase();
    s.querySelectorAll('.sw i').forEach(x => x.classList.remove('on')); preview();
    dial.scrollIntoView({behavior: 'smooth', block: 'center'}); };
  s.querySelector('#rc').onclick = async e => {
    e.target.disabled = true; e.target.textContent = t('Recolouring…');
    await new Promise(r => setTimeout(r, 30));
    try {
      const out = face.recolour(new Uint8Array(f.data), colour);
      const copy = await addFace(out, `${f.name} ${colour.toUpperCase()}`, f.id);
      render(); openFace(copy); toast(t('Saved a recoloured copy'));
    } catch (err) { toast(err.message, true); e.target.disabled = false; }
  };
  s.querySelector('#fid').onchange = async e => { f.id = +e.target.value || null; await putFace(f); toast(t('Face ID saved')); };
  s.querySelector('#share').onclick = async () => {
    const file = new File([f.data], f.name.replace(/[^\w-]+/g, '_') + '.bin', {type: 'application/octet-stream'});
    if (navigator.canShare?.({files: [file]})) navigator.share({files: [file], title: f.name}).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
  };
  const del = s.querySelector('#del');
  del.onclick = async () => {
    if (!del.dataset.armed) { del.dataset.armed = 1; del.textContent = t('Tap again to delete'); return; }
    await delFace(f.key); urls.delete(f.key); closeSheet(); render();
  };
}

if ('serviceWorker' in navigator) {
  // The app opens from the saved release; a new release downloads in the background.
  // When it takes over, offer a reload (never mid-install).
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (!busy && !document.querySelector('.sheet-bg') && performance.now() < 15000) return location.reload(); // just opened: switch quietly
    toast(t('A new version is ready: tap here to reload'));
    document.querySelector('.toast').onclick = () => location.reload();
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
window.addEventListener('langchange', () => { if (!busy) closeSheet(); updateConn(); render(); });
$('#lang').onclick = () => i18n.toggle();
updateConn();
render();
