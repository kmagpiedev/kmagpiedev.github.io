/*! gifenc — https://github.com/mattdesl/gifenc
 * MIT License. Copyright (c) 2021 Matt DesLauriers
 * LZW encoder lineage: Kevin Weiner / Thibault Imbert / Johan Nordberg (see lzw section)
 * PNN quantizer: (C) 2004-2019 Mark Tyler and Dmitry Groshev, (c) 2018-2021 Miller Cy Chan
 * Assembled into a single self-hosted module for kmagpie.com (no code changes except
 * module concatenation and removal of internal import/export statements).
 */

/* ── rgb-packing ── */
function uint32_to_rgba(color){var a=(color>>24)&0xff,b=(color>>16)&0xff,g=(color>>8)&0xff,r=color&0xff;return [r,g,b,a];}
function rgba_to_uint32(r,g,b,a){return (a<<24)|(b<<16)|(g<<8)|r;}
function rgb888_to_rgb565(r,g,b){return ((r<<8)&0xf800)|((g<<3)&0x07e0)|(b>>3);}
function rgba8888_to_rgba4444(r,g,b,a){return (r>>4)|(g&0xf0)|((b&0xf0)<<4)|((a&0xf0)<<8);}
function rgb888_to_rgb444(r,g,b){return ((r>>4)<<8)|(g&0xf0)|(b>>4);}
function euclideanDistanceSquared(a,b){var sum=0,n=Math.min(a.length,b.length);for(var i=0;i<n;i++){var d=a[i]-b[i];sum+=d*d;}return sum;}

/* ── constants ── */
const GIF_CONSTANTS = { trailer: 0x3B };

/* ── stream ── */
function createStream(initialCapacity = 256) {
  let cursor = 0;
  let contents = new Uint8Array(initialCapacity);
  return {
    get buffer() { return contents.buffer; },
    reset() { cursor = 0; },
    bytesView() { return contents.subarray(0, cursor); },
    bytes() { return contents.slice(0, cursor); },
    writeByte(byte) { expand(cursor + 1); contents[cursor] = byte; cursor++; },
    writeBytes(data, offset = 0, byteLength = data.length) {
      expand(cursor + byteLength);
      for (let i = 0; i < byteLength; i++) contents[cursor++] = data[i + offset];
    },
    writeBytesView(data, offset = 0, byteLength = data.byteLength) {
      expand(cursor + byteLength);
      contents.set(data.subarray(offset, offset + byteLength), cursor);
      cursor += byteLength;
    },
  };
  function expand(newCapacity) {
    var prevCapacity = contents.length;
    if (prevCapacity >= newCapacity) return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity,
      (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
    const oldContents = contents;
    contents = new Uint8Array(newCapacity);
    if (cursor > 0) contents.set(oldContents.subarray(0, cursor), 0);
  }
}

/* ── lzwEncode ── */
const LZW_EOF = -1, LZW_BITS = 12, LZW_DEFAULT_HSIZE = 5003;
const LZW_MASKS = [0x0000,0x0001,0x0003,0x0007,0x000f,0x001f,0x003f,0x007f,
  0x00ff,0x01ff,0x03ff,0x07ff,0x0fff,0x1fff,0x3fff,0x7fff,0xffff];

function lzwEncode(width, height, pixels, colorDepth,
  outStream = createStream(512), accum = new Uint8Array(256),
  htab = new Int32Array(LZW_DEFAULT_HSIZE), codetab = new Int32Array(LZW_DEFAULT_HSIZE)) {
  const hsize = htab.length;
  const initCodeSize = Math.max(2, colorDepth);
  accum.fill(0); codetab.fill(0); htab.fill(-1);
  let cur_accum = 0, cur_bits = 0;
  const init_bits = initCodeSize + 1;
  const g_init_bits = init_bits;
  let clear_flg = false;
  let n_bits = g_init_bits;
  let maxcode = (1 << n_bits) - 1;
  const ClearCode = 1 << (init_bits - 1);
  const EOFCode = ClearCode + 1;
  let free_ent = ClearCode + 2;
  let a_count = 0;
  let ent = pixels[0];
  let hshift = 0;
  for (let fcode = hsize; fcode < 65536; fcode *= 2) ++hshift;
  hshift = 8 - hshift;
  outStream.writeByte(initCodeSize);
  output(ClearCode);
  const length = pixels.length;
  for (let idx = 1; idx < length; idx++) {
    next_block: {
      const c = pixels[idx];
      const fcode = (c << LZW_BITS) + ent;
      let i = (c << hshift) ^ ent;
      if (htab[i] === fcode) { ent = codetab[i]; break next_block; }
      const disp = i === 0 ? 1 : hsize - i;
      while (htab[i] >= 0) {
        i -= disp; if (i < 0) i += hsize;
        if (htab[i] === fcode) { ent = codetab[i]; break next_block; }
      }
      output(ent);
      ent = c;
      if (free_ent < 1 << LZW_BITS) {
        codetab[i] = free_ent++; htab[i] = fcode;
      } else {
        htab.fill(-1); free_ent = ClearCode + 2; clear_flg = true; output(ClearCode);
      }
    }
  }
  output(ent); output(EOFCode);
  outStream.writeByte(0);
  return outStream.bytesView();

  function output(code) {
    cur_accum &= LZW_MASKS[cur_bits];
    if (cur_bits > 0) cur_accum |= code << cur_bits; else cur_accum = code;
    cur_bits += n_bits;
    while (cur_bits >= 8) {
      accum[a_count++] = cur_accum & 0xff;
      if (a_count >= 254) { outStream.writeByte(a_count); outStream.writeBytesView(accum, 0, a_count); a_count = 0; }
      cur_accum >>= 8; cur_bits -= 8;
    }
    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) { n_bits = g_init_bits; maxcode = (1 << n_bits) - 1; clear_flg = false; }
      else { ++n_bits; maxcode = n_bits === LZW_BITS ? (1 << n_bits) : (1 << n_bits) - 1; }
    }
    if (code == EOFCode) {
      while (cur_bits > 0) {
        accum[a_count++] = cur_accum & 0xff;
        if (a_count >= 254) { outStream.writeByte(a_count); outStream.writeBytesView(accum, 0, a_count); a_count = 0; }
        cur_accum >>= 8; cur_bits -= 8;
      }
      if (a_count > 0) { outStream.writeByte(a_count); outStream.writeBytesView(accum, 0, a_count); a_count = 0; }
    }
  }
}

