// Web Bluetooth driver for the CUBOT C29 (MoYoung V2 firmware, Jieli chip).
// Port of tools/c29_upload.py. See PROGRESS.md for the protocol.
//
//  -> FEEA 2009 74 <size u32 BE>        announce file
//  <- FEEA 2008 BA 01 <len u16 LE>      packet length (C29: 10240)
//  <- FEEA 2007 74 <index u16 BE>       request packet N -> send bytes on fee6
//  <- FEEA 2009 74 <crc u32 BE>         done; reply 00000000 (ok) / FFFFFFFF
//  -> FEEA 200A B4 11 <store id u32 LE> register face (without this the watch drops it)
//  -> FEEA 2006 19 <index>              show face (8 = the custom slot)

const SERVICE = 0xfeea, SEND = 0xfee2, NOTIFY = 0xfee3, SENDFILE = 0xfee6;
const SLOT = 0x74;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function cmd(op, payload = []) {
  const n = 5 + payload.length;
  return new Uint8Array([0xFE, 0xEA, 0x20 + (n >> 8), n & 0xFF, op, ...payload]);
}

export function crc16(data) {
  let i = 0xFEEA;
  for (const b of data) {
    let x = (((i & 0xFF) << 8) | ((i & 0xFF00) >> 8)) ^ b;
    x ^= (x & 0xFF) >> 4;
    x ^= (x & 0xFF) << 12;
    i = (x ^ ((x & 0xFF) << 5)) & 0xFFFF;
  }
  return i;
}

export const supported = () => !!(navigator.bluetooth && window.isSecureContext);

export class C29 {
  constructor() {
    this.device = null; this.chars = {}; this.queue = []; this.waiters = [];
    this.writeSize = 244; this.onDisconnect = null; this.log = () => {};
  }

  get connected() { return !!this.device?.gatt?.connected; }

