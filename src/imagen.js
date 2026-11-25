// Local image processing (no network).

export const blobToDataURL = b => new Promise((res, rej) => {
  const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b);
});

async function draw(blob, max) {
  const img = await createImageBitmap(blob);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
  const g = c.getContext('2d', { willReadFrequently: true });
  return { c, g, img };
}

/** Downscaled JPEG on white (cheap to upload, small to store). */
export async function toJpeg(blob, max = 1280) {
  const { c, g, img } = await draw(blob, max);
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
}

/**
 * Chroma key: removes a flat background (the AI paints it pure green, or magenta for
 * green items) → transparent PNG trimmed to the item. Works for white and black clothes.
 * Background colour = median of the border; every pixel close to it is removed.
 * Despill: pixels that lean towards the background colour (edges, painted shadows) lose
 * that tint and become partly transparent, so a shadow stays a soft neutral shadow.
 * ponytail: a garment (or a logo) the same colour as the chroma background gets eaten; the
 * prompt switches to magenta for green items, which covers the common case.
 */
export async function quitarFondo(blob, max = 900, tol = 60) {
  const { c, g, img } = await draw(blob, max);
  const w = c.width, h = c.height;
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h), p = data.data;

  const borderIdx = [];
  for (let x = 0; x < w; x++) borderIdx.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) borderIdx.push(y * w, y * w + w - 1);
  const median = ch => { const v = borderIdx.map(i => p[i * 4 + ch]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bgc = [median(0), median(1), median(2)];
  const dist = i => Math.hypot(p[i * 4] - bgc[0], p[i * 4 + 1] - bgc[1], p[i * 4 + 2] - bgc[2]);
  // Border not flat enough → there is no plain background to remove.
  if (borderIdx.filter(i => dist(i) < tol).length < borderIdx.length * 0.8) return null;

  // Keyed everywhere, not only from the borders: holes (a necklace loop, a bag handle) go too.
  const bg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bg[i] = dist(i) < tol;

  // Spill = how much the background's own colour cast is present in a pixel.
  const green = bgc[1] > Math.max(bgc[0], bgc[2]);
  const spill = (r, g, b) => green ? g - Math.max(r, b) : Math.min(r, b) - g;
  const bgSpill = Math.max(1, spill(...bgc));

  let x0 = w, y0 = h, x1 = -1, y1 = -1, kept = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (bg[i]) { p[o + 3] = 0; continue; }
    const s = spill(p[o], p[o + 1], p[o + 2]);
    if (s > 0) {
      if (green) p[o + 1] -= s; else { p[o] -= s; p[o + 2] -= s; }
      // Light tint (e.g. reflection on a white shirt) stays opaque; strong cast fades out.
      p[o + 3] = Math.round(255 * Math.max(0, Math.min(1, 1 - (s / bgSpill - 0.2) / 0.6)));
    }
    if (p[o + 3] < 40) continue;
    const x = i % w, y = (i - x) / w;
    kept++;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (kept < w * h * 0.005) return null; // almost nothing left: cut-out failed

  g.putImageData(data, 0, 0);
  const pad = 6;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = Object.assign(document.createElement('canvas'), { width: x1 - x0 + 1, height: y1 - y0 + 1 });
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return new Promise(r => out.toBlob(r, 'image/png'));
}
