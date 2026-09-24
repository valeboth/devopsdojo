import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Generates the PWA icons under `static/icons/` (§13). Placeholders: a terminal
 * prompt (`>_`) in the accent colour on the app background, matching
 * --color-bg / --color-accent.
 *
 * Kept as a script rather than committing binaries built by hand, so that
 * replacing the real artwork later is a one-line change and the icons always
 * match the theme tokens. Re-run with `node scripts/gen-icons.ts`.
 */

const BG = [0x0b, 0x0f, 0x14];
const FG = [0x4c, 0xc2, 0xff];

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Distance from a point to a line segment, used to draw strokes with caps. */
function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * `safeRatio` is the fraction of the canvas the artwork stays inside. Maskable
 * icons are cropped to a circle by Android, so they need a wider quiet zone.
 */
function png(size: number, safeRatio: number): Buffer {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const box = size * safeRatio;
  const left = (size - box) / 2;
  const top = (size - box) / 2;
  const stroke = box * 0.1;

  // A `>` chevron and an underscore cursor, laid out in the safe box.
  const chevronTop: [number, number] = [left + box * 0.12, top + box * 0.14];
  const chevronTip: [number, number] = [left + box * 0.46, top + box * 0.45];
  const chevronBottom: [number, number] = [left + box * 0.12, top + box * 0.76];
  const cursorLeft: [number, number] = [left + box * 0.58, top + box * 0.78];
  const cursorRight: [number, number] = [left + box * 0.94, top + box * 0.78];

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0; // PNG filter type 0 (none)
    for (let x = 0; x < size; x += 1) {
      const nearest = Math.min(
        distanceToSegment(x, y, ...chevronTop, ...chevronTip),
        distanceToSegment(x, y, ...chevronTip, ...chevronBottom),
        distanceToSegment(x, y, ...cursorLeft, ...cursorRight),
      );
      const color = nearest <= stroke / 2 ? FG : BG;
      const offset = rowStart + 1 + x * 3;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  // 10..12 stay 0: deflate, adaptive filtering, no interlace.

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ]);
}

const OUT = join(process.cwd(), 'static', 'icons');

await mkdir(OUT, { recursive: true });

const icons: Array<[name: string, size: number, safeRatio: number]> = [
  ['icon-192.png', 192, 0.78],
  ['icon-512.png', 512, 0.78],
  // ~22% padding on every side so the circular mask never clips the glyph.
  ['maskable-512.png', 512, 0.56],
];

for (const [name, size, safeRatio] of icons) {
  const file = join(OUT, name);
  await writeFile(file, png(size, safeRatio));
  process.stdout.write(`static/icons/${name} (${size}x${size})\n`);
}