/* ── palettize ── */
function roundStep(byte, step) { return step > 1 ? Math.round(byte / step) * step : byte; }

function prequantize(rgba, { roundRGB = 5, roundAlpha = 10, oneBitAlpha = null } = {}) {
  const data = new Uint32Array(rgba.buffer);
  for (let i = 0; i < data.length; i++) {
    const color = data[i];
    let a = (color >> 24) & 0xff, b = (color >> 16) & 0xff, g = (color >> 8) & 0xff, r = color & 0xff;
    a = roundStep(a, roundAlpha);
    if (oneBitAlpha) { const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127; a = a <= threshold ? 0x00 : 0xff; }
    r = roundStep(r, roundRGB); g = roundStep(g, roundRGB); b = roundStep(b, roundRGB);
    data[i] = (a << 24) | (b << 16) | (g << 8) | (r << 0);
  }
}

function applyPalette(rgba, palette, format = "rgb565") {
  if (!rgba || !rgba.buffer) throw new Error('quantize() expected RGBA Uint8Array data');
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) throw new Error('quantize() expected RGBA Uint8Array data');
  if (palette.length > 256) throw new Error('applyPalette() only works with 256 colors or less');
  const data = new Uint32Array(rgba.buffer);
  const length = data.length;
  const bincount = format === "rgb444" ? 4096 : 65536;
  const index = new Uint8Array(length);
  const cache = new Array(bincount);
  if (format === "rgba4444") {
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const a = (color >> 24) & 0xff, b = (color >> 16) & 0xff, g = (color >> 8) & 0xff, r = color & 0xff;
      const key = rgba8888_to_rgba4444(r, g, b, a);
      const idx = key in cache ? cache[key] : (cache[key] = nearestColorIndexRGBA(r, g, b, a, palette));
      index[i] = idx;
    }
  } else {
    const rgb888_to_key = format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const b = (color >> 16) & 0xff, g = (color >> 8) & 0xff, r = color & 0xff;
      const key = rgb888_to_key(r, g, b);
      const idx = key in cache ? cache[key] : (cache[key] = nearestColorIndexRGB(r, g, b, palette));
      index[i] = idx;
    }
  }
  return index;
}

function nearestColorIndexRGBA(r, g, b, a, palette) {
  let k = 0, mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const a2 = px2[3];
    let curdist = sqr_(a2 - a); if (curdist > mindist) continue;
    curdist += sqr_(px2[0] - r); if (curdist > mindist) continue;
    curdist += sqr_(px2[1] - g); if (curdist > mindist) continue;
    curdist += sqr_(px2[2] - b); if (curdist > mindist) continue;
    mindist = curdist; k = i;
  }
  return k;
}
function nearestColorIndexRGB(r, g, b, palette) {
  let k = 0, mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    let curdist = sqr_(px2[0] - r); if (curdist > mindist) continue;
    curdist += sqr_(px2[1] - g); if (curdist > mindist) continue;
    curdist += sqr_(px2[2] - b); if (curdist > mindist) continue;
    mindist = curdist; k = i;
  }
  return k;
}
function sqr_(a) { return a * a; }

