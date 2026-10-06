// Pick a colour from a camera shot or a photo (T-shirt, strap, anything).
// Shared by the phone app and PC FaceHub (loaded there from /m/colorpick.js).
// Usage: const hex = await pickColour();  // '#RRGGBB', or null if cancelled
(function () {
  const CSS = `
.cp-bg{position:fixed;inset:0;z-index:100;background:#0b0c0e;color:#ecebe4;display:flex;flex-direction:column;
  font:15px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 14px)}
.cp-in{width:100%;max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:12px;min-height:0;flex:1}
.cp-top{display:flex;align-items:center;gap:10px}.cp-top b{flex:1;font-size:17px}
.cp-x{background:none;border:1px solid #2b3036;color:#ecebe4;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.cp-hint{color:#8d928f;font-size:13px;line-height:1.5;margin:0}
.cp-btn{display:block;width:100%;padding:13px;border-radius:12px;border:1px solid #2b3036;background:#181b1f;color:#ecebe4;font:inherit;font-weight:600;cursor:pointer;text-align:center}
.cp-btn.pri{background:#B3AE5E;border-color:#B3AE5E;color:#1a1a10}
.cp-row{display:flex;gap:10px}.cp-row>*{flex:1}
.cp-stage{position:relative;flex:1;min-height:180px;display:grid;place-items:center;overflow:hidden;border-radius:14px;background:#000}
.cp-stage canvas,.cp-stage video{max-width:100%;max-height:100%;display:block;touch-action:none;cursor:crosshair}
.cp-drop{flex:1;border:2px dashed #2b3036;border-radius:14px;display:grid;place-items:center;text-align:center;color:#8d928f;padding:20px;min-height:160px}
.cp-drop.on{border-color:#B3AE5E;color:#ecebe4}
.cp-pal{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cp-pal span{font-size:12px;color:#8d928f;margin-right:2px}
.cp-pal i{width:30px;height:30px;border-radius:50%;border:2px solid #0b0c0e;box-shadow:0 0 0 1px #3a3f45;cursor:pointer;display:block}
.cp-res{display:grid;grid-template-columns:auto auto 1fr;gap:6px 12px;align-items:center;background:#15181b;border:1px solid #272b30;border-radius:14px;padding:12px}
.cp-dot{width:44px;height:44px;border-radius:50%;box-shadow:0 0 0 1px #3a3f45}
.cp-res small{display:block;color:#8d928f;font-size:11px}.cp-res code{font-size:14px}
.cp-res input{width:100%;accent-color:#B3AE5E}
`;
  let styled = false;
  const el = (html) => { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstChild; };
  const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

  function rgb2hsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hsl2rgb([h, s, l]) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  // Photos of fabric come out darker and duller than they look on a bright watch screen.
  // Boost lifts lightness and saturation; 0 keeps the photo colour as is.
  function boost(rgb, k) {
    const [h, s, l] = rgb2hsl(rgb);
    return hsl2rgb([h, Math.min(1, s * (1 + 3 * k)), l < 0.78 ? l + (0.78 - l) * k * 0.6 : l]);
  }

  // Main colours of the photo (k-means on a small copy), biggest groups first.
  function palette(src) {
    const n = 72, c = document.createElement('canvas'); c.width = c.height = n;
    c.getContext('2d').drawImage(src, 0, 0, n, n);
    const d = c.getContext('2d').getImageData(0, 0, n, n).data, px = [];
    for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
    const lum = p => p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11;
    const sorted = [...px].sort((a, b) => lum(a) - lum(b)), K = 7;
    let cent = Array.from({length: K}, (_, i) => sorted[Math.floor((i + 0.5) * sorted.length / K)].slice());
    let lab = new Array(px.length);
    for (let it = 0; it < 10; it++) {
      const sum = cent.map(() => [0, 0, 0, 0]);
      px.forEach((p, i) => {
        let best = 0, bd = Infinity;
        cent.forEach((q, j) => { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < bd) { bd = dd; best = j; } });
        lab[i] = best; const s = sum[best]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
      });
      cent = cent.map((q, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3], sum[j][3]] : [...q.slice(0, 3), 0]);
    }
    // Merge near-duplicates, drop tiny groups.
    const out = [];
    cent.sort((a, b) => b[3] - a[3]).forEach(q => {
      if (q[3] < px.length * 0.02) return;
      if (out.some(o => Math.hypot(o[0] - q[0], o[1] - q[1], o[2] - q[2]) < 28)) return;
      out.push(q.slice(0, 3));
    });
    return out.slice(0, 6);
  }

  function loadImage(file) {
    return new Promise((res, rej) => {
      const im = new Image(), u = URL.createObjectURL(file);
      im.onload = () => { URL.revokeObjectURL(u); res(im); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('That file is not a picture the browser can open')); };
      im.src = u;
    });
  }

  window.pickColour = function (opts = {}) {
    if (!styled) { document.head.appendChild(el(`<style>${CSS}</style>`)); styled = true; }
    const touch = matchMedia('(pointer: coarse)').matches;
    const bg = el(`<div class="cp-bg"><div class="cp-in"></div></div>`), box = bg.firstChild;
    document.body.appendChild(bg);
    let stream = null, done;
    const result = new Promise(r => done = r);
    const stopCam = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
    const finish = v => { stopCam(); window.removeEventListener('keydown', onKey); bg.remove(); done(v); };
    const onKey = e => { if (e.key === 'Escape') finish(null); };
    window.addEventListener('keydown', onKey);
    const top = t => `<div class="cp-top"><b>${t}</b><button class="cp-x" data-x>Cancel</button></div>`;
    const wire = () => box.querySelector('[data-x]').onclick = () => finish(null);

    function chooseSource(msg) {
      stopCam();
      box.innerHTML = top(opts.title || 'Colour from a photo') + `
        <p class="cp-hint">${msg || 'Take a photo of your T-shirt (or anything) and tap the spot whose colour you want. Daylight gives the truest colour.'}</p>
        <div class="cp-drop">${touch ? '📷' : 'Drop a picture here, or paste one (Ctrl+V)'}</div>
        <div class="cp-row">
          <button class="cp-btn pri" data-cam>Take photo</button>
          <label class="cp-btn">Choose photo<input type="file" accept="image/*" hidden data-file></label></div>
        <input type="file" accept="image/*" capture="environment" hidden data-snap>`;
      wire();
      const fromFile = async f => { if (!f) return; try { pick(await loadImage(f)); } catch (e) { chooseSource(e.message); } };
      box.querySelector('[data-file]').onchange = e => fromFile(e.target.files[0]);
      box.querySelector('[data-snap]').onchange = e => fromFile(e.target.files[0]);
      // Phones: the native camera via the capture input. PCs: the webcam, live.
      box.querySelector('[data-cam]').onclick = () => touch || !navigator.mediaDevices?.getUserMedia ? box.querySelector('[data-snap]').click() : webcam();
      const drop = box.querySelector('.cp-drop');
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); };
      drop.ondragleave = () => drop.classList.remove('on');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); fromFile(e.dataTransfer.files[0]); };
      bg.onpaste = e => fromFile([...e.clipboardData.files].find(f => f.type.startsWith('image/')));
    }

    async function webcam() {
      box.innerHTML = top('Camera') + `<div class="cp-stage"><video autoplay playsinline muted></video></div>
        <div class="cp-row"><button class="cp-btn" data-back>Back</button><button class="cp-btn pri" data-shot>Take photo</button></div>`;
      wire();
      box.querySelector('[data-back]').onclick = () => chooseSource();
      const v = box.querySelector('video');
      try {
        stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment', width: {ideal: 1920}}});
        v.srcObject = stream;
      } catch (e) {
        return chooseSource(`Could not open the camera (${e.name === 'NotAllowedError' ? 'permission denied' : 'no camera found'}). Choose a photo instead.`);
      }
      box.querySelector('[data-shot]').onclick = () => {
        if (!v.videoWidth) return;
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        stopCam(); pick(c);
      };
    }

    function pick(src) {
      bg.onpaste = null;
      // Work on a copy no bigger than 1400px: plenty for sampling, fast on phones.
      const sc = Math.min(1, 1400 / Math.max(src.width, src.height));
      const img = document.createElement('canvas');
      img.width = Math.round(src.width * sc); img.height = Math.round(src.height * sc);
      const ictx = img.getContext('2d', {willReadFrequently: true});
      ictx.drawImage(src, 0, 0, img.width, img.height);
      const pal = palette(img);

      box.innerHTML = top('Tap the colour you want') + `
        <div class="cp-stage"><canvas></canvas></div>
        <div class="cp-pal"><span>Main colours</span>${pal.map((p, i) => `<i data-p="${i}" style="background:${hex(p)}" title="${hex(p)}"></i>`).join('')}</div>
        <div class="cp-res">
          <div class="cp-dot" data-raw></div><div><small>In the photo</small><code data-rawt></code></div>
          <div style="display:flex;align-items:center;gap:12px"><div class="cp-dot" data-out></div><div><small>On the watch</small><code data-outt></code></div></div>
          <div style="grid-column:1/-1"><small>Watch boost: brighter and richer, so it reads like the real thing on the watch screen</small>
            <input type="range" min="0" max="100" value="${opts.boost ?? 40}" data-boost></div></div>
        <div class="cp-row"><button class="cp-btn" data-again>Another photo</button><button class="cp-btn pri" data-use>Use this colour</button></div>`;
      wire();
      const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
      cv.width = img.width; cv.height = img.height;
      let raw = pal[0] || [128, 128, 128], at = null;
      const out = () => hex(boost(raw, box.querySelector('[data-boost]').value / 100));
      const show = () => {
        ctx.drawImage(img, 0, 0);
        if (at) {
          const u = Math.max(img.width, img.height) / 100, r = u * 2.2;
          ctx.lineWidth = u * 0.5; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, 7); ctx.stroke();
          ctx.lineWidth = u * 0.25; ctx.strokeStyle = '#fff'; ctx.stroke();
          // Bubble above the finger so the picked colour stays visible on touch screens.
          const by = at.y - u * 9 < u * 5 ? at.y + u * 9 : at.y - u * 9;
          ctx.fillStyle = hex(raw); ctx.beginPath(); ctx.arc(at.x, by, u * 5, 0, 7); ctx.fill();
          ctx.lineWidth = u * 0.6; ctx.strokeStyle = '#fff'; ctx.stroke();
        }
        box.querySelector('[data-raw]').style.background = box.querySelector('[data-rawt]').textContent = hex(raw);
        box.querySelector('[data-out]').style.background = box.querySelector('[data-outt]').textContent = out();
      };
      // Average a small patch, not one pixel: fabric weave, noise and shadows even out.
      const sample = (x, y) => {
        const r = Math.max(2, Math.round(Math.max(img.width, img.height) / 100 * 1.8));
        const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r);
        const w = Math.min(img.width, x + r) - x0, h = Math.min(img.height, y + r) - y0;
        const d = ictx.getImageData(x0, y0, w, h).data, s = [0, 0, 0]; let n = 0;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          if ((x0 + i - x) ** 2 + (y0 + j - y) ** 2 > r * r) continue;
          const k = (j * w + i) * 4; s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; n++;
        }
        return n ? s.map(v => v / n) : raw;
      };
      const point = e => {
        const b = cv.getBoundingClientRect();
        at = {x: Math.round((e.clientX - b.left) / b.width * cv.width), y: Math.round((e.clientY - b.top) / b.height * cv.height)};
        raw = sample(at.x, at.y); show();
      };
      cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); point(e); };
      cv.onpointermove = e => { if (e.buttons) point(e); };
      box.querySelectorAll('[data-p]').forEach(i => i.onclick = () => { raw = pal[+i.dataset.p]; at = null; show(); });
      box.querySelector('[data-boost]').oninput = show;
      box.querySelector('[data-again]').onclick = () => chooseSource();
      box.querySelector('[data-use]').onclick = () => finish(out());
      show();
    }

    chooseSource();
    return result;
  };
})();
