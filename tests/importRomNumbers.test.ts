/**
 * El importador de números (tools/import-rom-numbers.mjs) con un dungeon.bin
 * sintético que imita el formato real (pack + WTE en SIR0): no hay ROM en el
 * proyecto, así que se comprueba el formato, no los gráficos del juego.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';

/** SIR0 con una cabecera WTE en 0x10, la imagen en 0x30 y la paleta detrás. */
function wte(image: Buffer, palette: number[][], dim = 0, type = 0): Buffer {
  const h = 0x10, img = 0x30, pal = img + image.length;
  const b = Buffer.alloc(pal + palette.length * 4);
  b.write('SIR0', 0, 'latin1');
  b.writeUInt32LE(h, 4);
  b.write('WTE\0', h, 'latin1');
  b.writeUInt32LE(img, h + 4);
  b.writeUInt32LE(image.length, h + 8);
  b[h + 0x0c] = dim;
  b[h + 0x0d] = type;
  b.writeUInt32LE(pal, h + 0x18);
  b.writeUInt32LE(palette.length, h + 0x1c);
  image.copy(b, img);
  palette.forEach((c, k) => b.set([...c, 0], pal + k * 4));
  return b;
}

function pack(entries: Record<number, Buffer>, count: number): Buffer {
  const head = 8 + count * 8;
  const body = Object.values(entries).reduce((n, e) => n + e.length, 0);
  const b = Buffer.alloc(head + body);
  b.writeUInt32LE(count, 4);
  let o = head;
  for (const [i, e] of Object.entries(entries)) {
    b.writeUInt32LE(o, 8 + +i * 8);
    b.writeUInt32LE(e.length, 12 + +i * 8);
    e.copy(b, o);
    o += e.length;
  }
  return b;
}

describe('importador de los números de la ROM', () => {
  it('saca los glifos de la textura inglesa (MISS) con las filas de paleta de daño y curación', () => {
    // Textura 128×16 a 4 bpp: «1» con contorno (índice 1) e interior (15) en x = 9–11; la palabra de fallo en x = 97–120.
    const image = Buffer.alloc((128 * 16) / 2);
    const set = (x: number, y: number, v: number) => (image[(y * 128 + x) >> 1] |= x & 1 ? v << 4 : v);
    for (let y = 0; y < 8; y++) for (let x = 9; x <= 11; x++) set(x, y, x === 10 ? 15 : 1);
    for (let x = 0; x < 128; x++) if (x < 80 && x % 8 === 2 && x !== 10) set(x, 3, 8); // resto de dígitos y signos
    set(81, 3, 8);
    set(90, 3, 8);
    for (let x = 97; x <= 120; x++) set(x, 4, 10);
    const palette = [...Array(256).keys()].map((k) => [k, 255 - k, k % 16]);
    const bin = pack({ 1007: wte(image, [], 4 | (1 << 3), 3), 1024: wte(Buffer.alloc(0), palette) }, 1036);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'romnumbers-'));
    fs.writeFileSync(path.join(tmp, 'dungeon.bin'), bin);
    const png = path.join(tmp, 'n.png'), ts = path.join(tmp, 'n.ts');
    execFileSync('node', ['tools/import-rom-numbers.mjs', path.join(tmp, 'dungeon.bin'), '--png', png, '--ts', ts]);

    const src = fs.readFileSync(ts, 'utf8');
    const data = JSON.parse(src.slice(src.indexOf('= {') + 2, src.lastIndexOf(';')));
    expect(data.glyphs['1']).toEqual({ x: 9, w: 3 });
    expect(data.miss).toEqual({ x: 97, w: 24 });
    expect(Object.keys(data.glyphs).join('')).toBe('0123456789+-');

    // Fila 0 = paleta 3 (daño), fila 1 = paleta 10 (curación); el índice 0 es transparente.
    const out = PNG.sync.read(fs.readFileSync(png));
    expect([out.width, out.height]).toEqual([128, 16]);
    const at = (x: number, y: number) => [...out.data.subarray((y * 128 + x) * 4, (y * 128 + x) * 4 + 4)];
    expect(at(10, 0)).toEqual([...palette[3 * 16 + 15], 255]);
    expect(at(9, 0)).toEqual([...palette[3 * 16 + 1], 255]);
    expect(at(10, 8)).toEqual([...palette[10 * 16 + 15], 255]);
    expect(at(12, 0)[3]).toBe(0);
  });

  it('rechaza un archivo que no es la textura esperada', () => {
    const bin = pack({ 1007: wte(Buffer.alloc(16), [], 0, 3), 1024: wte(Buffer.alloc(0), [[0, 0, 0]]) }, 1036);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'romnumbers-'));
    fs.writeFileSync(path.join(tmp, 'dungeon.bin'), bin);
    expect(() =>
      execFileSync('node', ['tools/import-rom-numbers.mjs', path.join(tmp, 'dungeon.bin'), '--png', path.join(tmp, 'n.png'), '--ts', path.join(tmp, 'n.ts')], { stdio: 'pipe' }),
    ).toThrow();
  });
});