function nearestColorIndex(colors, pixel, distanceFn = euclideanDistanceSquared) {
  let minDist = Infinity, minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const dist = distanceFn(pixel, colors[j]);
    if (dist < minDist) { minDist = dist; minDistIndex = j; }
  }
  return minDistIndex;
}
function nearestColorIndexWithDistance(colors, pixel, distanceFn = euclideanDistanceSquared) {
  let minDist = Infinity, minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const dist = distanceFn(pixel, colors[j]);
    if (dist < minDist) { minDist = dist; minDistIndex = j; }
  }
  return [minDistIndex, minDist];
}
function nearestColor(colors, pixel, distanceFn = euclideanDistanceSquared) {
  return colors[nearestColorIndex(colors, pixel, distanceFn)];
}
function snapColorsToPalette(palette, knownColors, threshold = 5) {
  if (!palette.length || !knownColors.length) return;
  const paletteRGB = palette.map((p) => p.slice(0, 3));
  const thresholdSq = threshold * threshold;
  const dim = palette[0].length;
  for (let i = 0; i < knownColors.length; i++) {
    let color = knownColors[i];
    if (color.length < dim) color = [color[0], color[1], color[2], 0xff];
    else if (color.length > dim) color = color.slice(0, 3);
    else color = color.slice();
    const r = nearestColorIndexWithDistance(paletteRGB, color.slice(0, 3), euclideanDistanceSquared);
    const idx = r[0], distanceSq = r[1];
    if (distanceSq > 0 && distanceSq <= thresholdSq) palette[idx] = color;
  }
}

/* ── pnnquant2 (quantize) ── */
function q_clamp(value, min, max) { return value < min ? min : value > max ? max : value; }
function q_sqr(value) { return value * value; }

function find_nn(bins, idx, hasAlpha) {
  var nn = 0, err = 1e100;
  const bin1 = bins[idx];
  const n1 = bin1.cnt, wa = bin1.ac, wr = bin1.rc, wg = bin1.gc, wb = bin1.bc;
  for (var i = bin1.fw; i != 0; i = bins[i].fw) {
    const bin = bins[i];
    const n2 = bin.cnt;
    const nerr2 = (n1 * n2) / (n1 + n2);
    if (nerr2 >= err) continue;
    var nerr = 0;
    if (hasAlpha) { nerr += nerr2 * q_sqr(bin.ac - wa); if (nerr >= err) continue; }
    nerr += nerr2 * q_sqr(bin.rc - wr); if (nerr >= err) continue;
    nerr += nerr2 * q_sqr(bin.gc - wg); if (nerr >= err) continue;
    nerr += nerr2 * q_sqr(bin.bc - wb); if (nerr >= err) continue;
    err = nerr; nn = i;
  }
  bin1.err = err; bin1.nn = nn;
}

function create_bin() {
  return { ac:0, rc:0, gc:0, bc:0, cnt:0, nn:0, fw:0, bk:0, tm:0, mtm:0, err:0 };
}

function create_bin_list(data, format) {
  const bincount = format === "rgb444" ? 4096 : 65536;
  const bins = new Array(bincount);
  const size = data.length;
  if (format === "rgba4444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const a = (color >> 24) & 0xff, b = (color >> 16) & 0xff, g = (color >> 8) & 0xff, r = color & 0xff;
      const index = rgba8888_to_rgba4444(r, g, b, a);
      let bin = index in bins ? bins[index] : (bins[index] = create_bin());
      bin.rc += r; bin.gc += g; bin.bc += b; bin.ac += a; bin.cnt++;
    }
  } else if (format === "rgb444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = (color >> 16) & 0xff, g = (color >> 8) & 0xff, r = color & 0xff;
      const index = rgb888_to_rgb444(r, g, b);
      let bin = index in bins ? bins[index] : (bins[index] = create_bin());
      bin.rc += r; bin.gc += g; bin.bc += b; bin.cnt++;
    }
  } else {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = (color >> 16) & 0xff, g = (color >> 8) & 0xff, r = color & 0xff;
      const index = rgb888_to_rgb565(r, g, b);
      let bin = index in bins ? bins[index] : (bins[index] = create_bin());
      bin.rc += r; bin.gc += g; bin.bc += b; bin.cnt++;
    }
  }
  return bins;
}