  async connect() {
    if (!this.device) {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{namePrefix: 'C29'}, {services: [SERVICE]}],
        optionalServices: [SERVICE],
      });
      this.device.addEventListener('gattserverdisconnected', () => this.onDisconnect?.());
    }
    let server;
    for (let attempt = 1; ; attempt++) {
      try { server = await this.device.gatt.connect(); break; }
      catch (e) { if (attempt >= 3) throw e; await sleep(1000); }
    }
    const svc = await server.getPrimaryService(SERVICE);
    for (const [k, u] of [['send', SEND], ['notify', NOTIFY], ['file', SENDFILE]]) this.chars[k] = await svc.getCharacteristic(u);
    await this.chars.notify.startNotifications();
    this.chars.notify.addEventListener('characteristicvaluechanged', e => {
      const p = new Uint8Array(e.target.value.buffer.slice(0));
      const w = this.waiters.shift();
      if (w) w(p); else this.queue.push(p);
    });
    this.log(`Connected to ${this.device.name}`);
  }

  disconnect() { if (this.connected) this.device.gatt.disconnect(); }

  next(timeout = 20000) {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.waiters = this.waiters.filter(w => w !== f); rej(new Error('watch stopped responding')); }, timeout);
      const f = p => { clearTimeout(t); res(p); };
      this.waiters.push(f);
    });
  }

  async send(op, payload) {
    await this.chars.send.writeValueWithoutResponse(cmd(op, payload));
  }

  async writeFile(bytes) {
    for (let i = 0; i < bytes.length;) {
      const chunk = bytes.subarray(i, i + this.writeSize);
      try {
        await this.chars.file.writeValueWithoutResponse(chunk);
        i += chunk.length;
      } catch (e) {
        // Phones that didn't negotiate a large MTU reject 244-byte writes: fall back once.
        if (this.writeSize > 20) { this.log('Large writes refused; using small packets (slower)'); this.writeSize = 20; continue; }
        throw e;
      }
      if (this.writeSize > 20) await sleep(8);
    }
  }

  async currentFace() {
    this.queue = [];
    await this.send(0x29);
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      const p = await this.next(end - Date.now()).catch(() => null);
      if (p && p.length >= 6 && p[4] === 0x29) return p[5];
    }
    return null;
  }

  async showFace(index) {
    await this.send(0x19, [index]);
    await sleep(1000);
    return this.currentFace();
  }

  // ---- customisable built-in face (face 2 on the C29) ----
  // 39 -> layout; 6E transfer = raw RGB565 (big-endian) background + thumbnail; 38 = set layout.
  async queryLayout() {
    this.queue = [];
    await this.send(0x39);
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      const p = await this.next(end - Date.now()).catch(() => null);
      if (p && p.length > 9 && p[4] === 0x39) {
        const b = p.subarray(5);
        const info = {pos: b[0], top: b[1], bottom: b[2], colour: b[3] << 8 | b[4],
          md5: new TextDecoder().decode(b.subarray(5, 37)).replace(/\0+$/, '')};
        if (b.length >= 46) Object.assign(info, {w: b[37] << 8 | b[38], thumbW: b[39] << 8 | b[40], compression: b[45]});
        return info;
      }
    }
    return null;
  }

  async setLayout(info, md5) {
    const tag = new TextEncoder().encode(md5.padEnd(32, '\0').slice(0, 32));
    await this.send(0x38, [info.pos, info.top, info.bottom, info.colour >> 8, info.colour & 255, ...tag]);
  }

  /** Send a background file (built by rgb565Background) over 0x6E. Returns true when the CRC matched. */
  async uploadBackground(data, onProgress = () => {}) {
    const expected = crc16(data), size = data.length;
    this.queue = [];
    await this.send(0x6E, [size >>> 24, (size >> 16) & 255, (size >> 8) & 255, size & 255]);
    let packet = 244;
    for (;;) {
      const p = await this.next();
      if (p[0] !== 0xFE || p[1] !== 0xEA || p.length < 5) continue;
      const op = p[4], body = p.subarray(5);
      if (op === 0xBA && body[0] === 0x01 && body.length >= 3) {
        packet = body[1] | body[2] << 8;
      } else if (op === 0x6E && body.length >= 4 && body[0] === 0xFF && body[1] === 0xFF) {
        const ok = (body[2] << 8 | body[3]) === expected;
        await this.send(0x6E, ok ? [0, 0, 0, 0] : [255, 255, 255, 255]);
        this.log(ok ? 'Background received' : 'Background CRC mismatch');
        return ok;
      } else if (op === 0x6E && body.length >= 2) {
        const n = body[0] << 8 | body[1];
        await this.writeFile(data.subarray(n * packet, (n + 1) * packet));
        onProgress(Math.min(100, Math.round((n + 1) * packet * 100 / size)));
      }
    }
  }

  /** Install a face into slot 8. onProgress(percent). Returns true when the watch shows it. */
  async upload(data, faceId, onProgress = () => {}) {
    if (!faceId) throw new Error('This face has no store face ID; the watch would reject it.');
    const expected = crc16(data);
    this.queue = [];
    this.log(`Sending ${(data.length / 1024).toFixed(0)} KB, CRC ${expected.toString(16)}`);
    const size = data.length;
    await this.send(SLOT, [size >>> 24, (size >> 16) & 255, (size >> 8) & 255, size & 255]);
    let packet = 244, total = Math.ceil(size / packet);
    for (;;) {
      const p = await this.next();
      if (p[0] !== 0xFE || p[1] !== 0xEA || p.length < 5) continue;
      const op = p[4], body = p.subarray(5);
      if (op === 0xBA && body[0] === 0x01 && body.length >= 3) {
        packet = body[1] | body[2] << 8; total = Math.ceil(size / packet);
        this.log(`Watch packet length ${packet} (${total} packets)`);
      } else if (op === SLOT && p[3] === 0x07) {
        const n = body[0] << 8 | body[1];
        await this.writeFile(data.subarray(n * packet, (n + 1) * packet));
        onProgress(Math.min(100, Math.round((n + 1) * 100 / total)));
      } else if (op === SLOT && p[3] === 0x09) {
        const got = ((body[0] << 24 | body[1] << 16 | body[2] << 8 | body[3]) >>> 0) & 0xFFFF;
        const ok = got === expected;
        await this.send(SLOT, ok ? [0, 0, 0, 0] : [255, 255, 255, 255]);
        this.log(ok ? 'Transfer OK' : `CRC mismatch (${got.toString(16)}), rejected`);
        if (!ok) return false;
        await sleep(2000);
        await this.send(0xB4, [0x11, faceId & 255, (faceId >> 8) & 255, (faceId >> 16) & 255, (faceId >>> 24) & 255]);
        this.log(`Registered face ID ${faceId}`);
        await sleep(1000);
        const now = await this.showFace(8);
        this.log(now === 8 ? 'Watch shows the new face' : `Watch reports face ${now}`);
        return now === 8;
      }
    }
  }
}

/** Background file for the customisable face: canvas (w×w) + thumbnail, raw RGB565 big-endian. */
export function rgb565Background(canvas, size = 360, thumb = 200) {
  const parts = [size, thumb].map(n => {
    const c = document.createElement('canvas'); c.width = c.height = n;
    c.getContext('2d').drawImage(canvas, 0, 0, n, n);
    const px = c.getContext('2d').getImageData(0, 0, n, n).data, out = new Uint8Array(n * n * 2);
    for (let i = 0, o = 0; i < px.length; i += 4, o += 2) {
      const v = (px[i] >> 3) << 11 | (px[i + 1] >> 2) << 5 | (px[i + 2] >> 3);
      out[o] = v >> 8; out[o + 1] = v & 255;
    }
    return out;
  });
  const all = new Uint8Array(parts[0].length + parts[1].length);
  all.set(parts[0]); all.set(parts[1], parts[0].length);
  return all;
}
