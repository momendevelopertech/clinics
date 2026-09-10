import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
const __dirname = dirname(fileURLToPath(import.meta.url));

function createSolidPNG(width, height) {
  const rawData = Buffer.alloc(width * height * 4);
  for (let i = 0; i < rawData.length; i += 4) {
    rawData[i] = 8;
    rawData[i + 1] = 145;
    rawData[i + 2] = 178;
    rawData[i + 3] = 255;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let cv = n;
      for (let k = 0; k < 8; k++) {
        cv = cv & 1 ? 0xedb88320 ^ (cv >>> 1) : cv >>> 1;
      }
      table[n] = cv;
    }
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  let rawWithFilters = Buffer.alloc(0);
  for (let y = 0; y < height; y++) {
    const filterByte = Buffer.from([0]);
    const row = rawData.slice(y * width * 4, (y + 1) * width * 4);
    rawWithFilters = Buffer.concat([rawWithFilters, filterByte, row]);
  }

  const compressed = zlib.deflateSync(rawWithFilters);
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdrData),
    chunk("IDAT", compressed),
    iend,
  ]);
}

const iconsDir = join(__dirname, "..", "public", "icons");
mkdirSync(iconsDir, { recursive: true });

writeFileSync(join(iconsDir, "icon-192.png"), createSolidPNG(192, 192));
writeFileSync(join(iconsDir, "icon-512.png"), createSolidPNG(512, 512));
writeFileSync(join(iconsDir, "icon-maskable-512.png"), createSolidPNG(512, 512));

console.log(`Icons written to ${iconsDir}`);