function quantize(rgba, maxColors, opts = {}) {
  const { format = "rgb565", clearAlpha = true, clearAlphaColor = 0x00,
    clearAlphaThreshold = 0, oneBitAlpha = false } = opts;
  if (!rgba || !rgba.buffer) throw new Error('quantize() expected RGBA Uint8Array data');
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) throw new Error('quantize() expected RGBA Uint8Array data');
  const data = new Uint32Array(rgba.buffer);
  let useSqrt = opts.useSqrt !== false;
  const hasAlpha = format === "rgba4444";
  const bins = create_bin_list(data, format);
  const bincount = bins.length;
  const bincountMinusOne = bincount - 1;
  const heap = new Uint32Array(bincount + 1);
  var maxbins = 0;
  for (var i = 0; i < bincount; ++i) {
    const bin = bins[i];
    if (bin != null) {
      var d = 1.0 / bin.cnt;
      if (hasAlpha) bin.ac *= d;
      bin.rc *= d; bin.gc *= d; bin.bc *= d;
      bins[maxbins++] = bin;
    }
  }
  if (q_sqr(maxColors) / maxbins < 0.022) useSqrt = false;
  var i = 0;
  for (; i < maxbins - 1; ++i) {
    bins[i].fw = i + 1; bins[i + 1].bk = i;
    if (useSqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);
  }
  if (useSqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);
  var h, l, l2;
  for (i = 0; i < maxbins; ++i) {
    find_nn(bins, i, hasAlpha);
    var err = bins[i].err;
    for (l = ++heap[0]; l > 1; l = l2) {
      l2 = l >> 1;
      if (bins[(h = heap[l2])].err <= err) break;
      heap[l] = h;
    }
    heap[l] = i;
  }
  var extbins = maxbins - maxColors;
  for (i = 0; i < extbins; ) {
    var tb;
    for (;;) {
      var b1 = heap[1];
      tb = bins[b1];
      if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm) break;
      if (tb.mtm == bincountMinusOne) b1 = heap[1] = heap[heap[0]--];
      else { find_nn(bins, b1, hasAlpha); tb.tm = i; }
      var err = bins[b1].err;
      for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
        if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err) l2++;
        if (err <= bins[(h = heap[l2])].err) break;
        heap[l] = h;
      }
      heap[l] = b1;
    }
    var nb = bins[tb.nn];
    var n1 = tb.cnt, n2 = nb.cnt;
    var d = 1.0 / (n1 + n2);
    if (hasAlpha) tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
    tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
    tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
    tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
    tb.cnt += nb.cnt;
    tb.mtm = ++i;
    bins[nb.bk].fw = nb.fw;
    bins[nb.fw].bk = nb.bk;
    nb.mtm = bincountMinusOne;
  }
  let palette = [];
  var k = 0;
  for (i = 0; ; ++k) {
    let r = q_clamp(Math.round(bins[i].rc), 0, 0xff);
    let g = q_clamp(Math.round(bins[i].gc), 0, 0xff);
    let b = q_clamp(Math.round(bins[i].bc), 0, 0xff);
    let a = 0xff;
    if (hasAlpha) {
      a = q_clamp(Math.round(bins[i].ac), 0, 0xff);
      if (oneBitAlpha) { const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127; a = a <= threshold ? 0x00 : 0xff; }
      if (clearAlpha && a <= clearAlphaThreshold) { r = g = b = clearAlphaColor; a = 0x00; }
    }
    const color = hasAlpha ? [r, g, b, a] : [r, g, b];
    if (!existsInPalette(palette, color)) palette.push(color);
    if ((i = bins[i].fw) == 0) break;
  }
  return palette;
}

function existsInPalette(palette, color) {
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    let matchesRGB = p[0] === color[0] && p[1] === color[1] && p[2] === color[2];
    let matchesAlpha = p.length >= 4 && color.length >= 4 ? p[3] === color[3] : true;
    if (matchesRGB && matchesAlpha) return true;
  }
  return false;
}

