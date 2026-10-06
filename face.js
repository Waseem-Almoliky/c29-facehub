// Reader / recolourer for CUBOT C29 (Da Fit, Jieli "tpls 72" / FaceN) watch face files.
// JavaScript port of facetool/jlface.py and recolour_face.py.
//
// Image = h × u32 row table (offset from image start in low 21 bits, byte length << 21)
// followed by RLE rows of 3-byte pixels [alpha, RGB565 big-endian]:
//   ctrl & 0x80 -> repeat the next pixel (ctrl & 0x7F) times, else ctrl literal pixels follow.

const u32 = (d, o) => (d[o] | d[o + 1] << 8 | d[o + 2] << 16 | d[o + 3] << 24) >>> 0;
const u16 = (d, o) => d[o] | d[o + 1] << 8;

function* rows(d, off, h) {
  for (let r = 0; r < h; r++) {
    const v = u32(d, off + 4 * r);
    yield [r, off + (v & 0x1FFFFF), v >>> 21];
  }
}

// Yields [pixelByteOffset, count] for each stored pixel in a row.
function* iterRow(d, start, length) {
  let p = start;
  const end = start + length;
  while (p < end) {
    const c = d[p++];
    if (c & 0x80) { yield [p, c & 0x7F]; p += 3; }
    else for (let i = 0; i < c; i++) { yield [p, 1]; p += 3; }
  }
}

function valid(d, off, w, h) {
  if (off + 4 * h > d.length || (u32(d, off) & 0x1FFFFF) !== 4 * h) return false;
  for (const [, s, n] of rows(d, off, h)) {
    if (s + n > d.length) return false;
    let total = 0;
    for (const [p, k] of iterRow(d, s, n)) { if (p + 3 > d.length) return false; total += k; }
    if (total !== w) return false;
  }
  return true;
}

/** All images referenced from the header: [{entry, off, w, h}]. */
export function findImages(d, limit = 0x400) {
  const out = [], seen = new Set();
  let i = 0;
  while (i < limit && i + 8 <= d.length) {
    const off = u32(d, i), w = u16(d, i + 4), h = u16(d, i + 6);
    if (off > 0x100 && off < d.length && w > 1 && w <= 400 && h > 1 && h <= 400 && !seen.has(off) && valid(d, off, w, h)) {
      out.push({entry: i, off, w, h}); seen.add(off); i += 8;
    } else i++;
  }
  return out;
}

const rgb565 = (hi, lo) => {
  const v = hi << 8 | lo;
  return [((v >> 11) & 31) * 255 / 31 | 0, ((v >> 5) & 63) * 255 / 63 | 0, (v & 31) * 255 / 31 | 0];
};
const toRgb565 = (r, g, b) => {
  const v = (Math.floor((r * 31 + 127) / 255) << 11) | (Math.floor((g * 63 + 127) / 255) << 5) | Math.floor((b * 31 + 127) / 255);
  return [v >> 8, v & 0xFF];
};

/** Decode one image to ImageData-compatible RGBA bytes. */
export function decode(d, off, w, h) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (const [r, s, n] of rows(d, off, h)) {
    let x = 0;
    for (const [p, k] of iterRow(d, s, n)) {
      const a = d[p], [R, G, B] = rgb565(d[p + 1], d[p + 2]);
      for (let i = 0; i < k && x < w; i++, x++) {
        const o = (r * w + x) * 4;
        px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = a;
      }
    }
  }
  return px;
}

/** Basic sanity check that this is a tpls 72 face. */
export function isFace(d) {
  return d.length > 64 && d[0] === 0x23 && d[1] === 0x00;
}

/** The 200×200 preview (header offset 4), falling back to a scaled background. */
export function previewCanvas(d) {
  let off = u32(d, 4), w = u16(d, 8), h = u16(d, 10);
  if (!valid(d, off, w, h)) {
    const bg = findImages(d).find(i => i.w === 360 && i.h === 360);
    if (!bg) throw new Error('no preview image found');
    ({off, w, h} = bg);
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(decode(d, off, w, h), w, h), 0, 0);
  return c;
}

