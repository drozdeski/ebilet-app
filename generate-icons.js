import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, renderPixel) {
  // RGBA buffer with filter byte at start of each scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        const mask = -(byte & 1);
        byte = (byte >>> 1) ^ (0xedb88320 & mask);
      }
      crc = (crc >>> 8) ^ byte;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);

    return Buffer.concat([lenBuf, combined, crcBuf]);
  }

  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

// Draw railway train icon
function renderTrainIcon(x, y, w, h, isMaskable = false) {
  // Normalize to 0..1
  const nx = x / w;
  const ny = y / h;

  // Background gradient: Navy (#1e3a8a) to Sky Blue (#0284c7)
  const gradT = (nx + ny) / 2;
  const bgR = Math.round(30 * (1 - gradT) + 2 * gradT);
  const bgG = Math.round(58 * (1 - gradT) + 132 * gradT);
  const bgB = Math.round(138 * (1 - gradT) + 199 * gradT);

  // Rounded squircle boundary (radius 22% if not maskable)
  if (!isMaskable) {
    const r = 0.22;
    const dx = Math.max(0, Math.max(r - nx, nx - (1 - r)));
    const dy = Math.max(0, Math.max(r - ny, ny - (1 - r)));
    if (dx * dx + dy * dy > r * r) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Scale down inside safe zone
  const cx = 0.5;
  const cy = 0.5;
  const scale = isMaskable ? 0.7 : 0.85;
  const tx = (nx - cx) / scale + 0.5;
  const ty = (ny - cy) / scale + 0.5;

  // Train Locomotive Shape:
  // x: 0.28 to 0.72, y: 0.22 to 0.78
  const inTrainBody =
    tx >= 0.26 && tx <= 0.74 &&
    ty >= 0.25 && ty <= 0.75 &&
    // Sloped aerodynamic top
    !(ty < 0.38 && (Math.abs(tx - 0.5) > 0.22 * (ty - 0.25) / 0.13 + 0.12));

  // Windshield
  const inWindshield =
    tx >= 0.32 && tx <= 0.68 &&
    ty >= 0.30 && ty <= 0.44;

  // High speed stripe
  const inStripe =
    tx >= 0.26 && tx <= 0.74 &&
    ty >= 0.53 && ty <= 0.57;

  // Headlights
  const leftLightDist = Math.hypot(tx - 0.36, ty - 0.66);
  const rightLightDist = Math.hypot(tx - 0.64, ty - 0.66);
  const inLight = leftLightDist < 0.035 || rightLightDist < 0.035;

  // Center crest / ticket symbol
  const inCrest =
    tx >= 0.46 && tx <= 0.54 &&
    ty >= 0.63 && ty <= 0.70;

  // Under-track
  const inTrack1 = tx >= 0.30 && tx <= 0.70 && ty >= 0.81 && ty <= 0.83;
  const inTrack2 = tx >= 0.36 && tx <= 0.64 && ty >= 0.85 && ty <= 0.865;

  if (inLight) {
    if (leftLightDist < 0.018 || rightLightDist < 0.018) {
      return [255, 255, 255, 255]; // bright center
    }
    return [2, 132, 199, 255]; // blue ring
  }

  if (inCrest) {
    return [245, 158, 11, 255]; // amber crest
  }

  if (inStripe) {
    return [245, 158, 11, 255]; // amber speed stripe
  }

  if (inWindshield) {
    return [56, 189, 248, 255]; // cyan glass
  }

  if (inTrainBody) {
    return [255, 255, 255, 255]; // white train chassis
  }

  if (inTrack1) {
    return [255, 255, 255, 200];
  }
  if (inTrack2) {
    return [255, 255, 255, 130];
  }

  return [bgR, bgG, bgB, 255];
}

const pubDir = './public';
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

console.log('Generating PWA icons...');
fs.writeFileSync(`${pubDir}/pwa-192x192.png`, createPNG(192, 192, (x, y, w, h) => renderTrainIcon(x, y, w, h, false)));
fs.writeFileSync(`${pubDir}/pwa-512x512.png`, createPNG(512, 512, (x, y, w, h) => renderTrainIcon(x, y, w, h, false)));
fs.writeFileSync(`${pubDir}/apple-touch-icon.png`, createPNG(180, 180, (x, y, w, h) => renderTrainIcon(x, y, w, h, false)));
fs.writeFileSync(`${pubDir}/pwa-maskable-512x512.png`, createPNG(512, 512, (x, y, w, h) => renderTrainIcon(x, y, w, h, true)));
fs.writeFileSync(`${pubDir}/favicon.ico`, createPNG(32, 32, (x, y, w, h) => renderTrainIcon(x, y, w, h, false)));
console.log('All PWA and Apple Touch icons generated successfully!');