/* ── GIFEncoder (index) ── */
function GIFEncoder(opt = {}) {
  const { initialCapacity = 4096, auto = true } = opt;
  const stream = createStream(initialCapacity);
  const HSIZE = 5003;
  const accum = new Uint8Array(256);
  const htab = new Int32Array(HSIZE);
  const codetab = new Int32Array(HSIZE);
  let hasInit = false;

  return {
    reset() { stream.reset(); hasInit = false; },
    finish() { stream.writeByte(GIF_CONSTANTS.trailer); },
    bytes() { return stream.bytes(); },
    bytesView() { return stream.bytesView(); },
    get buffer() { return stream.buffer; },
    get stream() { return stream; },
    writeHeader,
    writeFrame(index, width, height, opts = {}) {
      const { transparent = false, transparentIndex = 0x00, delay = 0,
        palette = null, repeat = 0, colorDepth = 8, dispose = -1 } = opts;
      let first = false;
      if (auto) {
        if (!hasInit) { first = true; writeHeader(); hasInit = true; }
      } else {
        first = Boolean(opts.first);
      }
      width = Math.max(0, Math.floor(width));
      height = Math.max(0, Math.floor(height));
      if (first) {
        if (!palette) throw new Error("First frame must include a { palette } option");
        encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth);
        encodeColorTable(stream, palette);
        if (repeat >= 0) encodeNetscapeExt(stream, repeat);
      }
      const delayTime = Math.round(delay / 10);
      encodeGraphicControlExt(stream, dispose, delayTime, transparent, transparentIndex);
      const useLocalColorTable = Boolean(palette) && !first;
      encodeImageDescriptor(stream, width, height, useLocalColorTable ? palette : null);
      if (useLocalColorTable) encodeColorTable(stream, palette);
      encodePixels(stream, index, width, height, colorDepth, accum, htab, codetab);
    },
  };

  function writeHeader() { writeUTFBytes(stream, "GIF89a"); }
}

function encodeGraphicControlExt(stream, dispose, delay, transparent, transparentIndex) {
  stream.writeByte(0x21); stream.writeByte(0xf9); stream.writeByte(4);
  if (transparentIndex < 0) { transparentIndex = 0x00; transparent = false; }
  var transp, disp;
  if (!transparent) { transp = 0; disp = 0; } else { transp = 1; disp = 2; }
  if (dispose >= 0) disp = dispose & 7;
  disp <<= 2;
  const userInput = 0;
  stream.writeByte(0 | disp | userInput | transp);
  writeUInt16(stream, delay);
  stream.writeByte(transparentIndex || 0x00);
  stream.writeByte(0);
}

function encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth = 8) {
  const globalColorTableFlag = 1;
  const sortFlag = 0;
  const globalColorTableSize = colorTableSize(palette.length) - 1;
  const fields = (globalColorTableFlag << 7) | ((colorDepth - 1) << 4) | (sortFlag << 3) | globalColorTableSize;
  const backgroundColorIndex = 0;
  const pixelAspectRatio = 0;
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
}

function encodeNetscapeExt(stream, repeat) {
  stream.writeByte(0x21); stream.writeByte(0xff); stream.writeByte(11);
  writeUTFBytes(stream, "NETSCAPE2.0");
  stream.writeByte(3); stream.writeByte(1);
  writeUInt16(stream, repeat);
  stream.writeByte(0);
}

function encodeColorTable(stream, palette) {
  const colorTableLength = 1 << colorTableSize(palette.length);
  for (let i = 0; i < colorTableLength; i++) {
    let color = [0, 0, 0];
    if (i < palette.length) color = palette[i];
    stream.writeByte(color[0]); stream.writeByte(color[1]); stream.writeByte(color[2]);
  }
}

function encodeImageDescriptor(stream, width, height, localPalette) {
  stream.writeByte(0x2c);
  writeUInt16(stream, 0); writeUInt16(stream, 0);
  writeUInt16(stream, width); writeUInt16(stream, height);
  if (localPalette) {
    const interlace = 0, sorted = 0;
    const palSize = colorTableSize(localPalette.length) - 1;
    stream.writeByte(0x80 | interlace | sorted | 0 | palSize);
  } else {
    stream.writeByte(0);
  }
}

function encodePixels(stream, index, width, height, colorDepth = 8, accum, htab, codetab) {
  lzwEncode(width, height, index, colorDepth, stream, accum, htab, codetab);
}

function writeUInt16(stream, short) {
  stream.writeByte(short & 0xff); stream.writeByte((short >> 8) & 0xff);
}
function writeUTFBytes(stream, text) {
  for (var i = 0; i < text.length; i++) stream.writeByte(text.charCodeAt(i));
}
function colorTableSize(length) {
  return Math.max(Math.ceil(Math.log2(length)), 1);
}

export { GIFEncoder, quantize, prequantize, applyPalette,
  nearestColorIndex, nearestColor, nearestColorIndexWithDistance, snapColorsToPalette,
  uint32_to_rgba, rgba_to_uint32 };
export default GIFEncoder;
