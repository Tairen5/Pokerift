/**
 * El importador de pmd-scraper (tools/import-pmd-scraper.mjs) con una salida
 * sintética que imita el formato real (asset_index.json + EFFECT/*.png): no hay
 * ROM en el proyecto, así que se comprueba el formato, no los datos del juego.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';

const sheet = (w: number, h: number) => PNG.sync.write(Object.assign(new PNG({ width: w, height: h }), {}));

describe('importador de pmd-scraper', () => {
  it('convierte efectos por capa, direcciones y tiempos al formato del juego', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pmdscraper-'));
    fs.mkdirSync(path.join(tmp, 'EFFECT'));
    // Impactrueno (188): carga 10 + principal 20 (direccional, 2 fotogramas de 8×16, tiempos distintos).
    fs.writeFileSync(path.join(tmp, 'EFFECT', '10.png'), sheet(3 * 4, 4));
    for (let d = 0; d < 8; d++) fs.writeFileSync(path.join(tmp, 'EFFECT', `20_dir${d}.png`), sheet(2 * 8, 16));
    fs.writeFileSync(
      path.join(tmp, 'asset_index.json'),
      JSON.stringify({
        moves: { '188': { effects: [{ id: '10', layer: 'Charge', trigger: 'OnExecute' }, { id: '20', layer: 'Primary', trigger: 'OnExecute' }, { id: '30', layer: 'Projectile', trigger: 'OnExecute' }] } },
        effects: {
          '10': { type: 'Sprite', sprite_sheet: 'res://effect_sprites/10.png', frame_width: 4, frame_height: 4, animations: { play: { loop: false, frame_count: 3, duration: 0.05 } }, is_directional: false, direction_count: 1 },
          '20': { type: 'Sprite', sprite_sheet: 'res://effect_sprites/20', frame_width: 8, frame_height: 16, animations: { play: { loop: false, frames: [[0.1, 0, 0], [0.25, 0, 0]] } }, is_directional: true, direction_count: 8 },
          '30': { type: 'Screen', effect_name: 'x' },
        },
      }),
    );
    const assets = path.join(tmp, 'out'), ts = path.join(tmp, 'rom.ts');
    const log = execFileSync('node', ['tools/import-pmd-scraper.mjs', tmp, '--assets', assets, '--ts', ts], { encoding: 'utf8' });
    expect(log).toContain('thunderShock (move_id 188): charge=10, primary=20, screen=30 (Screen sin hoja: no importado)');
    const gen = fs.readFileSync(ts, 'utf8');
    const data = JSON.parse(gen.slice(gen.indexOf('= {') + 2).replace(/;\s*$/, ''));
    expect(data.moves['188']).toEqual({ charge: 'eos-10', primary: 'eos-20' });
    expect(data.effects['eos-10']).toMatchObject({ frames: 3, dirs: 1, durations: [50, 50, 50] });
    expect(data.effects['eos-20']).toMatchObject({ frameWidth: 8, frameHeight: 16, frames: 2, dirs: 8, durations: [100, 250] });
    // Fotogramas en rejilla y en orden (dirección d: d·n … d·n+n−1); aquí caben los 16 en una fila.
    const png = PNG.sync.read(fs.readFileSync(path.join(assets, '20.png')));
    expect([png.width, png.height]).toEqual([8 * 16, 16]);
  });

  it('con DATA/move_data.json genera los datos reales de los movimientos', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pmdscraper-'));
    fs.mkdirSync(path.join(tmp, 'DATA'));
    fs.writeFileSync(path.join(tmp, 'asset_index.json'), JSON.stringify({ moves: {}, effects: {} }));
    const base = { category: 'Physical', strikes: 1, crit_chance: 8 };
    fs.writeFileSync(
      path.join(tmp, 'DATA', 'move_data.json'),
      JSON.stringify({
        '154': { ...base, move_id: 154, name: 'Tackle', base_power: 6, move_type: 'Normal', target: 'Enemies', range: 'Front (1 tile)', pp: 30, accuracy1: 100, accuracy2: 95 },
        '251': { ...base, move_id: 251, name: 'Razor Leaf', base_power: 2, move_type: 'Grass', target: 'All (including user)', range: 'Front_10 (10 tiles)', pp: 12, accuracy1: 95, accuracy2: 84, crit_chance: 30 },
        '168': { ...base, move_id: 168, name: 'Barrage', base_power: 1, move_type: 'Normal', target: 'Enemies', range: 'Front (cuts corners)', pp: 12, accuracy1: 80, accuracy2: 55, strikes: 0 },
      }),
    );
    const moves = path.join(tmp, 'moves.ts');
    execFileSync('node', ['tools/import-pmd-scraper.mjs', tmp, '--assets', path.join(tmp, 'out'), '--ts', path.join(tmp, 'rom.ts'), '--moves-ts', moves], { encoding: 'utf8' });
    const gen = fs.readFileSync(moves, 'utf8');
    const data = JSON.parse(gen.slice(gen.indexOf('= {') + 2).replace(/;\s*$/, ''));
    expect(data.tackle).toEqual({ eosMoveId: 154, power: 6, type: 'normal', category: 'physical', pp: 30, accuracy: 100, accuracy2: 95, critChance: 8, hits: 1, targets: 'enemies', range: { kind: 'front' } });
    expect(data.razorLeaf).toMatchObject({ targets: 'all', range: { kind: 'line', distance: 10 }, critChance: 30 });
    // 0 golpes (número variable): no se fija, se queda el de moves.ts.
    expect(data.barrage.hits).toBeUndefined();
    expect(data.barrage.range).toEqual({ kind: 'frontCutsCorners' });
  });
});