export function previewBlob(d) {
  return new Promise(res => previewCanvas(d).toBlob(res, 'image/png'));
}

// ---- recolouring (same maths as recolour_face.py) ----
function rgbToHsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx;
  if (mx === mn) return [0, 0, v];
  const s = (mx - mn) / mx;
  const rc = (mx - r) / (mx - mn), gc = (mx - g) / (mx - mn), bc = (mx - b) / (mx - mn);
  let h = r === mx ? bc - gc : g === mx ? 2 + rc - bc : 4 + gc - rc;
  h = ((h / 6) % 1 + 1) % 1;
  return [h, s, v];
}
function hsvToRgb(h, s, v) {
  if (s === 0) return [v, v, v];
  const i = Math.floor(h * 6) % 6, f = h * 6 - Math.floor(h * 6);
  const p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i];
}
export const hexRgb = s => { s = s.replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };

function makeMapper(ref, target, hueWindow = 40) {
  const [rh, rs, rv] = rgbToHsv(...ref.map(c => c / 255));
  const [th, ts, tv] = rgbToHsv(...target.map(c => c / 255));
  return ([r, g, b]) => {
    const [h, s, v] = rgbToHsv(r / 255, g / 255, b / 255);
    const dh = Math.min(Math.abs(h - rh), 1 - Math.abs(h - rh)) * 360;
    if (s < 0.15 || dh > hueWindow) return [r, g, b];
    const ns = Math.min(1, s * ts / rs), nv = Math.min(1, v * tv / rv);
    return hsvToRgb(th, ns, nv).map(c => Math.round(c * 255));
  };
}

/** Most common saturated colour in the preview: the face's accent colour. */
export function accentColour(d) {
  const c = previewCanvas(d);
  return accentOf(c.getContext('2d').getImageData(0, 0, c.width, c.height));
}

/** Accent colour of any picture (ImageData), e.g. a preview PNG. */
export function accentOf(img) {
  const px = img.data;
  const count = new Map();
  for (let i = 0; i < px.length; i += 4) {
    const [, s, v] = rgbToHsv(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
    if (s > 0.45 && v > 0.35) {
      const k = [px[i], px[i + 1], px[i + 2]].map(x => (x >> 4) * 16 + 8).join(',');
      count.set(k, (count.get(k) || 0) + 1);
    }
  }
  let best = '230,105,66', n = 0;
  for (const [k, v] of count) if (v > n) { best = k; n = v; }
  return best.split(',').map(Number);
}

/** Return a recoloured copy of the face: pixels near the accent hue move to `target` (#RRGGBB). */
export function recolour(d, target, ref = accentColour(d)) {
  const out = new Uint8Array(d);
  const fn = makeMapper(ref, hexRgb(target));
  for (const {off, h} of findImages(out)) {
    for (const [, s, n] of rows(out, off, h)) {
      for (const [p] of iterRow(out, s, n)) {
        const [r, g, b] = fn(rgb565(out[p + 1], out[p + 2]));
        [out[p + 1], out[p + 2]] = toRgb565(r, g, b);
      }
    }
  }
  return out;
}

/** Live preview: recolour a picture (ImageData) in place with the same maths as recolour(). */
export function recolourPixels(img, target, ref) {
  const fn = makeMapper(ref, hexRgb(target)), px = img.data;
  for (let i = 0; i < px.length; i += 4) [px[i], px[i + 1], px[i + 2]] = fn([px[i], px[i + 1], px[i + 2]]);
  return img;
}

/** Hands back a function colour -> data URL of the recoloured picture (fast: one small image). */
export function previewer(source) {
  const c = document.createElement('canvas');
  c.width = source.naturalWidth || source.width; c.height = source.naturalHeight || source.height;
  const ctx = c.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(source, 0, 0);
  const orig = ctx.getImageData(0, 0, c.width, c.height), ref = accentOf(orig);
  return colour => {
    ctx.putImageData(recolourPixels(new ImageData(new Uint8ClampedArray(orig.data), c.width, c.height), colour, ref), 0, 0);
    return c.toDataURL();
  };
}
